import { execSync, spawn } from 'child_process'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'

/**
 * Claude CLI wrapper for using Claude Max subscription
 *
 * This module provides a way to call Claude AI using the `claude -p` CLI command,
 * which leverages your Claude Max subscription instead of paying per API call.
 *
 * Requirements:
 * - Claude Code CLI installed (`npm install -g @anthropic-ai/claude-code`)
 * - Logged in with Claude Max subscription (`claude /login`)
 * - No ANTHROPIC_API_KEY set (otherwise it will use API and charge you)
 */

// Enable debug logging via environment variable
const DEBUG = process.env.CLAUDE_DEBUG === 'true' || process.env.NODE_ENV === 'development'

// Directory to save prompts for debugging
const PROMPTS_DIR = join(process.cwd(), '.claude-prompts')

function log(message: string, data?: unknown) {
  if (DEBUG) {
    const timestamp = new Date().toISOString()
    console.log(`[Claude CLI ${timestamp}] ${message}`)
    if (data !== undefined) {
      console.log(JSON.stringify(data, null, 2))
    }
  }
}

function logError(message: string, error?: unknown) {
  const timestamp = new Date().toISOString()
  console.error(`[Claude CLI ERROR ${timestamp}] ${message}`)
  if (error !== undefined) {
    console.error(error)
  }
}

/**
 * Save prompts to a debug folder for inspection
 * Creates: .claude-prompts/YYYY-MM-DD_HH-MM-SS/
 *   - system-prompt.md
 *   - user-prompt.md
 *   - combined-prompt.md
 *   - metadata.json
 */
function savePromptForDebug(
  userPrompt: string,
  systemPrompt?: string,
  metadata?: Record<string, unknown>
): string {
  try {
    // Create prompts directory if it doesn't exist
    if (!existsSync(PROMPTS_DIR)) {
      mkdirSync(PROMPTS_DIR, { recursive: true })
    }

    // Create timestamped folder for this request
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const requestDir = join(PROMPTS_DIR, timestamp)
    mkdirSync(requestDir, { recursive: true })

    // Save system prompt
    if (systemPrompt) {
      writeFileSync(
        join(requestDir, 'system-prompt.md'),
        `# System Prompt\n\n${systemPrompt}`,
        'utf-8'
      )
    }

    // Save user prompt
    writeFileSync(
      join(requestDir, 'user-prompt.md'),
      `# User Prompt\n\n${userPrompt}`,
      'utf-8'
    )

    // Save combined prompt (what actually gets sent)
    const combined = systemPrompt
      ? `# Combined Prompt\n\n## System\n${systemPrompt}\n\n## User\n${userPrompt}`
      : `# Prompt\n\n${userPrompt}`
    writeFileSync(join(requestDir, 'combined-prompt.md'), combined, 'utf-8')

    // Save metadata
    writeFileSync(
      join(requestDir, 'metadata.json'),
      JSON.stringify(
        {
          timestamp: new Date().toISOString(),
          userPromptLength: userPrompt.length,
          systemPromptLength: systemPrompt?.length || 0,
          ...metadata,
        },
        null,
        2
      ),
      'utf-8'
    )

    log(`Saved prompts to ${requestDir}`)
    return requestDir
  } catch (error) {
    logError('Failed to save prompts for debug', error)
    return ''
  }
}

/**
 * Save response to the debug folder
 */
function saveResponseForDebug(requestDir: string, response: unknown, error?: Error) {
  if (!requestDir) return

  try {
    if (error) {
      writeFileSync(
        join(requestDir, 'error.json'),
        JSON.stringify(
          {
            timestamp: new Date().toISOString(),
            error: error.message,
            stack: error.stack,
          },
          null,
          2
        ),
        'utf-8'
      )
    } else {
      writeFileSync(
        join(requestDir, 'response.json'),
        JSON.stringify(response, null, 2),
        'utf-8'
      )
    }
  } catch (e) {
    logError('Failed to save response for debug', e)
  }
}

/**
 * Append streaming message to debug log
 */
function appendStreamingMessage(requestDir: string, message: string) {
  if (!requestDir) return

  try {
    const logFile = join(requestDir, 'streaming-log.jsonl')
    const timestamp = new Date().toISOString()
    const entry = { timestamp, message }
    writeFileSync(logFile, JSON.stringify(entry) + '\n', { flag: 'a', encoding: 'utf-8' })
  } catch (e) {
    // Silently fail for streaming log - don't break the main flow
  }
}

/**
 * Parse stream-json output from Claude CLI
 * Returns the final result message
 */
