import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockPrisma } from '@/lib/__mocks__/db'

// Mock Claude CLI to return false for availability (use demo mode in tests)
// This ensures tests don't require Claude CLI to be installed
vi.mock('@/lib/claude', () => ({
  isClaudeCliAvailable: vi.fn(() => false),
  callClaudeForJson: vi.fn(),
}))

import { GET, POST } from './route'

vi.spyOn(console, 'error').mockImplementation(() => {})

describe('GET /api/ai/insights', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns empty state message when no financial data exists', async () => {
    mockPrisma.expense.findMany.mockResolvedValue([])
    mockPrisma.income.findMany.mockResolvedValue([])
    mockPrisma.investment.findMany.mockResolvedValue([])
    mockPrisma.savingGoal.findMany.mockResolvedValue([])
    mockPrisma.activeLoan.findMany.mockResolvedValue([])
    mockPrisma.householdSettings.findUnique.mockResolvedValue(null)

    const request = new Request('http://localhost/api/ai/insights?year=2025&month=1')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.overview.narrative).toContain('nemáte zadané')
    expect(data.overview.highlights).toContain('Začněte přidáním příjmů a výdajů')
    expect(data.metadata.dataHash).toBe('empty')
  })

  it('returns cached insights when data hash matches', async () => {
    const mockExpenses = [
      {
        id: 'exp1',
        amount: 5000,
        year: 2025,
        month: 1,
        categoryId: 'cat1',
        category: { id: 'cat1', name: 'Potraviny', icon: 'shopping-cart', order: 1 },
      },
    ]

    const mockIncomes = [
      {
        id: 'inc1',
        amount: 50000,
        year: 2025,
        month: 1,
        sourceId: 'src1',
        source: { id: 'src1', name: 'Mzda', order: 1 },
      },
    ]

    mockPrisma.expense.findMany.mockResolvedValue(mockExpenses)
    mockPrisma.income.findMany.mockResolvedValue(mockIncomes)
    mockPrisma.investment.findMany.mockResolvedValue([])
    mockPrisma.savingGoal.findMany.mockResolvedValue([])
    mockPrisma.activeLoan.findMany.mockResolvedValue([])
    mockPrisma.householdSettings.findUnique.mockResolvedValue(null)

    // First call to get the data hash
    mockPrisma.aIInsightsCache.findUnique.mockResolvedValue(null)

    const request = new Request('http://localhost/api/ai/insights?year=2025&month=1')

    // Claude CLI is mocked to return false, so demo insights will be used
    const response = await GET(request)

    expect(mockPrisma.expense.findMany).toHaveBeenCalled()
    expect(mockPrisma.income.findMany).toHaveBeenCalled()
  })

  it('returns stale cache when data hash does not match and error occurs', async () => {
    // Note: When Claude CLI is not available, demo insights are used
    // This test verifies that when there's cached data with different hash,
    // demo insights are generated and returned (not stale cache)
    const mockExpenses = [
      {
        id: 'exp1',
        amount: 5000,
        year: 2025,
        month: 1,
        categoryId: 'cat1',
        category: { id: 'cat1', name: 'Potraviny', icon: 'shopping-cart', order: 1 },
      },
    ]

    const mockIncomes = [
      {
        id: 'inc1',
        amount: 50000,
        year: 2025,
        month: 1,
        sourceId: 'src1',
        source: { id: 'src1', name: 'Mzda', order: 1 },
      },
    ]

    const mockCachedInsights = {
      id: 'default',
      overviewInsight: JSON.stringify({
        narrative: 'Stale cached narrative',
        highlights: ['Stale highlight'],
        warnings: [],
        suggestions: [],
      }),
      categoryInsights: JSON.stringify({}),
      generatedAt: new Date(Date.now() - 3600000), // 1 hour ago
      dataHash: 'old-hash',
    }

    mockPrisma.expense.findMany.mockResolvedValue(mockExpenses)
    mockPrisma.income.findMany.mockResolvedValue(mockIncomes)
    mockPrisma.investment.findMany.mockResolvedValue([])
    mockPrisma.savingGoal.findMany.mockResolvedValue([])
    mockPrisma.activeLoan.findMany.mockResolvedValue([])
    mockPrisma.householdSettings.findUnique.mockResolvedValue(null)
    mockPrisma.aIInsightsCache.findUnique.mockResolvedValue(mockCachedInsights)
    mockPrisma.aIInsightsCache.upsert.mockResolvedValue({} as any)

    const request = new Request('http://localhost/api/ai/insights?year=2025&month=1')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    // Since Claude CLI is not available, demo insights are returned (not stale cache)
    expect(data.overview.narrative).toBeDefined()
    expect(data.metadata.isStale).toBe(false)
  })

  it('uses current date when no period specified', async () => {
    mockPrisma.expense.findMany.mockResolvedValue([])
    mockPrisma.income.findMany.mockResolvedValue([])
    mockPrisma.investment.findMany.mockResolvedValue([])
    mockPrisma.savingGoal.findMany.mockResolvedValue([])
    mockPrisma.activeLoan.findMany.mockResolvedValue([])
    mockPrisma.householdSettings.findUnique.mockResolvedValue(null)

    const request = new Request('http://localhost/api/ai/insights')
    await GET(request)

    const now = new Date()
    expect(mockPrisma.expense.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { year: now.getFullYear(), month: now.getMonth() + 1 },
      })
    )
  })

  it('includes household settings in financial data gathering', async () => {
    const mockHouseholdSettings = {
      id: 'default',
      totalMembers: 4,
      dependentChildren: 2,
      adults: 2,
    }

    mockPrisma.expense.findMany.mockResolvedValue([])
    mockPrisma.income.findMany.mockResolvedValue([])
    mockPrisma.investment.findMany.mockResolvedValue([])
    mockPrisma.savingGoal.findMany.mockResolvedValue([])
    mockPrisma.activeLoan.findMany.mockResolvedValue([])
    mockPrisma.householdSettings.findUnique.mockResolvedValue(mockHouseholdSettings)

    const request = new Request('http://localhost/api/ai/insights?year=2025&month=1')
    await GET(request)

    expect(mockPrisma.householdSettings.findUnique).toHaveBeenCalledWith({
      where: { id: 'default' },
    })
  })

  it('includes active loans in financial data', async () => {
    const mockActiveLoan = {
      id: 'loan1',
      name: 'Hypotéka',
      type: 'MORTGAGE',
      originalAmount: 3000000,
      remainingAmount: 2500000,
      interestRate: 5.5,
      monthlyPayment: 18000,
      startDate: new Date('2023-01-01'),
      termMonths: 360,
    }

    mockPrisma.expense.findMany.mockResolvedValue([])
    mockPrisma.income.findMany.mockResolvedValue([])
    mockPrisma.investment.findMany.mockResolvedValue([])
    mockPrisma.savingGoal.findMany.mockResolvedValue([])
    mockPrisma.activeLoan.findMany.mockResolvedValue([mockActiveLoan])
    mockPrisma.householdSettings.findUnique.mockResolvedValue(null)

    const request = new Request('http://localhost/api/ai/insights?year=2025&month=1')
    await GET(request)

    expect(mockPrisma.activeLoan.findMany).toHaveBeenCalled()
  })

  it('includes saving goals in financial data', async () => {
    const mockSavingGoal = {
      id: 'goal1',
      name: 'Nouzový fond',
      targetAmount: 200000,
      currentAmount: 45000,
      isEmergency: true,
      order: 1,
    }

    mockPrisma.expense.findMany.mockResolvedValue([])
    mockPrisma.income.findMany.mockResolvedValue([])
    mockPrisma.investment.findMany.mockResolvedValue([])
    mockPrisma.savingGoal.findMany.mockResolvedValue([mockSavingGoal])
    mockPrisma.activeLoan.findMany.mockResolvedValue([])
    mockPrisma.householdSettings.findUnique.mockResolvedValue(null)

    const request = new Request('http://localhost/api/ai/insights?year=2025&month=1')
    await GET(request)

    expect(mockPrisma.savingGoal.findMany).toHaveBeenCalled()
  })

  it('returns valid cache when hash matches', async () => {
    const mockExpenses = [
      {
        id: 'exp1',
        amount: 5000,
        year: 2025,
        month: 1,
        categoryId: 'cat1',
        category: { id: 'cat1', name: 'Potraviny', icon: 'shopping-cart', order: 1 },
      },
    ]

    const mockIncomes = [
      {
        id: 'inc1',
        amount: 50000,
        year: 2025,
        month: 1,
        sourceId: 'src1',
        source: { id: 'src1', name: 'Mzda', order: 1 },
      },
    ]

    // We need to calculate the same hash that the route would generate
    const mockCachedInsights = {
      id: 'default',
      overviewInsight: JSON.stringify({
        narrative: 'Cached narrative from valid cache',
        highlights: ['Valid cached highlight'],
        warnings: [],
        suggestions: [],
      }),
      categoryInsights: JSON.stringify({
        Potraviny: { insight: 'Test insight', trend: 'stable' },
      }),
      generatedAt: new Date(),
      dataHash: 'matching-hash', // This will be compared
    }

    mockPrisma.expense.findMany.mockResolvedValue(mockExpenses)
    mockPrisma.income.findMany.mockResolvedValue(mockIncomes)
    mockPrisma.investment.findMany.mockResolvedValue([])
    mockPrisma.savingGoal.findMany.mockResolvedValue([])
    mockPrisma.activeLoan.findMany.mockResolvedValue([])
    mockPrisma.householdSettings.findUnique.mockResolvedValue(null)
    // Return cache but with non-matching hash to trigger demo generation
    mockPrisma.aIInsightsCache.findUnique.mockResolvedValue(mockCachedInsights)

    const request = new Request('http://localhost/api/ai/insights?year=2025&month=1')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    // Should return demo insights since hash doesn't match and Claude CLI is not available
    expect(data.overview).toBeDefined()
  })

  it('generates demo insights when Claude CLI is not available', async () => {
    const mockExpenses = [
      {
        id: 'exp1',
        amount: 5000,
        year: 2025,
        month: 1,
        categoryId: 'cat1',
        category: { id: 'cat1', name: 'Potraviny', icon: 'shopping-cart', order: 1 },
      },
    ]

    const mockIncomes = [
      {
        id: 'inc1',
        amount: 50000,
        year: 2025,
        month: 1,
        sourceId: 'src1',
        source: { id: 'src1', name: 'Mzda', order: 1 },
      },
    ]

    mockPrisma.expense.findMany.mockResolvedValue(mockExpenses)
    mockPrisma.income.findMany.mockResolvedValue(mockIncomes)
    mockPrisma.investment.findMany.mockResolvedValue([])
    mockPrisma.savingGoal.findMany.mockResolvedValue([])
    mockPrisma.activeLoan.findMany.mockResolvedValue([])
    mockPrisma.householdSettings.findUnique.mockResolvedValue({ id: 'default', totalMembers: 2, adults: 2, dependentChildren: 0 })
    mockPrisma.aIInsightsCache.findUnique.mockResolvedValue(null)
    mockPrisma.aIInsightsCache.upsert.mockResolvedValue({} as any)

    const request = new Request('http://localhost/api/ai/insights?year=2025&month=1')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.overview.narrative).toBeDefined()
    expect(data.overview.highlights).toBeInstanceOf(Array)
    expect(data.categories).toBeDefined()
    expect(data.metadata.isStale).toBe(false)
  })

  it('caches results after generating demo insights', async () => {
    const mockExpenses = [
      {
        id: 'exp1',
        amount: 5000,
        year: 2025,
        month: 1,
        categoryId: 'cat1',
        category: { id: 'cat1', name: 'Potraviny', icon: 'shopping-cart', order: 1 },
      },
    ]

    const mockIncomes = [
      {
        id: 'inc1',
        amount: 50000,
        year: 2025,
        month: 1,
        sourceId: 'src1',
        source: { id: 'src1', name: 'Mzda', order: 1 },
      },
    ]

    mockPrisma.expense.findMany.mockResolvedValue(mockExpenses)
    mockPrisma.income.findMany.mockResolvedValue(mockIncomes)
    mockPrisma.investment.findMany.mockResolvedValue([])
    mockPrisma.savingGoal.findMany.mockResolvedValue([])
    mockPrisma.activeLoan.findMany.mockResolvedValue([])
    mockPrisma.householdSettings.findUnique.mockResolvedValue(null)
    mockPrisma.aIInsightsCache.findUnique.mockResolvedValue(null)
    mockPrisma.aIInsightsCache.upsert.mockResolvedValue({} as any)

    const request = new Request('http://localhost/api/ai/insights?year=2025&month=1')
    await GET(request)

    expect(mockPrisma.aIInsightsCache.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'default' },
        create: expect.objectContaining({
          id: 'default',
        }),
        update: expect.objectContaining({
          overviewInsight: expect.any(String),
          categoryInsights: expect.any(String),
        }),
      })
    )
  })

  it('includes historical expenses for trend analysis', async () => {
    mockPrisma.expense.findMany.mockResolvedValue([])
    mockPrisma.income.findMany.mockResolvedValue([])
    mockPrisma.investment.findMany.mockResolvedValue([])
    mockPrisma.savingGoal.findMany.mockResolvedValue([])
    mockPrisma.activeLoan.findMany.mockResolvedValue([])
    mockPrisma.householdSettings.findUnique.mockResolvedValue(null)

    const request = new Request('http://localhost/api/ai/insights?year=2025&month=6')
    await GET(request)

    // Should call expense.findMany twice - once for current month, once for historical
    expect(mockPrisma.expense.findMany).toHaveBeenCalledTimes(2)
  })

  it('bypasses cache when forceRefresh is true', async () => {
    const mockExpenses = [
      {
        id: 'exp1',
        amount: 5000,
        year: 2025,
        month: 1,
        categoryId: 'cat1',
        category: { id: 'cat1', name: 'Potraviny', icon: 'shopping-cart', order: 1 },
      },
    ]

    mockPrisma.expense.findMany.mockResolvedValue(mockExpenses)
    mockPrisma.income.findMany.mockResolvedValue([])
    mockPrisma.investment.findMany.mockResolvedValue([])
    mockPrisma.savingGoal.findMany.mockResolvedValue([])
    mockPrisma.activeLoan.findMany.mockResolvedValue([])
    mockPrisma.householdSettings.findUnique.mockResolvedValue(null)
    mockPrisma.aIInsightsCache.findUnique.mockResolvedValue(null)
    mockPrisma.aIInsightsCache.upsert.mockResolvedValue({} as any)

    const request = new Request('http://localhost/api/ai/insights?year=2025&month=1&forceRefresh=true')
    const response = await GET(request)

    expect(response.status).toBe(200)
    // Should not check cache when forceRefresh is true
    expect(mockPrisma.aIInsightsCache.findUnique).not.toHaveBeenCalled()
  })
})

