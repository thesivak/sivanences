import { execSync, spawn } from 'child_process'
import type { SpawnOptionsWithoutStdio } from 'child_process'

export interface ClaudeCliOptions {
  /** The prompt to send to Claude Code */
  prompt: string
  /** Optional system prompt to append */
  systemPrompt?: string
  /** Output format: 'json' for structured output, 'text' for plain text */
  outputFormat?: 'json' | 'text' | 'stream-json'
  /** Working directory for Claude Code execution */
  cwd?: string
  /** Timeout in milliseconds (default: 120000 = 2 minutes) */
  timeout?: number
  /** Maximum tokens for response */
  maxTokens?: number
}

export interface ClaudeCliResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
  rawOutput?: string
}

/**
 * Check if Claude Code CLI is available
 */
export function isClaudeCliAvailable(): boolean {
  try {
    execSync('claude --version', { stdio: 'pipe', timeout: 5000 })
    return true
  } catch {
    return false
  }
}

/**
 * Execute Claude Code CLI in headless mode (-p flag)
 * This runs Claude Code as a subprocess and returns the result
 */
export async function executeClaudeCli<T = unknown>(
  options: ClaudeCliOptions
): Promise<ClaudeCliResult<T>> {
  const {
    prompt,
    systemPrompt,
    outputFormat = 'json',
    cwd = process.cwd(),
    timeout = 120000,
  } = options

  // Build command arguments
  const args: string[] = ['-p', prompt]

  if (outputFormat === 'json' || outputFormat === 'stream-json') {
    args.push('--output-format', outputFormat)
  }

  if (systemPrompt) {
    args.push('--append-system-prompt', systemPrompt)
  }

  return new Promise((resolve) => {
    const spawnOptions: SpawnOptionsWithoutStdio = {
      cwd,
      timeout,
      env: { ...process.env },
    }

    const child = spawn('claude', args, spawnOptions)

    let stdout = ''
    let stderr = ''

    child.stdout.on('data', (data: Buffer) => {
      stdout += data.toString()
    })

    child.stderr.on('data', (data: Buffer) => {
      stderr += data.toString()
    })

    child.on('error', (error) => {
      resolve({
        success: false,
        error: `Failed to execute Claude CLI: ${error.message}`,
        rawOutput: stderr || stdout,
      })
    })

    child.on('close', (code) => {
      if (code !== 0) {
        resolve({
          success: false,
          error: `Claude CLI exited with code ${code}: ${stderr || 'Unknown error'}`,
          rawOutput: stdout,
        })
        return
      }

      // Parse JSON output if requested
      if (outputFormat === 'json') {
        try {
          // Claude CLI with --output-format json returns JSON messages
          // We need to extract the actual response content
          const parsed = parseClaudeJsonOutput<T>(stdout)
          resolve({
            success: true,
            data: parsed,
            rawOutput: stdout,
          })
        } catch (parseError) {
          resolve({
            success: false,
            error: `Failed to parse Claude CLI output: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
            rawOutput: stdout,
          })
        }
      } else {
        resolve({
          success: true,
          data: stdout as unknown as T,
          rawOutput: stdout,
        })
      }
    })
  })
}

/**
 * Parse Claude CLI JSON output format
 * The CLI outputs newline-delimited JSON messages
 */
function parseClaudeJsonOutput<T>(output: string): T {
  const lines = output.trim().split('\n')
  let result: string | null = null

  for (const line of lines) {
    if (!line.trim()) continue

    try {
      const message = JSON.parse(line)

      // Look for assistant message with text content
      if (message.type === 'assistant' && message.message?.content) {
        for (const block of message.message.content) {
          if (block.type === 'text' && block.text) {
            result = block.text
          }
        }
      }

      // Also check for result message type
      if (message.type === 'result' && message.result) {
        result = message.result
      }
    } catch {
      // Skip non-JSON lines
      continue
    }
  }

  if (!result) {
    throw new Error('No text content found in Claude CLI output')
  }

  // Try to parse the result as JSON (for structured outputs)
  try {
    return JSON.parse(result) as T
  } catch {
    // If not valid JSON, return as-is (might be plain text in JSON wrapper)
    return result as unknown as T
  }
}

/**
 * Execute Claude Code CLI synchronously (blocking)
 * Use for simpler use cases where async is not needed
 */
export function executeClaudeCliSync<T = unknown>(
  options: ClaudeCliOptions
): ClaudeCliResult<T> {
  const {
    prompt,
    systemPrompt,
    outputFormat = 'json',
    cwd = process.cwd(),
    timeout = 120000,
  } = options

  // Build command
  let command = `claude -p "${prompt.replace(/"/g, '\\"')}"`

  if (outputFormat === 'json' || outputFormat === 'stream-json') {
    command += ` --output-format ${outputFormat}`
  }

  if (systemPrompt) {
    command += ` --append-system-prompt "${systemPrompt.replace(/"/g, '\\"')}"`
  }

  try {
    const stdout = execSync(command, {
      cwd,
      timeout,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env },
    })

    if (outputFormat === 'json') {
      try {
        const parsed = parseClaudeJsonOutput<T>(stdout)
        return {
          success: true,
          data: parsed,
          rawOutput: stdout,
        }
      } catch (parseError) {
        return {
          success: false,
          error: `Failed to parse Claude CLI output: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`,
          rawOutput: stdout,
        }
      }
    }

    return {
      success: true,
      data: stdout as unknown as T,
      rawOutput: stdout,
    }
  } catch (error) {
    const execError = error as { message?: string; stdout?: string; stderr?: string }
    return {
      success: false,
      error: execError.message || 'Unknown error executing Claude CLI',
      rawOutput: execError.stdout || execError.stderr || '',
    }
  }
}