function parseStreamJsonOutput(stdout: string): ClaudeResponse {
  const lines = stdout.trim().split('\n').filter(Boolean)
  const messages: Array<{ type: string; [key: string]: unknown }> = []

  for (const line of lines) {
    try {
      const parsed = JSON.parse(line)
      messages.push(parsed)
    } catch {
      // Skip non-JSON lines
    }
  }

  // Find the result message (last message with type 'result' or the final assistant message)
  const resultMsg = messages.find(m => m.type === 'result')
  if (resultMsg) {
    return {
      result: typeof resultMsg.result === 'string' ? resultMsg.result : JSON.stringify(resultMsg.result),
      session_id: resultMsg.session_id as string | undefined,
      cost_usd: resultMsg.cost_usd as number | undefined,
      duration_ms: resultMsg.duration_ms as number | undefined,
      is_error: resultMsg.is_error as boolean | undefined,
    }
  }

  // Fallback: find the last assistant message
  const assistantMessages = messages.filter(m => m.type === 'assistant')
  if (assistantMessages.length > 0) {
    const last = assistantMessages[assistantMessages.length - 1]
    return {
      result: typeof last.message === 'string' ? last.message : JSON.stringify(last.message),
      is_error: false,
    }
  }

  // Last resort: try to parse the entire output as a single JSON
  try {
    return JSON.parse(stdout) as ClaudeResponse
  } catch {
    return {
      result: stdout,
      is_error: false,
    }
  }
}

export interface ClaudeResponse {
  result: string
  session_id?: string
  cost_usd?: number
  duration_ms?: number
  duration_api_ms?: number
  is_error?: boolean
  num_turns?: number
  total_cost_usd?: number
}

export interface ClaudeOptions {
  /**
   * Maximum number of agentic turns (default: 1 for simple prompts)
   */
  maxTurns?: number
  /**
   * Model to use (defaults to Claude's best available)
   */
  model?: string
  /**
   * System prompt to set context
   */
  systemPrompt?: string
  /**
   * Timeout in milliseconds (default: 120000 = 2 minutes)
   */
  timeout?: number
}

/**
 * Check if Claude CLI is available and logged in
 */
export function isClaudeCliAvailable(): boolean {
  try {
    // Try to run claude --version to check if it's installed
    const version = execSync('claude --version', {
      encoding: 'utf-8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim()
    log(`Claude CLI available: ${version}`)
    return true
  } catch (error) {
    logError('Claude CLI not available', error)
    return false
  }
}

/**
 * Call Claude using the CLI with your Max subscription
 *
 * Uses stdin to pass the prompt (avoiding command-line length limits)
 *
 * @param prompt - The prompt to send to Claude
 * @param options - Optional configuration
 * @returns The response from Claude
 * @throws Error if Claude CLI is not available or the call fails
 */
export async function callClaude(
  prompt: string,
  options: ClaudeOptions = {}
): Promise<ClaudeResponse> {
  const {
    maxTurns = 1,
    model,
    systemPrompt,
    timeout = 180000, // 3 minutes default (AI can take a while)
  } = options

  const startTime = Date.now()

  // Save prompts for debugging
  const debugDir = savePromptForDebug(prompt, systemPrompt, {
    maxTurns,
    model: model || 'default',
    timeout,
  })

  // Build the command arguments - use stdin for prompt to avoid arg length limits
  const args: string[] = [
    '-p', '-',  // Read prompt from stdin
    '--output-format', 'stream-json',  // Get streaming output with thinking/actions
    '--max-turns', maxTurns.toString(),
    '--verbose',  // Include detailed thinking and actions
  ]

  if (model) {
    args.push('--model', model)
  }

  if (systemPrompt) {
    args.push('--system-prompt', systemPrompt)
  }

  log(`Starting Claude CLI call`, {
    promptLength: prompt.length,
    systemPromptLength: systemPrompt?.length || 0,
    maxTurns,
    model: model || 'default',
    timeout,
    debugDir,
    args: args.filter(a => a !== '-' && !a.includes('\n')).join(' '),
  })

  console.log(`[Claude CLI] Prompts saved to: ${debugDir}`)

  return new Promise((resolve, reject) => {
    let timeoutId: NodeJS.Timeout | null = null
    let isResolved = false

    const proc = spawn('claude', args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env },
    })

    let stdout = ''
    let stderr = ''

    // Set up timeout
    timeoutId = setTimeout(() => {
      if (!isResolved) {
        isResolved = true
        const elapsed = Date.now() - startTime
        const error = new Error(`Claude CLI timeout after ${elapsed}ms. Stderr: ${stderr}`)
        logError(`Claude CLI timeout after ${elapsed}ms`, { stdout: stdout.slice(0, 500), stderr })
        saveResponseForDebug(debugDir, { stdout, stderr, elapsed, timeout: true }, error)
        proc.kill('SIGTERM')
        reject(error)
      }
    }, timeout)

    proc.stdout.on('data', (data: Buffer) => {
      const chunk = data.toString()
      stdout += chunk
      log(`stdout chunk (${chunk.length} chars)`)

      // Save streaming messages for debugging
      const lines = chunk.split('\n').filter(Boolean)
      for (const line of lines) {
        appendStreamingMessage(debugDir, line)
        // Try to parse and log important events
        try {
          const msg = JSON.parse(line)
          if (msg.type) {
            console.log(`[Claude CLI] ${msg.type}: ${msg.message?.slice?.(0, 100) || JSON.stringify(msg).slice(0, 100)}...`)
          }
        } catch {
          // Not JSON, skip
        }
      }
    })

    proc.stderr.on('data', (data: Buffer) => {
      const chunk = data.toString()
      stderr += chunk
      // Always log stderr for debugging
      console.log(`[Claude CLI stderr] ${chunk}`)
    })

    proc.on('close', (code, signal) => {
      if (timeoutId) clearTimeout(timeoutId)
      if (isResolved) return
      isResolved = true

      const elapsed = Date.now() - startTime
      log(`Claude CLI exited`, { code, signal, elapsed, stdoutLength: stdout.length, stderrLength: stderr.length })

      if (code !== 0 && code !== null) {
        const error = new Error(`Claude CLI exited with code ${code}: ${stderr || stdout.slice(0, 500)}`)
        logError(`Claude CLI failed with code ${code}`, { stderr, stdout: stdout.slice(0, 1000) })
        saveResponseForDebug(debugDir, { stdout, stderr, code, signal, elapsed }, error)
        reject(error)
        return
      }

      if (signal) {
        const error = new Error(`Claude CLI killed by signal ${signal}: ${stderr}`)
        logError(`Claude CLI killed by signal ${signal}`, { stderr })
        saveResponseForDebug(debugDir, { stdout, stderr, code, signal, elapsed }, error)
        reject(error)
        return
      }

      // Parse stream-json output (handles both streaming and single JSON response)
      const response = parseStreamJsonOutput(stdout)
      log(`Claude CLI response parsed`, {
        resultLength: response.result?.length,
        cost_usd: response.cost_usd,
        duration_ms: response.duration_ms,
        is_error: response.is_error,
      })

      // Save response and raw stdout for debugging
      saveResponseForDebug(debugDir, { ...response, elapsed, stderr, rawStdout: stdout })

      if (response.is_error) {
        const error = new Error(`Claude returned an error: ${response.result}`)
        logError(`Claude returned an error`, { result: response.result })
        reject(error)
        return
      }
      resolve(response)
    })

    proc.on('error', (error) => {
      if (timeoutId) clearTimeout(timeoutId)
      if (isResolved) return
      isResolved = true
      logError(`Failed to spawn Claude CLI`, error)
      saveResponseForDebug(debugDir, { stderr, stdout }, error)
      reject(new Error(`Failed to spawn Claude CLI: ${error.message}`))
    })

    // Write prompt to stdin and close it
    log(`Writing prompt to stdin (${prompt.length} chars)`)
    proc.stdin.write(prompt)
    proc.stdin.end()
    log(`Stdin closed, waiting for response...`)
  })
}

