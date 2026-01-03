import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST, PATCH, DELETE } from './route'
import { mockPrisma } from '@/lib/__mocks__/db'

// Mock console.error to prevent noise
vi.spyOn(console, 'error').mockImplementation(() => {})

// Mock the loan calculation library
vi.mock('@/lib/loan', () => ({
  calculateLoan: vi.fn(),
}))

// Mock the API utilities
vi.mock('@/lib/api', () => ({
  invalidateInsightsCache: vi.fn(),
}))

import { calculateLoan } from '@/lib/loan'
import { invalidateInsightsCache } from '@/lib/api'

describe('GET /api/loans/active', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calculates months elapsed and remaining balance correctly', async () => {
    const now = new Date('2025-07-01')
    vi.setSystemTime(now)

    // Mock loan that started 6 months ago
    const startDate = new Date('2025-01-01')
    const mockLoans = [
      {
        id: 'loan1',
        name: 'Auto Loan',
        type: 'CONSUMER',
        originalAmount: 300000,
        remainingAmount: 300000,
        interestRate: 5.9, // Stored as percentage
        monthlyPayment: 8500,
        startDate,
        termMonths: 36,
        createdAt: startDate,
        updatedAt: startDate,
      },
    ]

    // Mock amortization schedule - after 6 payments, balance should be reduced
    const mockAmortization = [
      { month: 1, payment: 8500, principal: 7025, interest: 1475, balance: 292975 },
      { month: 2, payment: 8500, principal: 7060, interest: 1440, balance: 285915 },
      { month: 3, payment: 8500, principal: 7095, interest: 1405, balance: 278820 },
      { month: 4, payment: 8500, principal: 7130, interest: 1370, balance: 271690 },
      { month: 5, payment: 8500, principal: 7165, interest: 1335, balance: 264525 },
      { month: 6, payment: 8500, principal: 7200, interest: 1300, balance: 257325 },
    ]

    vi.mocked(calculateLoan).mockReturnValue({
      monthlyPayment: 8500,
      totalPayment: 306000,
      totalInterest: 6000,
      amortization: mockAmortization,
    })

    mockPrisma.activeLoan.findMany.mockResolvedValue(mockLoans)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveLength(1)

    // Verify months elapsed calculation: (2025 - 2025) * 12 + (6 - 0) = 6 months
    expect(data[0].paymentsMade).toBe(6)
    expect(data[0].monthsRemaining).toBe(30)

    // Verify interest rate conversion (5.9 / 100 = 0.059)
    expect(calculateLoan).toHaveBeenCalledWith({
      amount: 300000,
      annualRate: expect.closeTo(0.059, 10),
      termMonths: 36,
    })

    // Verify remaining balance lookup from amortization schedule (index 5 = 6th payment)
    expect(data[0].calculatedBalance).toBe(257325)

    // Verify paid-off percentage: ((300000 - 257325) / 300000) * 100 = 14.225%
    expect(data[0].paidOffPercent).toBeCloseTo(14.225, 2)

    vi.useRealTimers()
  })

  it('handles loan just started (0 payments made)', async () => {
    const now = new Date('2025-01-15')
    vi.setSystemTime(now)

    const startDate = new Date('2025-01-15')
    const mockLoans = [
      {
        id: 'loan1',
        name: 'New Loan',
        type: 'MORTGAGE',
        originalAmount: 3000000,
        remainingAmount: 3000000,
        interestRate: 4.9,
        monthlyPayment: 16000,
        startDate,
        termMonths: 360,
        createdAt: startDate,
        updatedAt: startDate,
      },
    ]

    mockPrisma.activeLoan.findMany.mockResolvedValue(mockLoans)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data[0].paymentsMade).toBe(0)
    expect(data[0].monthsRemaining).toBe(360)
    expect(data[0].calculatedBalance).toBe(3000000) // Full original amount
    expect(data[0].paidOffPercent).toBe(0)

    // calculateLoan should not be called when no payments made
    expect(calculateLoan).not.toHaveBeenCalled()

    vi.useRealTimers()
  })

  it('handles fully paid-off loan', async () => {
    const now = new Date('2028-01-01')
    vi.setSystemTime(now)

    // Loan started 3 years ago with 36-month term
    const startDate = new Date('2025-01-01')
    const mockLoans = [
      {
        id: 'loan1',
        name: 'Paid Off Loan',
        type: 'CONSUMER',
        originalAmount: 300000,
        remainingAmount: 0,
        interestRate: 5.9,
        monthlyPayment: 8500,
        startDate,
        termMonths: 36,
        createdAt: startDate,
        updatedAt: startDate,
      },
    ]

    mockPrisma.activeLoan.findMany.mockResolvedValue(mockLoans)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data[0].paymentsMade).toBe(36) // All payments made
    expect(data[0].monthsRemaining).toBe(0)
    expect(data[0].calculatedBalance).toBe(0)
    expect(data[0].paidOffPercent).toBe(100)

    vi.useRealTimers()
  })

  it('handles loan with 1 payment made', async () => {
    const now = new Date('2025-02-01')
    vi.setSystemTime(now)

    const startDate = new Date('2025-01-01')
    const mockLoans = [
      {
        id: 'loan1',
        name: 'Almost New Loan',
        type: 'CONSUMER',
        originalAmount: 100000,
        remainingAmount: 100000,
        interestRate: 8.9,
        monthlyPayment: 3200,
        startDate,
        termMonths: 36,
        createdAt: startDate,
        updatedAt: startDate,
      },
    ]

    const mockAmortization = [
      { month: 1, payment: 3200, principal: 2459, interest: 741, balance: 97541 },
    ]

    vi.mocked(calculateLoan).mockReturnValue({
      monthlyPayment: 3200,
      totalPayment: 115200,
      totalInterest: 15200,
      amortization: mockAmortization,
    })

    mockPrisma.activeLoan.findMany.mockResolvedValue(mockLoans)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data[0].paymentsMade).toBe(1)
    expect(data[0].monthsRemaining).toBe(35)
    expect(data[0].calculatedBalance).toBe(97541)
    expect(data[0].paidOffPercent).toBeCloseTo(2.459, 2)

    vi.useRealTimers()
  })

  it('calculates months elapsed correctly across year boundaries', async () => {
    const now = new Date('2026-03-01')
    vi.setSystemTime(now)

    // Loan started in November 2025
    const startDate = new Date('2025-11-01')
    const mockLoans = [
      {
        id: 'loan1',
        name: 'Cross-year Loan',
        type: 'CONSUMER',
        originalAmount: 200000,
        remainingAmount: 200000,
        interestRate: 7.5,
        monthlyPayment: 6000,
        startDate,
        termMonths: 36,
        createdAt: startDate,
        updatedAt: startDate,
      },
    ]

    const mockAmortization = [
      { month: 1, balance: 195250 },
      { month: 2, balance: 190470 },
      { month: 3, balance: 185660 },
      { month: 4, balance: 180820 },
    ]

    vi.mocked(calculateLoan).mockReturnValue({
      monthlyPayment: 6000,
      totalPayment: 216000,
      totalInterest: 16000,
      amortization: mockAmortization as any,
    })

    mockPrisma.activeLoan.findMany.mockResolvedValue(mockLoans)

    const response = await GET()
    const data = await response.json()

    // Months elapsed: (2026 - 2025) * 12 + (3 - 11) = 12 + (-8) = 4 months
    expect(data[0].paymentsMade).toBe(4)
    expect(data[0].monthsRemaining).toBe(32)
    expect(data[0].calculatedBalance).toBe(180820)

    vi.useRealTimers()
  })

  it('returns multiple loans with correct calculations', async () => {
    const now = new Date('2025-06-01')
    vi.setSystemTime(now)

    const mockLoans = [
      {
        id: 'loan1',
        name: 'Loan 1',
        type: 'CONSUMER',
        originalAmount: 100000,
        remainingAmount: 100000,
        interestRate: 5.0,
        monthlyPayment: 3000,
        startDate: new Date('2025-01-01'), // 5 months ago
        termMonths: 36,
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-01-01'),
      },
      {
        id: 'loan2',
        name: 'Loan 2',
        type: 'MORTGAGE',
        originalAmount: 2000000,
        remainingAmount: 2000000,
        interestRate: 4.5,
        monthlyPayment: 10000,
        startDate: new Date('2025-03-01'), // 3 months ago
        termMonths: 240,
        createdAt: new Date('2025-03-01'),
        updatedAt: new Date('2025-03-01'),
      },
    ]

    vi.mocked(calculateLoan)
      .mockReturnValueOnce({
        monthlyPayment: 3000,
        totalPayment: 108000,
        totalInterest: 8000,
        amortization: [
          { month: 1, balance: 97417 },
          { month: 2, balance: 94823 },
          { month: 3, balance: 92219 },
          { month: 4, balance: 89604 },
          { month: 5, balance: 86978 },
        ] as any,
      })
      .mockReturnValueOnce({
        monthlyPayment: 10000,
        totalPayment: 2400000,
        totalInterest: 400000,
        amortization: [
          { month: 1, balance: 1997500 },
          { month: 2, balance: 1994990 },
          { month: 3, balance: 1992470 },
        ] as any,
      })

    mockPrisma.activeLoan.findMany.mockResolvedValue(mockLoans)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveLength(2)

    // First loan - 5 payments made
    expect(data[0].paymentsMade).toBe(5)
    expect(data[0].calculatedBalance).toBe(86978)
    expect(data[0].paidOffPercent).toBeCloseTo(13.022, 2)

    // Second loan - 3 payments made
    expect(data[1].paymentsMade).toBe(3)
    expect(data[1].calculatedBalance).toBe(1992470)
    expect(data[1].paidOffPercent).toBeCloseTo(0.3765, 2)

    vi.useRealTimers()
  })

  it('returns empty array when no active loans exist', async () => {
    mockPrisma.activeLoan.findMany.mockResolvedValue([])

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual([])
  })

  it('returns 500 error when database query fails', async () => {
    mockPrisma.activeLoan.findMany.mockRejectedValue(new Error('DB error'))

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to fetch loans')
  })

  it('handles missing amortization data gracefully', async () => {
    const now = new Date('2025-02-01')
    vi.setSystemTime(now)

    const startDate = new Date('2025-01-01')
    const mockLoans = [
      {
        id: 'loan1',
        name: 'Loan',
        type: 'CONSUMER',
        originalAmount: 100000,
        remainingAmount: 100000,
        interestRate: 5.0,
        monthlyPayment: 3000,
        startDate,
        termMonths: 36,
        createdAt: startDate,
        updatedAt: startDate,
      },
    ]

    // Return amortization with missing entries
    vi.mocked(calculateLoan).mockReturnValue({
      monthlyPayment: 3000,
      totalPayment: 108000,
      totalInterest: 8000,
      amortization: [],
    })

    mockPrisma.activeLoan.findMany.mockResolvedValue(mockLoans)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data[0].calculatedBalance).toBe(0) // Falls back to 0 when amortization is missing
    expect(data[0].paidOffPercent).toBe(100)

    vi.useRealTimers()
  })
})

