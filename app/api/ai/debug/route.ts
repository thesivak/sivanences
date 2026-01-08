import { successResponse } from '@/lib/api'
import { getClaudeCliInfo, isClaudeCliAvailable } from '@/lib/claude'
import { execSync } from 'child_process'

/**
 * Debug endpoint for Claude CLI integration
 * GET /api/ai/debug
 *
 * Returns information about Claude CLI availability and configuration
 */
export async function GET() {
  const cliInfo = getClaudeCliInfo()
  const isAvailable = isClaudeCliAvailable()

  // Check for ANTHROPIC_API_KEY (which would override subscription)
  const hasApiKey = !!(process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY)

  // Try to get more info about claude
  let claudeWhich: string | null = null
  let claudeHelp: string | null = null

  try {
    claudeWhich = execSync('which claude', { encoding: 'utf-8', timeout: 5000 }).trim()
  } catch {
    claudeWhich = null
  }

  // Test a simple prompt if CLI is available
  let testResult: { success: boolean; error?: string; duration?: number } | null = null

  if (isAvailable) {
    const start = Date.now()
    try {
      const result = execSync('echo "test" | claude -p - --output-format json --max-turns 1', {
        encoding: 'utf-8',
        timeout: 30000,
        stdio: ['pipe', 'pipe', 'pipe'],
      })
      testResult = {
        success: true,
        duration: Date.now() - start,
      }
    } catch (error) {
      testResult = {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: Date.now() - start,
      }
    }
  }

  return successResponse({
    timestamp: new Date().toISOString(),
    claude: {
      available: isAvailable,
      version: cliInfo.version || null,
      error: cliInfo.error || null,
      path: claudeWhich,
    },
    environment: {
      hasApiKey,
      nodeEnv: process.env.NODE_ENV,
      claudeDebug: process.env.CLAUDE_DEBUG,
    },
    testResult,
    recommendations: [
      !isAvailable && 'Install Claude CLI: npm install -g @anthropic-ai/claude-code',
      !isAvailable && 'Login to Claude: claude /login',
      hasApiKey && 'Warning: ANTHROPIC_API_KEY is set - this will use API (not Max subscription)',
    ].filter(Boolean),
  })
}