/**
 * Call Claude for structured JSON output
 *
 * This function is specifically designed for getting JSON responses from Claude.
 * It includes explicit instructions for JSON-only output in the system prompt.
 *
 * @param systemPrompt - The system prompt setting context and instructions
 * @param userPrompt - The user message with the data to analyze
 * @param options - Optional configuration
 * @returns Parsed JSON response
 * @throws Error if Claude CLI is not available, call fails, or JSON parsing fails
 */
export async function callClaudeForJson<T>(
  systemPrompt: string,
  userPrompt: string,
  options: ClaudeOptions = {}
): Promise<T> {
  log(`callClaudeForJson starting`, {
    systemPromptLength: systemPrompt.length,
    userPromptLength: userPrompt.length,
  })

  // Enhance system prompt to ensure JSON output
  const enhancedSystemPrompt = `${systemPrompt}

CRITICAL: Your response must be ONLY a valid JSON object. No markdown code blocks, no explanatory text before or after. Just pure JSON.`

  const response = await callClaude(userPrompt, {
    ...options,
    systemPrompt: enhancedSystemPrompt,
    maxTurns: 1, // Force single turn for JSON responses
  })

  // Try to parse the result as JSON
  let result = response.result.trim()

  log(`Raw response length: ${result.length} chars`)

  // Remove markdown code blocks if present
  if (result.startsWith('```json')) {
    result = result.slice(7)
    log(`Stripped ```json prefix`)
  } else if (result.startsWith('```')) {
    result = result.slice(3)
    log(`Stripped ``` prefix`)
  }
  if (result.endsWith('```')) {
    result = result.slice(0, -3)
    log(`Stripped ``` suffix`)
  }
  result = result.trim()

  try {
    const parsed = JSON.parse(result) as T
    log(`JSON parsed successfully`)
    return parsed
  } catch (parseError) {
    logError(`Failed to parse JSON response`, {
      error: parseError instanceof Error ? parseError.message : 'Unknown',
      responsePreview: result.slice(0, 500),
    })
    throw new Error(`Failed to parse Claude response as JSON: ${parseError instanceof Error ? parseError.message : 'Unknown error'}\n\nResponse was:\n${response.result.slice(0, 1000)}`)
  }
}

/**
 * Get information about Claude CLI configuration
 */
export function getClaudeCliInfo(): { available: boolean; version?: string; error?: string } {
  try {
    const version = execSync('claude --version', {
      encoding: 'utf-8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe']
    }).trim()
    return { available: true, version }
  } catch (error) {
    return {
      available: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}
