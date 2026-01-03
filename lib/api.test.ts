import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  getPeriodFromRequest,
  getStringParam,
  successResponse,
  errorResponse,
  badRequestResponse,
  notFoundResponse,
  validateRequiredFields,
  withErrorHandling,
  apiFetch,
  apiPost,
  apiPatch,
  apiDelete,
} from './api'

// Mock console.error to prevent noise in test output
vi.spyOn(console, 'error').mockImplementation(() => {})

describe('getPeriodFromRequest', () => {
  it('extracts year and month from query params', () => {
    const request = new Request('http://localhost/api/test?year=2025&month=6')
    const result = getPeriodFromRequest(request)

    expect(result.year).toBe(2025)
    expect(result.month).toBe(6)
  })

  it('falls back to current date when params are missing', () => {
    const request = new Request('http://localhost/api/test')
    const result = getPeriodFromRequest(request)
    const now = new Date()

    expect(result.year).toBe(now.getFullYear())
    expect(result.month).toBe(now.getMonth() + 1)
  })

  it('falls back to current year when only month is provided', () => {
    const request = new Request('http://localhost/api/test?month=3')
    const result = getPeriodFromRequest(request)
    const now = new Date()

    expect(result.year).toBe(now.getFullYear())
    expect(result.month).toBe(3)
  })

  it('falls back to current month when only year is provided', () => {
    const request = new Request('http://localhost/api/test?year=2024')
    const result = getPeriodFromRequest(request)
    const now = new Date()

    expect(result.year).toBe(2024)
    expect(result.month).toBe(now.getMonth() + 1)
  })

  it('parses string params as integers', () => {
    const request = new Request('http://localhost/api/test?year=2023&month=12')
    const result = getPeriodFromRequest(request)

    expect(typeof result.year).toBe('number')
    expect(typeof result.month).toBe('number')
  })
})

describe('getStringParam', () => {
  it('returns the parameter value when present', () => {
    const request = new Request('http://localhost/api/test?format=csv')
    const result = getStringParam(request, 'format')

    expect(result).toBe('csv')
  })

  it('returns undefined when parameter is missing and no default', () => {
    const request = new Request('http://localhost/api/test')
    const result = getStringParam(request, 'format')

    expect(result).toBeUndefined()
  })

  it('returns default value when parameter is missing', () => {
    const request = new Request('http://localhost/api/test')
    const result = getStringParam(request, 'format', 'json')

    expect(result).toBe('json')
  })

  it('returns actual value even when default is provided', () => {
    const request = new Request('http://localhost/api/test?format=csv')
    const result = getStringParam(request, 'format', 'json')

    expect(result).toBe('csv')
  })
})

describe('successResponse', () => {
  it('returns JSON response with data and 200 status by default', async () => {
    const data = { items: [1, 2, 3] }
    const response = successResponse(data)

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body).toEqual(data)
  })

  it('allows custom status code', async () => {
    const response = successResponse({ created: true }, 201)

    expect(response.status).toBe(201)
  })

  it('handles null data', async () => {
    const response = successResponse(null)
    const body = await response.json()

    expect(body).toBeNull()
  })

  it('handles array data', async () => {
    const response = successResponse([1, 2, 3])
    const body = await response.json()

    expect(body).toEqual([1, 2, 3])
  })
})

describe('errorResponse', () => {
  it('returns error message with 500 status by default', async () => {
    const response = errorResponse('Something went wrong')

    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.error).toBe('Something went wrong')
  })

  it('allows custom status code', async () => {
    const response = errorResponse('Not authorized', 401)

    expect(response.status).toBe(401)
  })

  it('includes details when provided', async () => {
    const response = errorResponse('Validation failed', 400, {
      fields: ['name', 'email'],
    })

    const body = await response.json()
    expect(body.error).toBe('Validation failed')
    expect(body.details).toEqual({ fields: ['name', 'email'] })
  })
})

describe('badRequestResponse', () => {
  it('returns 400 with default message', async () => {
    const response = badRequestResponse()

    expect(response.status).toBe(400)
    const body = await response.json()
    expect(body.error).toBe('Missing required fields')
  })

  it('uses custom message when provided', async () => {
    const response = badRequestResponse('Invalid input format')

    const body = await response.json()
    expect(body.error).toBe('Invalid input format')
  })
})

describe('notFoundResponse', () => {
  it('returns 404 with default message', async () => {
    const response = notFoundResponse()

    expect(response.status).toBe(404)
    const body = await response.json()
    expect(body.error).toBe('Resource not found')
  })

  it('uses custom message when provided', async () => {
    const response = notFoundResponse('Category not found')

    const body = await response.json()
    expect(body.error).toBe('Category not found')
  })
})

