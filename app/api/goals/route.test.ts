import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST } from './route'
import { mockPrisma } from '@/lib/__mocks__/db'

// Mock console.error to prevent noise
vi.spyOn(console, 'error').mockImplementation(() => {})

describe('GET /api/goals', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns goals with progress and average expenses', async () => {
    const mockExpenseGroups = [
      { year: 2025, month: 1, _sum: { amount: 30000 } },
      { year: 2024, month: 12, _sum: { amount: 25000 } },
      { year: 2024, month: 11, _sum: { amount: 35000 } },
    ]

    const mockGoals = [
      {
        id: 'goal1',
        name: 'Dovolena',
        targetAmount: 50000,
        currentAmount: 25000,
        isEmergency: false,
        order: 1,
        transactions: [],
      },
      {
        id: 'goal2',
        name: 'Nouzovy fond',
        targetAmount: 100000,
        currentAmount: 60000,
        isEmergency: true,
        order: 2,
        transactions: [],
      },
    ]

    mockPrisma.expense.groupBy.mockResolvedValue(mockExpenseGroups)
    mockPrisma.savingGoal.findMany.mockResolvedValue(mockGoals)

    const request = new Request('http://localhost/api/goals')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.avgMonthlyExpenses).toBe(30000) // (30000 + 25000 + 35000) / 3
    expect(data.goals).toHaveLength(2)
    expect(data.goals[0].progress).toBe(50) // 25000 / 50000 * 100
    expect(data.goals[1].progress).toBe(60) // 60000 / 100000 * 100
    expect(data.goals[1].recommendedTarget).toBe(90000) // 30000 * 3
  })

  it('returns 0 progress when targetAmount is null', async () => {
    mockPrisma.expense.groupBy.mockResolvedValue([])
    mockPrisma.savingGoal.findMany.mockResolvedValue([
      {
        id: 'goal1',
        name: 'Obecny fond',
        targetAmount: null,
        currentAmount: 10000,
        isEmergency: false,
        order: 1,
        transactions: [],
      },
    ])

    const request = new Request('http://localhost/api/goals')
    const response = await GET(request)
    const data = await response.json()

    expect(data.goals[0].progress).toBe(0)
  })

  it('handles no expense history gracefully', async () => {
    mockPrisma.expense.groupBy.mockResolvedValue([])
    mockPrisma.savingGoal.findMany.mockResolvedValue([])

    const request = new Request('http://localhost/api/goals')
    const response = await GET(request)
    const data = await response.json()

    expect(data.avgMonthlyExpenses).toBe(0)
    expect(data.goals).toEqual([])
  })

  it('includes last 10 transactions per goal', async () => {
    mockPrisma.expense.groupBy.mockResolvedValue([])
    mockPrisma.savingGoal.findMany.mockResolvedValue([
      {
        id: 'goal1',
        name: 'Fond',
        targetAmount: 50000,
        currentAmount: 10000,
        isEmergency: false,
        order: 1,
        transactions: [
          { id: 'tx1', amount: 5000, description: 'Vklad' },
          { id: 'tx2', amount: 5000, description: 'Vklad' },
        ],
      },
    ])

    const request = new Request('http://localhost/api/goals')
    await GET(request)

    expect(mockPrisma.savingGoal.findMany).toHaveBeenCalledWith({
      orderBy: { order: 'asc' },
      include: {
        transactions: {
          orderBy: { date: 'desc' },
          take: 10,
        },
      },
    })
  })

  it('returns 500 error when database query fails', async () => {
    mockPrisma.expense.groupBy.mockRejectedValue(new Error('DB error'))

    const request = new Request('http://localhost/api/goals')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to fetch goals')
  })
})

describe('POST /api/goals', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a new goal successfully', async () => {
    const mockGoal = {
      id: 'goal1',
      name: 'Nova dovolena',
      targetAmount: 75000,
      currentAmount: 0,
      isEmergency: false,
      order: 3,
    }

    mockPrisma.savingGoal.aggregate.mockResolvedValue({ _max: { order: 2 } })
    mockPrisma.savingGoal.create.mockResolvedValue(mockGoal)

    const request = new Request('http://localhost/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Nova dovolena',
        targetAmount: 75000,
        isEmergency: false,
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual(mockGoal)
    expect(mockPrisma.savingGoal.create).toHaveBeenCalledWith({
      data: {
        name: 'Nova dovolena',
        targetAmount: 75000,
        isEmergency: false,
        order: 3,
      },
    })
  })

  it('creates emergency fund goal', async () => {
    mockPrisma.savingGoal.aggregate.mockResolvedValue({ _max: { order: 0 } })
    mockPrisma.savingGoal.create.mockResolvedValue({
      id: 'goal1',
      name: 'Nouzovy fond',
      isEmergency: true,
      order: 1,
    })

    const request = new Request('http://localhost/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Nouzovy fond',
        isEmergency: true,
      }),
    })

    await POST(request)

    expect(mockPrisma.savingGoal.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        isEmergency: true,
      }),
    })
  })

  it('returns 400 when name is missing', async () => {
    const request = new Request('http://localhost/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetAmount: 50000,
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Name is required')
  })

  it('sets order to 1 when no goals exist', async () => {
    mockPrisma.savingGoal.aggregate.mockResolvedValue({ _max: { order: null } })
    mockPrisma.savingGoal.create.mockResolvedValue({ id: 'goal1' })

    const request = new Request('http://localhost/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Prvni cil' }),
    })

    await POST(request)

    expect(mockPrisma.savingGoal.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        order: 1,
      }),
    })
  })

  it('sets targetAmount to null when not provided', async () => {
    mockPrisma.savingGoal.aggregate.mockResolvedValue({ _max: { order: 0 } })
    mockPrisma.savingGoal.create.mockResolvedValue({ id: 'goal1' })

    const request = new Request('http://localhost/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Bez cile' }),
    })

    await POST(request)

    expect(mockPrisma.savingGoal.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        targetAmount: null,
      }),
    })
  })

  it('returns 500 error when database operation fails', async () => {
    mockPrisma.savingGoal.aggregate.mockRejectedValue(new Error('DB error'))

    const request = new Request('http://localhost/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test' }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to create goal')
  })
})