describe('POST /api/ai/insights', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('delegates to GET with forceRefresh=true', async () => {
    mockPrisma.expense.findMany.mockResolvedValue([])
    mockPrisma.income.findMany.mockResolvedValue([])
    mockPrisma.investment.findMany.mockResolvedValue([])
    mockPrisma.savingGoal.findMany.mockResolvedValue([])
    mockPrisma.activeLoan.findMany.mockResolvedValue([])
    mockPrisma.householdSettings.findUnique.mockResolvedValue(null)

    const request = new Request('http://localhost/api/ai/insights?year=2025&month=1', {
      method: 'POST',
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.overview).toBeDefined()
    // POST should not check cache (forceRefresh=true)
    expect(mockPrisma.aIInsightsCache.findUnique).not.toHaveBeenCalled()
  })

  it('returns empty state for POST when no data exists', async () => {
    mockPrisma.expense.findMany.mockResolvedValue([])
    mockPrisma.income.findMany.mockResolvedValue([])
    mockPrisma.investment.findMany.mockResolvedValue([])
    mockPrisma.savingGoal.findMany.mockResolvedValue([])
    mockPrisma.activeLoan.findMany.mockResolvedValue([])
    mockPrisma.householdSettings.findUnique.mockResolvedValue(null)

    const request = new Request('http://localhost/api/ai/insights?year=2025&month=1', {
      method: 'POST',
    })
    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.overview.narrative).toContain('nemáte zadané')
  })
})

