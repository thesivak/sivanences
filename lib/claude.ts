import { execSync, spawn } from 'child_process'

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
    execSync('claude --version', {
      encoding: 'utf-8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe']
    })
    return true
  } catch {
    return false
  }
}

/**
 * Call Claude using the CLI with your Max subscription
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
    timeout = 120000,
  } = options

  // Build the command arguments
  const args: string[] = [
    '-p', prompt,
    '--output-format', 'json',
    '--max-turns', maxTurns.toString(),
  ]

  if (model) {
    args.push('--model', model)
  }

  if (systemPrompt) {
    args.push('--system-prompt', systemPrompt)
  }

  return new Promise((resolve, reject) => {
    const process = spawn('claude', args, {
      timeout,
      stdio: ['pipe', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''

    process.stdout.on('data', (data: Buffer) => {
      stdout += data.toString()
    })

    process.stderr.on('data', (data: Buffer) => {
      stderr += data.toString()
    })

    process.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Claude CLI exited with code ${code}: ${stderr || stdout}`))
        return
      }

      try {
        const response = JSON.parse(stdout) as ClaudeResponse
        if (response.is_error) {
          reject(new Error(`Claude returned an error: ${response.result}`))
          return
        }
        resolve(response)
      } catch (parseError) {
        // If JSON parsing fails, the response might be plain text
        // This can happen with certain Claude CLI versions
        resolve({
          result: stdout.trim(),
          is_error: false,
        })
      }
    })

    process.on('error', (error) => {
      reject(new Error(`Failed to spawn Claude CLI: ${error.message}`))
    })
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

  // Remove markdown code blocks if present
  if (result.startsWith('```json')) {
    result = result.slice(7)
  } else if (result.startsWith('```')) {
    result = result.slice(3)
  }
  if (result.endsWith('```')) {
    result = result.slice(0, -3)
  }
  result = result.trim()

  try {
    return JSON.parse(result) as T
  } catch (parseError) {
    throw new Error(`Failed to parse Claude response as JSON: ${parseError instanceof Error ? parseError.message : 'Unknown error'}\n\nResponse was:\n${response.result}`)
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
