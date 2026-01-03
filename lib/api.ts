import { NextResponse } from 'next/server'
import type { Period } from './types'
import { prisma } from './db'

// ============================================
// Request Parameter Utilities
// ============================================

/**
 * Extract year and month from request URL, with fallback to current period
 */
export function getPeriodFromRequest(request: Request): Period {
  const { searchParams } = new URL(request.url)
  const now = new Date()

  return {
    year: parseInt(searchParams.get('year') || now.getFullYear().toString()),
    month: parseInt(searchParams.get('month') || (now.getMonth() + 1).toString()),
  }
}

/**
 * Get a string parameter from request, with optional default
 */
export function getStringParam(request: Request, name: string, defaultValue?: string): string | undefined {
  const { searchParams } = new URL(request.url)
  return searchParams.get(name) ?? defaultValue
}

// ============================================
// Response Utilities
// ============================================

/**
 * Create a consistent success response
 */
export function successResponse<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status })
}

/**
 * Create a consistent error response
 */
export function errorResponse(
  message: string,
  status = 500,
  details?: Record<string, unknown>
): NextResponse {
  console.error(`API Error (${status}):`, message, details)

  return NextResponse.json(
    {
      error: message,
      ...(details && { details }),
    },
    { status }
  )
}

/**
 * Create a 400 Bad Request response
 */
export function badRequestResponse(message = 'Missing required fields'): NextResponse {
  return errorResponse(message, 400)
}

/**
 * Create a 404 Not Found response
 */
export function notFoundResponse(message = 'Resource not found'): NextResponse {
  return errorResponse(message, 404)
}

// ============================================
// Error Handler Wrapper
// ============================================

type ApiHandler = (request: Request) => Promise<NextResponse>

/**
 * Wrap an API handler with consistent error handling
 */
export function withErrorHandling(
  handler: ApiHandler,
  errorMessage = 'Internal server error'
): ApiHandler {
  return async (request: Request) => {
    try {
      return await handler(request)
    } catch (error) {
      console.error('API handler error:', error)

      if (error instanceof Error) {
        return errorResponse(error.message, 500)
      }

      return errorResponse(errorMessage, 500)
    }
  }
}

// ============================================
// Validation Utilities
// ============================================

/**
 * Validate that required fields are present in request body
 */
export function validateRequiredFields<T extends Record<string, unknown>>(
  body: T,
  requiredFields: (keyof T)[]
): { valid: true } | { valid: false; missing: string[] } {
  const missing = requiredFields.filter(
    (field) => body[field] === undefined || body[field] === null
  ) as string[]

  if (missing.length > 0) {
    return { valid: false, missing }
  }

  return { valid: true }
}

// ============================================
// Cache Invalidation
// ============================================

/**
 * Invalidate AI insights cache when financial data changes
 * Call this after any mutation to expenses, income, investments, goals, or loans
 */
export async function invalidateInsightsCache(): Promise<void> {
  try {
    await prisma.aIInsightsCache.deleteMany({})
  } catch (error) {
    // Log but don't fail the main operation if cache invalidation fails
    console.error('Failed to invalidate AI insights cache:', error)
  }
}

// ============================================
// Client-Side API Utilities
// ============================================

/**
 * Make a fetch request with consistent error handling
 */
export async function apiFetch<T>(
  url: string,
  options?: RequestInit
): Promise<{ data: T | null; error: string | null }> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      return {
        data: null,
        error: errorData.error || `Request failed with status ${response.status}`,
      }
    }

    const data = await response.json()
    return { data, error: null }
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * POST request helper
 */
export async function apiPost<T, B = unknown>(
  url: string,
  body: B
): Promise<{ data: T | null; error: string | null }> {
  return apiFetch<T>(url, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

/**
 * PATCH request helper
 */
export async function apiPatch<T, B = unknown>(
  url: string,
  body: B
): Promise<{ data: T | null; error: string | null }> {
  return apiFetch<T>(url, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

/**
 * DELETE request helper
 */
export async function apiDelete<T>(
  url: string
): Promise<{ data: T | null; error: string | null }> {
  return apiFetch<T>(url, {
    method: 'DELETE',
  })
}