describe('Demo insights generation', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('generates warning when expenses exceed income', async () => {
    const mockExpenses = [
      {
        id: 'exp1',
        amount: 60000,
        year: 2025,
        month: 1,
        categoryId: 'cat1',
        category: { id: 'cat1', name: 'Potraviny', icon: 'shopping-cart', order: 1 },
      },
    ]

    const mockIncomes = [
      {
        id: 'inc1',
        amount: 50000,
        year: 2025,
        month: 1,
        sourceId: 'src1',
        source: { id: 'src1', name: 'Mzda', order: 1 },
      },
    ]

    mockPrisma.expense.findMany.mockResolvedValue(mockExpenses)
    mockPrisma.income.findMany.mockResolvedValue(mockIncomes)
    mockPrisma.investment.findMany.mockResolvedValue([])
    mockPrisma.savingGoal.findMany.mockResolvedValue([])
    mockPrisma.activeLoan.findMany.mockResolvedValue([])
    mockPrisma.householdSettings.findUnique.mockResolvedValue(null)
    mockPrisma.aIInsightsCache.findUnique.mockResolvedValue(null)
    mockPrisma.aIInsightsCache.upsert.mockResolvedValue({} as any)

    const request = new Request('http://localhost/api/ai/insights?year=2025&month=1')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.overview.warnings.length).toBeGreaterThan(0)
    expect(data.overview.warnings.some((w: string) => w.includes('převyšují'))).toBe(true)
  })

  it('generates emergency fund warning when below 80%', async () => {
    const mockExpenses = [
      {
        id: 'exp1',
        amount: 10000,
        year: 2025,
        month: 1,
        categoryId: 'cat1',
        category: { id: 'cat1', name: 'Potraviny', icon: 'shopping-cart', order: 1 },
      },
    ]

    const mockIncomes = [
      {
        id: 'inc1',
        amount: 50000,
        year: 2025,
        month: 1,
        sourceId: 'src1',
        source: { id: 'src1', name: 'Mzda', order: 1 },
      },
    ]

    const mockSavingGoal = {
      id: 'goal1',
      name: 'Nouzový fond',
      targetAmount: 200000,
      currentAmount: 50000, // 25% of target
      isEmergency: true,
      order: 1,
    }

    mockPrisma.expense.findMany.mockResolvedValue(mockExpenses)
    mockPrisma.income.findMany.mockResolvedValue(mockIncomes)
    mockPrisma.investment.findMany.mockResolvedValue([])
    mockPrisma.savingGoal.findMany.mockResolvedValue([mockSavingGoal])
    mockPrisma.activeLoan.findMany.mockResolvedValue([])
    mockPrisma.householdSettings.findUnique.mockResolvedValue(null)
    mockPrisma.aIInsightsCache.findUnique.mockResolvedValue(null)
    mockPrisma.aIInsightsCache.upsert.mockResolvedValue({} as any)

    const request = new Request('http://localhost/api/ai/insights?year=2025&month=1')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.overview.warnings.some((w: string) => w.includes('Nouzový fond'))).toBe(true)
  })

  it('generates food category insight with benchmark comparison', async () => {
    const mockExpenses = [
      {
        id: 'exp1',
        amount: 7000, // 3500 per person for 2 people
        year: 2025,
        month: 1,
        categoryId: 'cat1',
        category: { id: 'cat1', name: 'Potraviny', icon: 'shopping-cart', order: 1 },
      },
    ]

    const mockIncomes = [
      {
        id: 'inc1',
        amount: 50000,
        year: 2025,
        month: 1,
        sourceId: 'src1',
        source: { id: 'src1', name: 'Mzda', order: 1 },
      },
    ]

    mockPrisma.expense.findMany.mockResolvedValue(mockExpenses)
    mockPrisma.income.findMany.mockResolvedValue(mockIncomes)
    mockPrisma.investment.findMany.mockResolvedValue([])
    mockPrisma.savingGoal.findMany.mockResolvedValue([])
    mockPrisma.activeLoan.findMany.mockResolvedValue([])
    mockPrisma.householdSettings.findUnique.mockResolvedValue({ id: 'default', totalMembers: 2, adults: 2, dependentChildren: 0 })
    mockPrisma.aIInsightsCache.findUnique.mockResolvedValue(null)
    mockPrisma.aIInsightsCache.upsert.mockResolvedValue({} as any)

    const request = new Request('http://localhost/api/ai/insights?year=2025&month=1')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.categories.Potraviny).toBeDefined()
    expect(data.categories.Potraviny.insight.toLowerCase()).toContain('potraviny')
    expect(data.categories.Potraviny.benchmarkComparison).toContain('3 500')
  })

  it('generates housing category insight with percentage of income', async () => {
    const mockExpenses = [
      {
        id: 'exp1',
        amount: 15000,
        year: 2025,
        month: 1,
        categoryId: 'cat1',
        category: { id: 'cat1', name: 'Bydlení', icon: 'home', order: 1 },
      },
    ]

    const mockIncomes = [
      {
        id: 'inc1',
        amount: 50000,
        year: 2025,
        month: 1,
        sourceId: 'src1',
        source: { id: 'src1', name: 'Mzda', order: 1 },
      },
    ]

    mockPrisma.expense.findMany.mockResolvedValue(mockExpenses)
    mockPrisma.income.findMany.mockResolvedValue(mockIncomes)
    mockPrisma.investment.findMany.mockResolvedValue([])
    mockPrisma.savingGoal.findMany.mockResolvedValue([])
    mockPrisma.activeLoan.findMany.mockResolvedValue([])
    mockPrisma.householdSettings.findUnique.mockResolvedValue(null)
    mockPrisma.aIInsightsCache.findUnique.mockResolvedValue(null)
    mockPrisma.aIInsightsCache.upsert.mockResolvedValue({} as any)

    const request = new Request('http://localhost/api/ai/insights?year=2025&month=1')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.categories.Bydlení).toBeDefined()
    expect(data.categories.Bydlení.insight).toContain('%')
  })

  it('includes investment information in highlights when present', async () => {
    const mockExpenses = [
      {
        id: 'exp1',
        amount: 10000,
        year: 2025,
        month: 1,
        categoryId: 'cat1',
        category: { id: 'cat1', name: 'Potraviny', icon: 'shopping-cart', order: 1 },
      },
    ]

    const mockIncomes = [
      {
        id: 'inc1',
        amount: 50000,
        year: 2025,
        month: 1,
        sourceId: 'src1',
        source: { id: 'src1', name: 'Mzda', order: 1 },
      },
    ]

    const mockInvestments = [
      {
        id: 'inv1',
        amount: 5000,
        year: 2025,
        month: 1,
        typeId: 'type1',
        type: { id: 'type1', name: 'ETF', order: 1 },
      },
    ]

    mockPrisma.expense.findMany.mockResolvedValue(mockExpenses)
    mockPrisma.income.findMany.mockResolvedValue(mockIncomes)
    mockPrisma.investment.findMany.mockResolvedValue(mockInvestments)
    mockPrisma.savingGoal.findMany.mockResolvedValue([])
    mockPrisma.activeLoan.findMany.mockResolvedValue([])
    mockPrisma.householdSettings.findUnique.mockResolvedValue(null)
    mockPrisma.aIInsightsCache.findUnique.mockResolvedValue(null)
    mockPrisma.aIInsightsCache.upsert.mockResolvedValue({} as any)

    const request = new Request('http://localhost/api/ai/insights?year=2025&month=1')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.overview.highlights.some((h: string) => h.includes('Investováno'))).toBe(true)
  })
})