describe('validateRequiredFields', () => {
  it('returns valid: true when all required fields are present', () => {
    const body = { name: 'Test', amount: 100, year: 2025 }
    const result = validateRequiredFields(body, ['name', 'amount'])

    expect(result).toEqual({ valid: true })
  })

  it('returns valid: false with missing fields list when fields are missing', () => {
    const body = { name: 'Test' }
    const result = validateRequiredFields(body, ['name', 'amount', 'year'])

    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.missing).toContain('amount')
      expect(result.missing).toContain('year')
      expect(result.missing).not.toContain('name')
    }
  })

  it('treats null as missing', () => {
    const body = { name: 'Test', amount: null }
    const result = validateRequiredFields(body, ['name', 'amount'])

    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.missing).toContain('amount')
    }
  })

  it('treats undefined as missing', () => {
    const body = { name: 'Test', amount: undefined }
    const result = validateRequiredFields(body, ['name', 'amount'])

    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.missing).toContain('amount')
    }
  })

  it('accepts 0 as a valid value', () => {
    const body = { name: 'Test', amount: 0 }
    const result = validateRequiredFields(body, ['name', 'amount'])

    expect(result).toEqual({ valid: true })
  })

  it('accepts empty string as a valid value', () => {
    const body = { name: '', amount: 100 }
    const result = validateRequiredFields(body, ['name', 'amount'])

    expect(result).toEqual({ valid: true })
  })

  it('handles empty required fields array', () => {
    const body = { name: 'Test' }
    const result = validateRequiredFields(body, [])

    expect(result).toEqual({ valid: true })
  })
})

describe('withErrorHandling', () => {
  it('returns handler result when no error occurs', async () => {
    const handler = async () => successResponse({ ok: true })
    const wrapped = withErrorHandling(handler)

    const response = await wrapped(new Request('http://localhost/api/test'))

    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.ok).toBe(true)
  })

  it('catches errors and returns 500 response', async () => {
    const handler = async () => {
      throw new Error('Database connection failed')
    }
    const wrapped = withErrorHandling(handler)

    const response = await wrapped(new Request('http://localhost/api/test'))

    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.error).toBe('Database connection failed')
  })

  it('uses custom error message for non-Error throws', async () => {
    const handler = async () => {
      throw 'something went wrong'
    }
    const wrapped = withErrorHandling(handler, 'Custom error message')

    const response = await wrapped(new Request('http://localhost/api/test'))

    expect(response.status).toBe(500)
    const body = await response.json()
    expect(body.error).toBe('Custom error message')
  })
})

describe('apiFetch', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('returns data on successful request', async () => {
    const mockData = { items: [1, 2, 3] }
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockData),
    })

    const result = await apiFetch<typeof mockData>('/api/test')

    expect(result.data).toEqual(mockData)
    expect(result.error).toBeNull()
  })

  it('includes Content-Type header', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    })

    await apiFetch('/api/test')

    expect(fetch).toHaveBeenCalledWith('/api/test', {
      headers: { 'Content-Type': 'application/json' },
    })
  })

  it('returns error on non-ok response', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: () => Promise.resolve({ error: 'Not found' }),
    })

    const result = await apiFetch('/api/test')

    expect(result.data).toBeNull()
    expect(result.error).toBe('Not found')
  })

  it('handles error response without JSON body', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: () => Promise.reject(new Error('Invalid JSON')),
    })

    const result = await apiFetch('/api/test')

    expect(result.data).toBeNull()
    expect(result.error).toBe('Request failed with status 500')
  })

  it('handles network errors', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'))

    const result = await apiFetch('/api/test')

    expect(result.data).toBeNull()
    expect(result.error).toBe('Network error')
  })

  it('handles non-Error throws', async () => {
    global.fetch = vi.fn().mockRejectedValue('Unknown error')

    const result = await apiFetch('/api/test')

    expect(result.data).toBeNull()
    expect(result.error).toBe('Unknown error')
  })

  it('passes custom options to fetch', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    })

    await apiFetch('/api/test', {
      headers: { Authorization: 'Bearer token' },
    })

    expect(fetch).toHaveBeenCalledWith('/api/test', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer token',
      },
    })
  })
})

describe('apiPost', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('sends POST request with JSON body', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: '123' }),
    })

    const body = { name: 'Test', amount: 100 }
    const result = await apiPost('/api/items', body)

    expect(fetch).toHaveBeenCalledWith('/api/items', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    })
    expect(result.data).toEqual({ id: '123' })
  })

  it('handles error responses', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ error: 'Invalid data' }),
    })

    const result = await apiPost('/api/items', {})

    expect(result.data).toBeNull()
    expect(result.error).toBe('Invalid data')
  })
})

describe('apiPatch', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('sends PATCH request with JSON body', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ updated: true }),
    })

    const body = { amount: 200 }
    const result = await apiPatch('/api/items/123', body)

    expect(fetch).toHaveBeenCalledWith('/api/items/123', {
      method: 'PATCH',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' },
    })
    expect(result.data).toEqual({ updated: true })
  })
})

describe('apiDelete', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('sends DELETE request', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ deleted: true }),
    })

    const result = await apiDelete('/api/items/123')

    expect(fetch).toHaveBeenCalledWith('/api/items/123', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    })
    expect(result.data).toEqual({ deleted: true })
  })
})
