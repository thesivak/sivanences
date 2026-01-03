import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST } from './route'
import { mockPrisma } from '@/lib/__mocks__/db'

// Mock console.error to prevent noise
vi.spyOn(console, 'error').mockImplementation(() => {})

describe('GET /api/expenses', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns categories with expenses for the specified period', async () => {
    const mockCategories = [
      {
        id: 'cat1',
        name: 'Potraviny',
        icon: 'shopping-cart',
        order: 1,
        expenses: [{ id: 'exp1', amount: 5000, year: 2025, month: 1, categoryId: 'cat1' }],
      },
      {
        id: 'cat2',
        name: 'Bydleni',
        icon: 'home',
        order: 2,
        expenses: [],
      },
    ]

    mockPrisma.category.findMany.mockResolvedValue(mockCategories)

    const request = new Request('http://localhost/api/expenses?year=2025&month=1')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.year).toBe(2025)
    expect(data.month).toBe(1)
    expect(data.categories).toHaveLength(2)
    expect(data.categories[0].expense).toEqual(mockCategories[0].expenses[0])
    expect(data.categories[1].expense).toBeNull()
  })

  it('uses current date when no period is specified', async () => {
    mockPrisma.category.findMany.mockResolvedValue([])

    const request = new Request('http://localhost/api/expenses')
    const response = await GET(request)
    const data = await response.json()

    const now = new Date()
    expect(data.year).toBe(now.getFullYear())
    expect(data.month).toBe(now.getMonth() + 1)
  })

  it('returns empty categories array when no categories exist', async () => {
    mockPrisma.category.findMany.mockResolvedValue([])

    const request = new Request('http://localhost/api/expenses?year=2025&month=1')
    const response = await GET(request)
    const data = await response.json()

    expect(data.categories).toEqual([])
  })

  it('orders categories by order field', async () => {
    mockPrisma.category.findMany.mockResolvedValue([])

    const request = new Request('http://localhost/api/expenses?year=2025&month=1')
    await GET(request)

    expect(mockPrisma.category.findMany).toHaveBeenCalledWith({
      orderBy: { order: 'asc' },
      include: {
        expenses: {
          where: { year: 2025, month: 1 },
        },
      },
    })
  })

  it('returns 500 error when database query fails', async () => {
    mockPrisma.category.findMany.mockRejectedValue(new Error('DB error'))

    const request = new Request('http://localhost/api/expenses?year=2025&month=1')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to fetch expenses')
  })
})

describe('POST /api/expenses', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates or updates an expense successfully', async () => {
    const mockExpense = {
      id: 'exp1',
      categoryId: 'cat1',
      year: 2025,
      month: 1,
      amount: 5000,
    }

    mockPrisma.expense.upsert.mockResolvedValue(mockExpense)

    const request = new Request('http://localhost/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        categoryId: 'cat1',
        year: 2025,
        month: 1,
        amount: 5000,
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual(mockExpense)
    expect(mockPrisma.expense.upsert).toHaveBeenCalledWith({
      where: {
        categoryId_year_month: { categoryId: 'cat1', year: 2025, month: 1 },
      },
      update: { amount: 5000 },
      create: { categoryId: 'cat1', year: 2025, month: 1, amount: 5000 },
    })
  })

  it('returns 400 when categoryId is missing', async () => {
    const request = new Request('http://localhost/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        year: 2025,
        month: 1,
        amount: 5000,
      }),
    })

    const response = await POST(request)

    expect(response.status).toBe(400)
  })

  it('returns 400 when year is missing', async () => {
    const request = new Request('http://localhost/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        categoryId: 'cat1',
        month: 1,
        amount: 5000,
      }),
    })

    const response = await POST(request)

    expect(response.status).toBe(400)
  })

  it('returns 400 when month is missing', async () => {
    const request = new Request('http://localhost/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        categoryId: 'cat1',
        year: 2025,
        amount: 5000,
      }),
    })

    const response = await POST(request)

    expect(response.status).toBe(400)
  })

  it('allows amount to be 0', async () => {
    const mockExpense = {
      id: 'exp1',
      categoryId: 'cat1',
      year: 2025,
      month: 1,
      amount: 0,
    }

    mockPrisma.expense.upsert.mockResolvedValue(mockExpense)

    const request = new Request('http://localhost/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        categoryId: 'cat1',
        year: 2025,
        month: 1,
        amount: 0,
      }),
    })

    const response = await POST(request)

    expect(response.status).toBe(200)
  })

  it('returns 500 error when database operation fails', async () => {
    mockPrisma.expense.upsert.mockRejectedValue(new Error('DB error'))

    const request = new Request('http://localhost/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        categoryId: 'cat1',
        year: 2025,
        month: 1,
        amount: 5000,
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to save expense')
  })
})