describe('POST /api/loans/active', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a new active loan successfully', async () => {
    const now = new Date()
    const mockLoan = {
      id: 'loan1',
      name: 'Car Loan',
      type: 'CONSUMER',
      originalAmount: 300000,
      remainingAmount: 300000,
      interestRate: 5.9,
      monthlyPayment: 8500,
      startDate: new Date('2025-01-01'),
      termMonths: 36,
      createdAt: now,
      updatedAt: now,
    }

    mockPrisma.activeLoan.create.mockResolvedValue(mockLoan)

    const request = new Request('http://localhost/api/loans/active', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Car Loan',
        type: 'CONSUMER',
        originalAmount: 300000,
        interestRate: 5.9,
        monthlyPayment: 8500,
        startDate: '2025-01-01',
        termMonths: 36,
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    // JSON serialization converts Date objects to strings
    expect(data).toEqual({
      ...mockLoan,
      startDate: mockLoan.startDate.toISOString(),
      createdAt: mockLoan.createdAt.toISOString(),
      updatedAt: mockLoan.updatedAt.toISOString(),
    })
    expect(mockPrisma.activeLoan.create).toHaveBeenCalledWith({
      data: {
        name: 'Car Loan',
        type: 'CONSUMER',
        originalAmount: 300000,
        remainingAmount: 300000,
        interestRate: 5.9,
        monthlyPayment: 8500,
        startDate: new Date('2025-01-01'),
        termMonths: 36,
      },
    })
    expect(invalidateInsightsCache).toHaveBeenCalled()
  })

  it('defaults type to CONSUMER when not provided', async () => {
    mockPrisma.activeLoan.create.mockResolvedValue({
      id: 'loan1',
      type: 'CONSUMER',
    } as any)

    const request = new Request('http://localhost/api/loans/active', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Loan',
        originalAmount: 100000,
        interestRate: 5.0,
        monthlyPayment: 3000,
        startDate: '2025-01-01',
        termMonths: 36,
      }),
    })

    await POST(request)

    expect(mockPrisma.activeLoan.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        type: 'CONSUMER',
      }),
    })
  })

  it('returns 400 when name is missing', async () => {
    const request = new Request('http://localhost/api/loans/active', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        originalAmount: 100000,
        interestRate: 5.0,
        monthlyPayment: 3000,
        startDate: '2025-01-01',
        termMonths: 36,
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Missing required fields')
  })

  it('returns 400 when originalAmount is missing', async () => {
    const request = new Request('http://localhost/api/loans/active', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Loan',
        interestRate: 5.0,
        monthlyPayment: 3000,
        startDate: '2025-01-01',
        termMonths: 36,
      }),
    })

    const response = await POST(request)

    expect(response.status).toBe(400)
  })

  it('returns 400 when interestRate is missing', async () => {
    const request = new Request('http://localhost/api/loans/active', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Loan',
        originalAmount: 100000,
        monthlyPayment: 3000,
        startDate: '2025-01-01',
        termMonths: 36,
      }),
    })

    const response = await POST(request)

    expect(response.status).toBe(400)
  })

  it('returns 400 when monthlyPayment is missing', async () => {
    const request = new Request('http://localhost/api/loans/active', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Loan',
        originalAmount: 100000,
        interestRate: 5.0,
        startDate: '2025-01-01',
        termMonths: 36,
      }),
    })

    const response = await POST(request)

    expect(response.status).toBe(400)
  })

  it('returns 400 when startDate is missing', async () => {
    const request = new Request('http://localhost/api/loans/active', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Loan',
        originalAmount: 100000,
        interestRate: 5.0,
        monthlyPayment: 3000,
        termMonths: 36,
      }),
    })

    const response = await POST(request)

    expect(response.status).toBe(400)
  })

  it('returns 400 when termMonths is missing', async () => {
    const request = new Request('http://localhost/api/loans/active', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Loan',
        originalAmount: 100000,
        interestRate: 5.0,
        monthlyPayment: 3000,
        startDate: '2025-01-01',
      }),
    })

    const response = await POST(request)

    expect(response.status).toBe(400)
  })

  it('returns 500 error when database operation fails', async () => {
    mockPrisma.activeLoan.create.mockRejectedValue(new Error('DB error'))

    const request = new Request('http://localhost/api/loans/active', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Loan',
        originalAmount: 100000,
        interestRate: 5.0,
        monthlyPayment: 3000,
        startDate: '2025-01-01',
        termMonths: 36,
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to create loan')
  })
})

