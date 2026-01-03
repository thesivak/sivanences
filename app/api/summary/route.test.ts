import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET } from './route'
import { mockPrisma } from '@/lib/__mocks__/db'
import { calculateLoan } from '@/lib/loan'

// Mock the loan calculation module
vi.mock('@/lib/loan')

// Mock console.error to prevent noise
vi.spyOn(console, 'error').mockImplementation(() => {})

describe('GET /api/summary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Balance Calculation', () => {
    it('calculates balance correctly: totalIncome - totalExpenses - totalInvestments - totalLoanPayments', async () => {
      // Set system time to Jan 2025 so loan calculations are predictable
      const now = new Date('2025-01-01')
      vi.setSystemTime(now)

      const mockCategories = [
        {
          id: 'cat1',
          name: 'Potraviny',
          icon: '🛒',
          order: 1,
          expenses: [{ id: 'exp1', amount: 15000, year: 2025, month: 1 }],
        },
        {
          id: 'cat2',
          name: 'Bydlení',
          icon: '🏠',
          order: 2,
          expenses: [{ id: 'exp2', amount: 20000, year: 2025, month: 1 }],
        },
      ]

      const mockIncomeSources = [
        {
          id: 'inc1',
          name: 'Plat',
          order: 1,
          incomes: [{ id: 'income1', amount: 60000, year: 2025, month: 1 }],
        },
      ]

      const mockInvestmentTypes = [
        {
          id: 'inv1',
          name: 'Akcie',
          order: 1,
          investments: [{ id: 'invest1', amount: 5000, year: 2025, month: 1 }],
        },
      ]

      const mockLoans = [
        {
          id: 'loan1',
          name: 'Hypotéka',
          originalAmount: 3000000,
          interestRate: 4.9,
          termMonths: 360,
          monthlyPayment: 16000,
          startDate: new Date('2024-01-01'), // 12 months ago
          createdAt: new Date('2024-01-01'),
        },
      ]

      mockPrisma.category.findMany.mockResolvedValue(mockCategories)
      mockPrisma.incomeSource.findMany.mockResolvedValue(mockIncomeSources)
      mockPrisma.investmentType.findMany.mockResolvedValue(mockInvestmentTypes)
      mockPrisma.activeLoan.findMany.mockResolvedValue(mockLoans)
      mockPrisma.expense.aggregate.mockResolvedValue({ _sum: { amount: 30000 } })
      mockPrisma.income.aggregate.mockResolvedValue({ _sum: { amount: 55000 } })
      mockPrisma.investment.aggregate.mockResolvedValue({ _sum: { amount: 4000 } })
      mockPrisma.savingGoal.findMany.mockResolvedValue([])
      mockPrisma.householdSettings.findUnique.mockResolvedValue(null)
      mockPrisma.expense.groupBy.mockResolvedValue([
        { year: 2025, month: 1, _sum: { amount: 35000 } },
      ])

      // Mock calculateLoan to return amortization schedule with 12 entries (for 12 months elapsed)
      vi.mocked(calculateLoan).mockReturnValue({
        monthlyPayment: 16000,
        totalPayment: 5760000,
        totalInterest: 2760000,
        amortization: Array.from({ length: 12 }, (_, i) => ({
          month: i + 1,
          payment: 16000,
          principal: 3750 + i * 10,
          interest: 12250 - i * 10,
          balance: 2996250 - i * 3760,
        })),
      })

      const request = new Request('http://localhost/api/summary?year=2025&month=1')
      const response = await GET(request)
      const data = await response.json()

      // totalIncome (60000) - totalExpenses (35000) - totalInvestments (5000) - totalLoanPayments (16000) = 4000
      expect(data.balance).toBe(4000)
      expect(data.totalIncome).toBe(60000)
      expect(data.totalExpenses).toBe(35000)
      expect(data.totalInvestments).toBe(5000)
      expect(data.totalLoanPayments).toBe(16000)

      vi.useRealTimers()
    })

    it('calculates balance when there are no loan payments', async () => {
      mockPrisma.category.findMany.mockResolvedValue([
        {
          id: 'cat1',
          name: 'Potraviny',
          icon: '🛒',
          order: 1,
          expenses: [{ id: 'exp1', amount: 20000, year: 2025, month: 1 }],
        },
      ])
      mockPrisma.incomeSource.findMany.mockResolvedValue([
        {
          id: 'inc1',
          name: 'Plat',
          order: 1,
          incomes: [{ id: 'income1', amount: 50000, year: 2025, month: 1 }],
        },
      ])
      mockPrisma.investmentType.findMany.mockResolvedValue([])
      mockPrisma.activeLoan.findMany.mockResolvedValue([])
      mockPrisma.expense.aggregate.mockResolvedValue({ _sum: { amount: 18000 } })
      mockPrisma.income.aggregate.mockResolvedValue({ _sum: { amount: 45000 } })
      mockPrisma.investment.aggregate.mockResolvedValue({ _sum: { amount: 0 } })
      mockPrisma.savingGoal.findMany.mockResolvedValue([])
      mockPrisma.householdSettings.findUnique.mockResolvedValue(null)
      mockPrisma.expense.groupBy.mockResolvedValue([])

      const request = new Request('http://localhost/api/summary?year=2025&month=1')
      const response = await GET(request)
      const data = await response.json()

      // totalIncome (50000) - totalExpenses (20000) - totalInvestments (0) - totalLoanPayments (0) = 30000
      expect(data.balance).toBe(30000)
      expect(data.totalLoanPayments).toBe(0)
    })
  })

  describe('Year Boundary Handling', () => {
    it('handles January correctly (month=1): prevMonth=12, prevYear=year-1', async () => {
      mockPrisma.category.findMany.mockResolvedValue([])
      mockPrisma.incomeSource.findMany.mockResolvedValue([])
      mockPrisma.investmentType.findMany.mockResolvedValue([])
      mockPrisma.activeLoan.findMany.mockResolvedValue([])
      mockPrisma.savingGoal.findMany.mockResolvedValue([])
      mockPrisma.householdSettings.findUnique.mockResolvedValue(null)
      mockPrisma.expense.groupBy.mockResolvedValue([])

      // Mock previous month data
      mockPrisma.expense.aggregate.mockResolvedValue({ _sum: { amount: 32000 } })
      mockPrisma.income.aggregate.mockResolvedValue({ _sum: { amount: 58000 } })
      mockPrisma.investment.aggregate.mockResolvedValue({ _sum: { amount: 6000 } })

      const request = new Request('http://localhost/api/summary?year=2025&month=1')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)

      // Verify that previous month data was fetched with correct year and month
      expect(mockPrisma.expense.aggregate).toHaveBeenCalledWith({
        where: { year: 2024, month: 12 },
        _sum: { amount: true },
      })
      expect(mockPrisma.income.aggregate).toHaveBeenCalledWith({
        where: { year: 2024, month: 12 },
        _sum: { amount: true },
      })
      expect(mockPrisma.investment.aggregate).toHaveBeenCalledWith({
        where: { year: 2024, month: 12 },
        _sum: { amount: true },
      })

      expect(data.previousMonth.totalExpenses).toBe(32000)
      expect(data.previousMonth.totalIncome).toBe(58000)
      expect(data.previousMonth.totalInvestments).toBe(6000)
    })

    it('handles non-January months correctly: prevMonth=month-1, prevYear=year', async () => {
      mockPrisma.category.findMany.mockResolvedValue([])
      mockPrisma.incomeSource.findMany.mockResolvedValue([])
      mockPrisma.investmentType.findMany.mockResolvedValue([])
      mockPrisma.activeLoan.findMany.mockResolvedValue([])
      mockPrisma.savingGoal.findMany.mockResolvedValue([])
      mockPrisma.householdSettings.findUnique.mockResolvedValue(null)
      mockPrisma.expense.groupBy.mockResolvedValue([])
      mockPrisma.expense.aggregate.mockResolvedValue({ _sum: { amount: 25000 } })
      mockPrisma.income.aggregate.mockResolvedValue({ _sum: { amount: 50000 } })
      mockPrisma.investment.aggregate.mockResolvedValue({ _sum: { amount: 3000 } })

      const request = new Request('http://localhost/api/summary?year=2025&month=6')
      const response = await GET(request)
      await response.json()

      // Verify that previous month data was fetched with correct year and month
      expect(mockPrisma.expense.aggregate).toHaveBeenCalledWith({
        where: { year: 2025, month: 5 },
        _sum: { amount: true },
      })
      expect(mockPrisma.income.aggregate).toHaveBeenCalledWith({
        where: { year: 2025, month: 5 },
        _sum: { amount: true },
      })
      expect(mockPrisma.investment.aggregate).toHaveBeenCalledWith({
        where: { year: 2025, month: 5 },
        _sum: { amount: true },
      })
    })
  })

  describe('Average Monthly Expenses Calculation', () => {
    it('calculates 3-month average expenses correctly', async () => {
      const mockExpenseGroups = [
        { year: 2025, month: 3, _sum: { amount: 30000 } },
        { year: 2025, month: 2, _sum: { amount: 27000 } },
        { year: 2025, month: 1, _sum: { amount: 33000 } },
      ]

      mockPrisma.category.findMany.mockResolvedValue([])
      mockPrisma.incomeSource.findMany.mockResolvedValue([])
      mockPrisma.investmentType.findMany.mockResolvedValue([])
      mockPrisma.activeLoan.findMany.mockResolvedValue([])
      mockPrisma.savingGoal.findMany.mockResolvedValue([])
      mockPrisma.householdSettings.findUnique.mockResolvedValue(null)
      mockPrisma.expense.aggregate.mockResolvedValue({ _sum: { amount: 0 } })
      mockPrisma.income.aggregate.mockResolvedValue({ _sum: { amount: 0 } })
      mockPrisma.investment.aggregate.mockResolvedValue({ _sum: { amount: 0 } })
      mockPrisma.expense.groupBy.mockResolvedValue(mockExpenseGroups)

      const request = new Request('http://localhost/api/summary?year=2025&month=3')
      const response = await GET(request)
      const data = await response.json()

      // Average = (30000 + 27000 + 33000) / 3 = 30000
      expect(data.avgMonthlyExpenses).toBe(30000)
    })

    it('handles fewer than 3 months of data', async () => {
      const mockExpenseGroups = [
        { year: 2025, month: 1, _sum: { amount: 25000 } },
        { year: 2024, month: 12, _sum: { amount: 35000 } },
      ]

      mockPrisma.category.findMany.mockResolvedValue([])
      mockPrisma.incomeSource.findMany.mockResolvedValue([])
      mockPrisma.investmentType.findMany.mockResolvedValue([])
      mockPrisma.activeLoan.findMany.mockResolvedValue([])
      mockPrisma.savingGoal.findMany.mockResolvedValue([])
      mockPrisma.householdSettings.findUnique.mockResolvedValue(null)
      mockPrisma.expense.aggregate.mockResolvedValue({ _sum: { amount: 0 } })
      mockPrisma.income.aggregate.mockResolvedValue({ _sum: { amount: 0 } })
      mockPrisma.investment.aggregate.mockResolvedValue({ _sum: { amount: 0 } })
      mockPrisma.expense.groupBy.mockResolvedValue(mockExpenseGroups)

      const request = new Request('http://localhost/api/summary?year=2025&month=1')
      const response = await GET(request)
      const data = await response.json()

      // Average = (25000 + 35000) / 2 = 30000
      expect(data.avgMonthlyExpenses).toBe(30000)
    })

    it('handles no expense history', async () => {
      mockPrisma.category.findMany.mockResolvedValue([])
      mockPrisma.incomeSource.findMany.mockResolvedValue([])
      mockPrisma.investmentType.findMany.mockResolvedValue([])
      mockPrisma.activeLoan.findMany.mockResolvedValue([])
      mockPrisma.savingGoal.findMany.mockResolvedValue([])
      mockPrisma.householdSettings.findUnique.mockResolvedValue(null)
      mockPrisma.expense.aggregate.mockResolvedValue({ _sum: { amount: 0 } })
      mockPrisma.income.aggregate.mockResolvedValue({ _sum: { amount: 0 } })
      mockPrisma.investment.aggregate.mockResolvedValue({ _sum: { amount: 0 } })
      mockPrisma.expense.groupBy.mockResolvedValue([])

      const request = new Request('http://localhost/api/summary?year=2025&month=1')
      const response = await GET(request)
      const data = await response.json()

      expect(data.avgMonthlyExpenses).toBe(0)
    })
  })

  describe('Loan Payment Totals', () => {
    it('calculates total loan payments from multiple active loans', async () => {
      // Set system time to Jan 2025
      const now = new Date('2025-01-01')
      vi.setSystemTime(now)

      const mockLoans = [
        {
          id: 'loan1',
          name: 'Hypotéka',
          originalAmount: 3000000,
          interestRate: 4.9,
          termMonths: 360,
          monthlyPayment: 16000,
          startDate: new Date('2024-01-01'), // 12 months ago
          createdAt: new Date('2024-01-01'),
        },
        {
          id: 'loan2',
          name: 'Auto',
          originalAmount: 500000,
          interestRate: 5.9,
          termMonths: 60,
          monthlyPayment: 9500,
          startDate: new Date('2024-06-01'), // 7 months ago
          createdAt: new Date('2024-06-01'),
        },
      ]

      mockPrisma.category.findMany.mockResolvedValue([])
      mockPrisma.incomeSource.findMany.mockResolvedValue([])
      mockPrisma.investmentType.findMany.mockResolvedValue([])
      mockPrisma.activeLoan.findMany.mockResolvedValue(mockLoans)
      mockPrisma.savingGoal.findMany.mockResolvedValue([])
      mockPrisma.householdSettings.findUnique.mockResolvedValue(null)
      mockPrisma.expense.aggregate.mockResolvedValue({ _sum: { amount: 0 } })
      mockPrisma.income.aggregate.mockResolvedValue({ _sum: { amount: 0 } })
      mockPrisma.investment.aggregate.mockResolvedValue({ _sum: { amount: 0 } })
      mockPrisma.expense.groupBy.mockResolvedValue([])

      vi.mocked(calculateLoan).mockImplementation((input) => {
        const monthlyPayment = input.amount === 3000000 ? 16000 : 9500
        const paymentsNeeded = input.amount === 3000000 ? 12 : 7
        return {
          monthlyPayment,
          totalPayment: monthlyPayment * input.termMonths,
          totalInterest: monthlyPayment * input.termMonths - input.amount,
          amortization: Array.from({ length: paymentsNeeded }, (_, i) => ({
            month: i + 1,
            payment: monthlyPayment,
            principal: monthlyPayment * 0.7,
            interest: monthlyPayment * 0.3,
            balance: input.amount - (i + 1) * monthlyPayment * 0.7,
          })),
        }
      })

      const request = new Request('http://localhost/api/summary?year=2025&month=1')
      const response = await GET(request)
      const data = await response.json()

      expect(data.totalLoanPayments).toBe(25500) // 16000 + 9500
      expect(data.activeLoans).toHaveLength(2)

      vi.useRealTimers()
    })

    it('calculates previous month loan payments only for loans that had started', async () => {
      // Set system time to Jan 2025
      const now = new Date('2025-01-01')
      vi.setSystemTime(now)

      const mockLoans = [
        {
          id: 'loan1',
          name: 'Hypotéka',
          originalAmount: 3000000,
          interestRate: 4.9,
          termMonths: 360,
          monthlyPayment: 16000,
          startDate: new Date('2024-01-01'), // Started before previous month (Dec 2024)
          createdAt: new Date('2024-01-01'),
        },
        {
          id: 'loan2',
          name: 'Auto',
          originalAmount: 500000,
          interestRate: 5.9,
          termMonths: 60,
          monthlyPayment: 9500,
          startDate: new Date('2025-02-01'), // Started after previous month (Dec 2024)
          createdAt: new Date('2025-02-01'),
        },
      ]

      mockPrisma.category.findMany.mockResolvedValue([])
      mockPrisma.incomeSource.findMany.mockResolvedValue([])
      mockPrisma.investmentType.findMany.mockResolvedValue([])
      mockPrisma.activeLoan.findMany.mockResolvedValue(mockLoans)
      mockPrisma.savingGoal.findMany.mockResolvedValue([])
      mockPrisma.householdSettings.findUnique.mockResolvedValue(null)
      mockPrisma.expense.aggregate.mockResolvedValue({ _sum: { amount: 0 } })
      mockPrisma.income.aggregate.mockResolvedValue({ _sum: { amount: 0 } })
      mockPrisma.investment.aggregate.mockResolvedValue({ _sum: { amount: 0 } })
      mockPrisma.expense.groupBy.mockResolvedValue([])

      vi.mocked(calculateLoan).mockImplementation((input) => {
        const monthlyPayment = input.amount === 3000000 ? 16000 : 9500
        // Loan1: 12 months elapsed, Loan2: hasn't started yet (0 payments)
        const paymentsNeeded = input.amount === 3000000 ? 12 : 0
        return {
          monthlyPayment,
          totalPayment: monthlyPayment * input.termMonths,
          totalInterest: monthlyPayment * input.termMonths - input.amount,
          amortization: Array.from({ length: Math.max(paymentsNeeded, 1) }, (_, i) => ({
            month: i + 1,
            payment: monthlyPayment,
            principal: monthlyPayment * 0.7,
            interest: monthlyPayment * 0.3,
            balance: input.amount - (i + 1) * monthlyPayment * 0.7,
          })),
        }
      })

      const request = new Request('http://localhost/api/summary?year=2025&month=1')
      const response = await GET(request)
      const data = await response.json()

      // Only loan1 was active in December 2024
      expect(data.previousMonth.totalLoanPayments).toBe(16000)
      // But current month has both loans
      expect(data.totalLoanPayments).toBe(25500)

      vi.useRealTimers()
    })

    it('calculates loan balances and progress correctly', async () => {
      // Set system time to Jan 2025
      const now = new Date('2025-01-01')
      vi.setSystemTime(now)

      const mockLoans = [
        {
          id: 'loan1',
          name: 'Hypotéka',
          originalAmount: 100000,
          interestRate: 5.0,
          termMonths: 12,
          monthlyPayment: 8560,
          startDate: new Date('2024-07-01'), // 6 months ago from Jan 2025
          createdAt: new Date('2024-07-01'),
        },
      ]

      mockPrisma.category.findMany.mockResolvedValue([])
      mockPrisma.incomeSource.findMany.mockResolvedValue([])
      mockPrisma.investmentType.findMany.mockResolvedValue([])
      mockPrisma.activeLoan.findMany.mockResolvedValue(mockLoans)
      mockPrisma.savingGoal.findMany.mockResolvedValue([])
      mockPrisma.householdSettings.findUnique.mockResolvedValue(null)
      mockPrisma.expense.aggregate.mockResolvedValue({ _sum: { amount: 0 } })
      mockPrisma.income.aggregate.mockResolvedValue({ _sum: { amount: 0 } })
      mockPrisma.investment.aggregate.mockResolvedValue({ _sum: { amount: 0 } })
      mockPrisma.expense.groupBy.mockResolvedValue([])

      vi.mocked(calculateLoan).mockReturnValue({
        monthlyPayment: 8560,
        totalPayment: 102720,
        totalInterest: 2720,
        amortization: [
          { month: 1, payment: 8560, principal: 8143, interest: 417, balance: 91857 },
          { month: 2, payment: 8560, principal: 8177, interest: 383, balance: 83680 },
          { month: 3, payment: 8560, principal: 8211, interest: 349, balance: 75469 },
          { month: 4, payment: 8560, principal: 8245, interest: 315, balance: 67224 },
          { month: 5, payment: 8560, principal: 8279, interest: 281, balance: 58945 },
          { month: 6, payment: 8560, principal: 8314, interest: 246, balance: 50631 }, // After 6 payments
          { month: 7, payment: 8560, principal: 8349, interest: 211, balance: 42282 },
        ],
      })

      const request = new Request('http://localhost/api/summary?year=2025&month=1')
      const response = await GET(request)
      const data = await response.json()

      expect(data.activeLoans[0].calculatedBalance).toBe(50631)
      expect(data.activeLoans[0].paymentsMade).toBe(6)
      expect(data.activeLoans[0].monthsRemaining).toBe(6)
      expect(data.totalLoanBalance).toBe(50631)

      vi.useRealTimers()
    })
  })

  describe('Emergency Fund and Household Settings', () => {
    it('uses household settings for emergency fund target when available', async () => {
      const mockGoals = [
        {
          id: 'goal1',
          name: 'Nouzový fond',
          targetAmount: 60000,
          currentAmount: 40000,
          isEmergency: true,
          order: 1,
        },
      ]

      const mockHouseholdSettings = {
        id: 'default',
        emergencyFundTarget: 90000,
        emergencyFundMonths: 3,
      }

      mockPrisma.category.findMany.mockResolvedValue([])
      mockPrisma.incomeSource.findMany.mockResolvedValue([])
      mockPrisma.investmentType.findMany.mockResolvedValue([])
      mockPrisma.activeLoan.findMany.mockResolvedValue([])
      mockPrisma.savingGoal.findMany.mockResolvedValue(mockGoals)
      mockPrisma.householdSettings.findUnique.mockResolvedValue(mockHouseholdSettings)
      mockPrisma.expense.aggregate.mockResolvedValue({ _sum: { amount: 0 } })
      mockPrisma.income.aggregate.mockResolvedValue({ _sum: { amount: 0 } })
      mockPrisma.investment.aggregate.mockResolvedValue({ _sum: { amount: 0 } })
      mockPrisma.expense.groupBy.mockResolvedValue([
        { year: 2025, month: 1, _sum: { amount: 30000 } },
      ])

      const request = new Request('http://localhost/api/summary?year=2025&month=1')
      const response = await GET(request)
      const data = await response.json()

      expect(data.savingGoals[0].targetAmount).toBe(90000) // From household settings
      expect(data.savingGoals[0].progress).toBeCloseTo(44.44, 1) // 40000 / 90000 * 100
      expect(data.savingGoals[0].recommendedTarget).toBe(90000) // 30000 * 3
      expect(data.savingGoals[0].emergencyFundMonths).toBe(3)
    })

    it('uses goal target when household settings not available', async () => {
      const mockGoals = [
        {
          id: 'goal1',
          name: 'Nouzový fond',
          targetAmount: 60000,
          currentAmount: 30000,
          isEmergency: true,
          order: 1,
        },
      ]

      mockPrisma.category.findMany.mockResolvedValue([])
      mockPrisma.incomeSource.findMany.mockResolvedValue([])
      mockPrisma.investmentType.findMany.mockResolvedValue([])
      mockPrisma.activeLoan.findMany.mockResolvedValue([])
      mockPrisma.savingGoal.findMany.mockResolvedValue(mockGoals)
      mockPrisma.householdSettings.findUnique.mockResolvedValue(null)
      mockPrisma.expense.aggregate.mockResolvedValue({ _sum: { amount: 0 } })
      mockPrisma.income.aggregate.mockResolvedValue({ _sum: { amount: 0 } })
      mockPrisma.investment.aggregate.mockResolvedValue({ _sum: { amount: 0 } })
      mockPrisma.expense.groupBy.mockResolvedValue([
        { year: 2025, month: 1, _sum: { amount: 25000 } },
      ])

      const request = new Request('http://localhost/api/summary?year=2025&month=1')
      const response = await GET(request)
      const data = await response.json()

      expect(data.savingGoals[0].targetAmount).toBe(60000) // Original goal target
      expect(data.savingGoals[0].progress).toBe(50) // 30000 / 60000 * 100
      expect(data.savingGoals[0].recommendedTarget).toBe(75000) // 25000 * 3 (default)
      expect(data.savingGoals[0].emergencyFundMonths).toBe(3)
    })

    it('does not add recommended target for non-emergency goals', async () => {
      const mockGoals = [
        {
          id: 'goal1',
          name: 'Dovolená',
          targetAmount: 50000,
          currentAmount: 25000,
          isEmergency: false,
          order: 1,
        },
      ]

      mockPrisma.category.findMany.mockResolvedValue([])
      mockPrisma.incomeSource.findMany.mockResolvedValue([])
      mockPrisma.investmentType.findMany.mockResolvedValue([])
      mockPrisma.activeLoan.findMany.mockResolvedValue([])
      mockPrisma.savingGoal.findMany.mockResolvedValue(mockGoals)
      mockPrisma.householdSettings.findUnique.mockResolvedValue(null)
      mockPrisma.expense.aggregate.mockResolvedValue({ _sum: { amount: 0 } })
      mockPrisma.income.aggregate.mockResolvedValue({ _sum: { amount: 0 } })
      mockPrisma.investment.aggregate.mockResolvedValue({ _sum: { amount: 0 } })
      mockPrisma.expense.groupBy.mockResolvedValue([])

      const request = new Request('http://localhost/api/summary?year=2025&month=1')
      const response = await GET(request)
      const data = await response.json()

      expect(data.savingGoals[0].recommendedTarget).toBeUndefined()
      expect(data.savingGoals[0].emergencyFundMonths).toBeUndefined()
    })
  })

  describe('Request Parameters', () => {
    it('defaults to current year and month when not provided', async () => {
      const now = new Date()
      const currentYear = now.getFullYear()
      const currentMonth = now.getMonth() + 1

      mockPrisma.category.findMany.mockResolvedValue([])
      mockPrisma.incomeSource.findMany.mockResolvedValue([])
      mockPrisma.investmentType.findMany.mockResolvedValue([])
      mockPrisma.activeLoan.findMany.mockResolvedValue([])
      mockPrisma.savingGoal.findMany.mockResolvedValue([])
      mockPrisma.householdSettings.findUnique.mockResolvedValue(null)
      mockPrisma.expense.aggregate.mockResolvedValue({ _sum: { amount: 0 } })
      mockPrisma.income.aggregate.mockResolvedValue({ _sum: { amount: 0 } })
      mockPrisma.investment.aggregate.mockResolvedValue({ _sum: { amount: 0 } })
      mockPrisma.expense.groupBy.mockResolvedValue([])

      const request = new Request('http://localhost/api/summary')
      const response = await GET(request)
      const data = await response.json()

      expect(data.year).toBe(currentYear)
      expect(data.month).toBe(currentMonth)
    })

    it('uses provided year and month parameters', async () => {
      mockPrisma.category.findMany.mockResolvedValue([])
      mockPrisma.incomeSource.findMany.mockResolvedValue([])
      mockPrisma.investmentType.findMany.mockResolvedValue([])
      mockPrisma.activeLoan.findMany.mockResolvedValue([])
      mockPrisma.savingGoal.findMany.mockResolvedValue([])
      mockPrisma.householdSettings.findUnique.mockResolvedValue(null)
      mockPrisma.expense.aggregate.mockResolvedValue({ _sum: { amount: 0 } })
      mockPrisma.income.aggregate.mockResolvedValue({ _sum: { amount: 0 } })
      mockPrisma.investment.aggregate.mockResolvedValue({ _sum: { amount: 0 } })
      mockPrisma.expense.groupBy.mockResolvedValue([])

      const request = new Request('http://localhost/api/summary?year=2024&month=12')
      const response = await GET(request)
      const data = await response.json()

      expect(data.year).toBe(2024)
      expect(data.month).toBe(12)
    })
  })

  describe('Data Structures', () => {
    it('returns properly formatted category data', async () => {
      const mockCategories = [
        {
          id: 'cat1',
          name: 'Potraviny',
          icon: '🛒',
          order: 1,
          expenses: [{ id: 'exp1', amount: 15000, year: 2025, month: 1, categoryId: 'cat1' }],
        },
        {
          id: 'cat2',
          name: 'Bydlení',
          icon: '🏠',
          order: 2,
          expenses: [],
        },
      ]

      mockPrisma.category.findMany.mockResolvedValue(mockCategories)
      mockPrisma.incomeSource.findMany.mockResolvedValue([])
      mockPrisma.investmentType.findMany.mockResolvedValue([])
      mockPrisma.activeLoan.findMany.mockResolvedValue([])
      mockPrisma.savingGoal.findMany.mockResolvedValue([])
      mockPrisma.householdSettings.findUnique.mockResolvedValue(null)
      mockPrisma.expense.aggregate.mockResolvedValue({ _sum: { amount: 0 } })
      mockPrisma.income.aggregate.mockResolvedValue({ _sum: { amount: 0 } })
      mockPrisma.investment.aggregate.mockResolvedValue({ _sum: { amount: 0 } })
      mockPrisma.expense.groupBy.mockResolvedValue([])

      const request = new Request('http://localhost/api/summary?year=2025&month=1')
      const response = await GET(request)
      const data = await response.json()

      expect(data.categories).toHaveLength(2)
      expect(data.categories[0]).toEqual({
        id: 'cat1',
        name: 'Potraviny',
        icon: '🛒',
        order: 1,
        expense: { id: 'exp1', amount: 15000, year: 2025, month: 1, categoryId: 'cat1' },
      })
      expect(data.categories[1]).toEqual({
        id: 'cat2',
        name: 'Bydlení',
        icon: '🏠',
        order: 2,
        expense: null,
      })
    })
  })

  describe('Error Handling', () => {
    it('returns 500 error when database query fails', async () => {
      mockPrisma.category.findMany.mockRejectedValue(new Error('DB connection error'))

      const request = new Request('http://localhost/api/summary?year=2025&month=1')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(500)
      expect(data.error).toBe('Failed to fetch summary')
    })

    it('handles null amounts in aggregates gracefully', async () => {
      mockPrisma.category.findMany.mockResolvedValue([])
      mockPrisma.incomeSource.findMany.mockResolvedValue([])
      mockPrisma.investmentType.findMany.mockResolvedValue([])
      mockPrisma.activeLoan.findMany.mockResolvedValue([])
      mockPrisma.savingGoal.findMany.mockResolvedValue([])
      mockPrisma.householdSettings.findUnique.mockResolvedValue(null)
      mockPrisma.expense.aggregate.mockResolvedValue({ _sum: { amount: null } })
      mockPrisma.income.aggregate.mockResolvedValue({ _sum: { amount: null } })
      mockPrisma.investment.aggregate.mockResolvedValue({ _sum: { amount: null } })
      mockPrisma.expense.groupBy.mockResolvedValue([])

      const request = new Request('http://localhost/api/summary?year=2025&month=1')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.previousMonth.totalExpenses).toBe(0)
      expect(data.previousMonth.totalIncome).toBe(0)
      expect(data.previousMonth.totalInvestments).toBe(0)
    })
  })
})
