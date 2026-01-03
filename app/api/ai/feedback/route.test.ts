import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST } from './route'
import { mockPrisma } from '@/lib/__mocks__/db'

vi.spyOn(console, 'error').mockImplementation(() => {})

describe('POST /api/ai/feedback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates feedback for overview successfully', async () => {
    const mockFeedback = {
      id: 'fb1',
      insightType: 'overview',
      insightId: null,
      isPositive: true,
      createdAt: new Date(),
    }

    mockPrisma.aIFeedback.create.mockResolvedValue(mockFeedback)

    const request = new Request('http://localhost/api/ai/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        insightType: 'overview',
        isPositive: true,
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.insightType).toBe('overview')
    expect(data.isPositive).toBe(true)
  })

  it('creates feedback for category with insightId', async () => {
    const mockFeedback = {
      id: 'fb2',
      insightType: 'category',
      insightId: 'cat1',
      isPositive: false,
      createdAt: new Date(),
    }

    mockPrisma.aIFeedback.create.mockResolvedValue(mockFeedback)

    const request = new Request('http://localhost/api/ai/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        insightType: 'category',
        insightId: 'cat1',
        isPositive: false,
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.insightType).toBe('category')
    expect(data.insightId).toBe('cat1')
    expect(data.isPositive).toBe(false)
  })

  it('creates feedback for suggestion', async () => {
    const mockFeedback = {
      id: 'fb3',
      insightType: 'suggestion',
      insightId: 'sug1',
      isPositive: true,
      createdAt: new Date(),
    }

    mockPrisma.aIFeedback.create.mockResolvedValue(mockFeedback)

    const request = new Request('http://localhost/api/ai/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        insightType: 'suggestion',
        insightId: 'sug1',
        isPositive: true,
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.insightType).toBe('suggestion')
  })

  it('returns 400 when insightType is missing', async () => {
    const request = new Request('http://localhost/api/ai/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        isPositive: true,
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('Missing required fields')
  })

  it('returns 400 when isPositive is missing', async () => {
    const request = new Request('http://localhost/api/ai/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        insightType: 'overview',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('Missing required fields')
  })

  it('returns 400 for invalid insightType', async () => {
    const request = new Request('http://localhost/api/ai/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        insightType: 'invalid',
        isPositive: true,
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('must be one of')
  })

  it('returns 500 error when database operation fails', async () => {
    mockPrisma.aIFeedback.create.mockRejectedValue(new Error('DB error'))

    const request = new Request('http://localhost/api/ai/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        insightType: 'overview',
        isPositive: true,
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to save feedback')
  })
})

describe('GET /api/ai/feedback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns feedback with aggregated stats', async () => {
    const mockFeedback = [
      { id: 'fb1', insightType: 'overview', insightId: null, isPositive: true, createdAt: new Date() },
      { id: 'fb2', insightType: 'overview', insightId: null, isPositive: true, createdAt: new Date() },
      { id: 'fb3', insightType: 'category', insightId: 'cat1', isPositive: false, createdAt: new Date() },
      { id: 'fb4', insightType: 'suggestion', insightId: 'sug1', isPositive: true, createdAt: new Date() },
    ]

    mockPrisma.aIFeedback.findMany.mockResolvedValue(mockFeedback)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.feedback).toHaveLength(4)
    expect(data.stats.overview.positive).toBe(2)
    expect(data.stats.overview.negative).toBe(0)
    expect(data.stats.category.positive).toBe(0)
    expect(data.stats.category.negative).toBe(1)
    expect(data.stats.suggestion.positive).toBe(1)
    expect(data.stats.suggestion.negative).toBe(0)
  })

  it('returns empty stats when no feedback exists', async () => {
    mockPrisma.aIFeedback.findMany.mockResolvedValue([])

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.feedback).toHaveLength(0)
    expect(data.stats.overview.positive).toBe(0)
    expect(data.stats.overview.negative).toBe(0)
  })

  it('returns 500 error when database query fails', async () => {
    mockPrisma.aIFeedback.findMany.mockRejectedValue(new Error('DB error'))

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to fetch feedback')
  })
})
