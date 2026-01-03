import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST } from './route'
import { mockPrisma } from '@/lib/__mocks__/db'

// Mock console.error to prevent noise
vi.spyOn(console, 'error').mockImplementation(() => {})

describe('GET /api/income', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns sources with income for the specified period', async () => {
    const mockSources = [
      {
        id: 'src1',
        name: 'Mzda',
        order: 1,
        incomes: [{ id: 'inc1', amount: 50000, year: 2025, month: 1, sourceId: 'src1' }],
      },
      {
        id: 'src2',
        name: 'Bonusy',
        order: 2,
        incomes: [],
      },
    ]

    mockPrisma.incomeSource.findMany.mockResolvedValue(mockSources)

    const request = new Request('http://localhost/api/income?year=2025&month=1')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.year).toBe(2025)
    expect(data.month).toBe(1)
    expect(data.sources).toHaveLength(2)
    expect(data.sources[0].income).toEqual(mockSources[0].incomes[0])
    expect(data.sources[1].income).toBeNull()
  })

  it('uses current date when no period is specified', async () => {
    mockPrisma.incomeSource.findMany.mockResolvedValue([])

    const request = new Request('http://localhost/api/income')
    const response = await GET(request)
    const data = await response.json()

    const now = new Date()
    expect(data.year).toBe(now.getFullYear())
    expect(data.month).toBe(now.getMonth() + 1)
  })

  it('returns empty sources array when no sources exist', async () => {
    mockPrisma.incomeSource.findMany.mockResolvedValue([])

    const request = new Request('http://localhost/api/income?year=2025&month=1')
    const response = await GET(request)
    const data = await response.json()

    expect(data.sources).toEqual([])
  })

  it('orders sources by order field', async () => {
    mockPrisma.incomeSource.findMany.mockResolvedValue([])

    const request = new Request('http://localhost/api/income?year=2025&month=1')
    await GET(request)

    expect(mockPrisma.incomeSource.findMany).toHaveBeenCalledWith({
      orderBy: { order: 'asc' },
      include: {
        incomes: {
          where: { year: 2025, month: 1 },
        },
      },
    })
  })

  it('returns 500 error when database query fails', async () => {
    mockPrisma.incomeSource.findMany.mockRejectedValue(new Error('DB error'))

    const request = new Request('http://localhost/api/income?year=2025&month=1')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to fetch income')
  })
})

describe('POST /api/income', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates or updates income successfully', async () => {
    const mockIncome = {
      id: 'inc1',
      sourceId: 'src1',
      year: 2025,
      month: 1,
      amount: 50000,
    }

    mockPrisma.income.upsert.mockResolvedValue(mockIncome)

    const request = new Request('http://localhost/api/income', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceId: 'src1',
        year: 2025,
        month: 1,
        amount: 50000,
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual(mockIncome)
    expect(mockPrisma.income.upsert).toHaveBeenCalledWith({
      where: {
        sourceId_year_month: { sourceId: 'src1', year: 2025, month: 1 },
      },
      update: { amount: 50000 },
      create: { sourceId: 'src1', year: 2025, month: 1, amount: 50000 },
    })
  })

  it('returns 400 when sourceId is missing', async () => {
    const request = new Request('http://localhost/api/income', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        year: 2025,
        month: 1,
        amount: 50000,
      }),
    })

    const response = await POST(request)

    expect(response.status).toBe(400)
  })

  it('returns 400 when year is missing', async () => {
    const request = new Request('http://localhost/api/income', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceId: 'src1',
        month: 1,
        amount: 50000,
      }),
    })

    const response = await POST(request)

    expect(response.status).toBe(400)
  })

  it('returns 400 when month is missing', async () => {
    const request = new Request('http://localhost/api/income', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceId: 'src1',
        year: 2025,
        amount: 50000,
      }),
    })

    const response = await POST(request)

    expect(response.status).toBe(400)
  })

  it('allows amount to be 0', async () => {
    const mockIncome = {
      id: 'inc1',
      sourceId: 'src1',
      year: 2025,
      month: 1,
      amount: 0,
    }

    mockPrisma.income.upsert.mockResolvedValue(mockIncome)

    const request = new Request('http://localhost/api/income', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceId: 'src1',
        year: 2025,
        month: 1,
        amount: 0,
      }),
    })

    const response = await POST(request)

    expect(response.status).toBe(200)
  })

  it('returns 500 error when database operation fails', async () => {
    mockPrisma.income.upsert.mockRejectedValue(new Error('DB error'))

    const request = new Request('http://localhost/api/income', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceId: 'src1',
        year: 2025,
        month: 1,
        amount: 50000,
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to save income')
  })
})