describe('PATCH /api/loans/active', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updates active loan successfully', async () => {
    const mockUpdatedLoan = {
      id: 'loan1',
      name: 'Updated Loan Name',
      type: 'CONSUMER',
      originalAmount: 300000,
      interestRate: 5.9,
      monthlyPayment: 8500,
    }

    mockPrisma.activeLoan.update.mockResolvedValue(mockUpdatedLoan as any)

    const request = new Request('http://localhost/api/loans/active', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'loan1',
        name: 'Updated Loan Name',
      }),
    })

    const response = await PATCH(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual(mockUpdatedLoan)
    expect(mockPrisma.activeLoan.update).toHaveBeenCalledWith({
      where: { id: 'loan1' },
      data: { name: 'Updated Loan Name' },
    })
    expect(invalidateInsightsCache).toHaveBeenCalled()
  })

  it('converts startDate to Date object when updating', async () => {
    mockPrisma.activeLoan.update.mockResolvedValue({ id: 'loan1' } as any)

    const request = new Request('http://localhost/api/loans/active', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'loan1',
        startDate: '2025-02-01',
      }),
    })

    await PATCH(request)

    expect(mockPrisma.activeLoan.update).toHaveBeenCalledWith({
      where: { id: 'loan1' },
      data: { startDate: new Date('2025-02-01') },
    })
  })

  it('updates multiple fields at once', async () => {
    mockPrisma.activeLoan.update.mockResolvedValue({ id: 'loan1' } as any)

    const request = new Request('http://localhost/api/loans/active', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'loan1',
        name: 'New Name',
        monthlyPayment: 9000,
        interestRate: 6.5,
      }),
    })

    await PATCH(request)

    expect(mockPrisma.activeLoan.update).toHaveBeenCalledWith({
      where: { id: 'loan1' },
      data: {
        name: 'New Name',
        monthlyPayment: 9000,
        interestRate: 6.5,
      },
    })
  })

  it('returns 400 when id is missing', async () => {
    const request = new Request('http://localhost/api/loans/active', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Updated Name',
      }),
    })

    const response = await PATCH(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('ID is required')
  })

  it('returns 500 error when database operation fails', async () => {
    mockPrisma.activeLoan.update.mockRejectedValue(new Error('Not found'))

    const request = new Request('http://localhost/api/loans/active', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'nonexistent',
        name: 'Test',
      }),
    })

    const response = await PATCH(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to update loan')
  })
})

describe('DELETE /api/loans/active', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deletes active loan successfully', async () => {
    mockPrisma.activeLoan.delete.mockResolvedValue({ id: 'loan1' } as any)

    const request = new Request('http://localhost/api/loans/active?id=loan1', {
      method: 'DELETE',
    })

    const response = await DELETE(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(mockPrisma.activeLoan.delete).toHaveBeenCalledWith({
      where: { id: 'loan1' },
    })
    expect(invalidateInsightsCache).toHaveBeenCalled()
  })

  it('returns 400 when id is missing', async () => {
    const request = new Request('http://localhost/api/loans/active', {
      method: 'DELETE',
    })

    const response = await DELETE(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('ID is required')
  })

  it('returns 500 error when database operation fails', async () => {
    mockPrisma.activeLoan.delete.mockRejectedValue(new Error('Not found'))

    const request = new Request('http://localhost/api/loans/active?id=nonexistent', {
      method: 'DELETE',
    })

    const response = await DELETE(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to delete loan')
  })
})
