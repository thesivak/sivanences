import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST, PATCH, DELETE } from './route'
import { mockPrisma } from '@/lib/__mocks__/db'

// Mock console.error to prevent noise
vi.spyOn(console, 'error').mockImplementation(() => {})

describe('GET /api/loans', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns all loan scenarios ordered by createdAt', async () => {
    const mockScenarios = [
      {
        id: 'loan1',
        name: 'Hypoteka 1',
        amount: 3000000,
        interestRate: 0.049,
        termMonths: 360,
        type: 'MORTGAGE',
        monthlyPayment: 16000,
        totalPayment: 5760000,
        totalInterest: 2760000,
        createdAt: new Date('2025-01-15'),
      },
      {
        id: 'loan2',
        name: 'Spotrebitelsky uver',
        amount: 100000,
        interestRate: 0.089,
        termMonths: 36,
        type: 'CONSUMER',
        monthlyPayment: 3200,
        totalPayment: 115200,
        totalInterest: 15200,
        createdAt: new Date('2025-01-10'),
      },
    ]

    mockPrisma.loanScenario.findMany.mockResolvedValue(mockScenarios)

    const request = new Request('http://localhost/api/loans')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toHaveLength(2)
    expect(mockPrisma.loanScenario.findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: 'desc' },
    })
  })

  it('returns empty array when no scenarios exist', async () => {
    mockPrisma.loanScenario.findMany.mockResolvedValue([])

    const request = new Request('http://localhost/api/loans')
    const response = await GET(request)
    const data = await response.json()

    expect(data).toEqual([])
  })

  it('returns 500 error when database query fails', async () => {
    mockPrisma.loanScenario.findMany.mockRejectedValue(new Error('DB error'))

    const request = new Request('http://localhost/api/loans')
    const response = await GET(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to fetch scenarios')
  })
})

describe('POST /api/loans', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a new loan scenario successfully', async () => {
    const mockScenario = {
      id: 'loan1',
      name: 'Hypoteka - 15. 1. 2025',
      amount: 3000000,
      interestRate: 0.049,
      termMonths: 360,
      type: 'MORTGAGE',
      monthlyPayment: 16000,
      totalPayment: 5760000,
      totalInterest: 2760000,
    }

    mockPrisma.loanScenario.create.mockResolvedValue(mockScenario)

    const request = new Request('http://localhost/api/loans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: 3000000,
        interestRate: 0.049,
        termMonths: 360,
        type: 'MORTGAGE',
        monthlyPayment: 16000,
        totalPayment: 5760000,
        totalInterest: 2760000,
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual(mockScenario)
  })

  it('uses custom name when provided', async () => {
    mockPrisma.loanScenario.create.mockResolvedValue({ id: 'loan1' })

    const request = new Request('http://localhost/api/loans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Moje hypoteka',
        amount: 3000000,
        interestRate: 0.049,
        termMonths: 360,
        type: 'MORTGAGE',
        monthlyPayment: 16000,
        totalPayment: 5760000,
        totalInterest: 2760000,
      }),
    })

    await POST(request)

    expect(mockPrisma.loanScenario.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        name: 'Moje hypoteka',
      }),
    })
  })

  it('saves verdict data when provided', async () => {
    mockPrisma.loanScenario.create.mockResolvedValue({ id: 'loan1' })

    const request = new Request('http://localhost/api/loans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: 3000000,
        interestRate: 0.049,
        termMonths: 360,
        type: 'MORTGAGE',
        monthlyPayment: 16000,
        totalPayment: 5760000,
        totalInterest: 2760000,
        verdictStatus: 'AVAILABLE',
        verdictLabel: 'Dostupne',
        verdictReason: 'Splatka je komfortni',
        budgetImpact: 25,
        budgetIncome: 60000,
        budgetExpenses: 35000,
      }),
    })

    await POST(request)

    expect(mockPrisma.loanScenario.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        verdictStatus: 'AVAILABLE',
        verdictLabel: 'Dostupne',
        verdictReason: 'Splatka je komfortni',
        budgetImpact: 25,
        budgetIncome: 60000,
        budgetExpenses: 35000,
      }),
    })
  })

  it('returns 400 when amount is missing', async () => {
    const request = new Request('http://localhost/api/loans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        interestRate: 0.049,
        termMonths: 360,
        type: 'MORTGAGE',
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('Missing required fields')
  })

  it('returns 400 when type is missing', async () => {
    const request = new Request('http://localhost/api/loans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: 3000000,
        interestRate: 0.049,
        termMonths: 360,
      }),
    })

    const response = await POST(request)

    expect(response.status).toBe(400)
  })

  it('returns 500 error when database operation fails', async () => {
    mockPrisma.loanScenario.create.mockRejectedValue(new Error('DB error'))

    const request = new Request('http://localhost/api/loans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: 3000000,
        interestRate: 0.049,
        termMonths: 360,
        type: 'MORTGAGE',
        monthlyPayment: 16000,
        totalPayment: 5760000,
        totalInterest: 2760000,
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to save scenario')
  })
})

describe('PATCH /api/loans', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updates scenario name successfully', async () => {
    const mockScenario = {
      id: 'loan1',
      name: 'Novy nazev',
    }

    mockPrisma.loanScenario.update.mockResolvedValue(mockScenario)

    const request = new Request('http://localhost/api/loans', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: 'loan1',
        name: 'Novy nazev',
      }),
    })

    const response = await PATCH(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual(mockScenario)
    expect(mockPrisma.loanScenario.update).toHaveBeenCalledWith({
      where: { id: 'loan1' },
      data: { name: 'Novy nazev' },
    })
  })

  it('returns 400 when id is missing', async () => {
    const request = new Request('http://localhost/api/loans', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Novy nazev',
      }),
    })

    const response = await PATCH(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('ID is required')
  })

  it('returns 500 error when database operation fails', async () => {
    mockPrisma.loanScenario.update.mockRejectedValue(new Error('Not found'))

    const request = new Request('http://localhost/api/loans', {
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
    expect(data.error).toBe('Failed to update scenario')
  })
})

describe('DELETE /api/loans', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('deletes scenario successfully', async () => {
    mockPrisma.loanScenario.delete.mockResolvedValue({ id: 'loan1' })

    const request = new Request('http://localhost/api/loans?id=loan1', {
      method: 'DELETE',
    })

    const response = await DELETE(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
    expect(mockPrisma.loanScenario.delete).toHaveBeenCalledWith({
      where: { id: 'loan1' },
    })
  })

  it('returns 400 when id is missing', async () => {
    const request = new Request('http://localhost/api/loans', {
      method: 'DELETE',
    })

    const response = await DELETE(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toBe('ID is required')
  })

  it('returns 500 error when database operation fails', async () => {
    mockPrisma.loanScenario.delete.mockRejectedValue(new Error('Not found'))

    const request = new Request('http://localhost/api/loans?id=nonexistent', {
      method: 'DELETE',
    })

    const response = await DELETE(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to delete scenario')
  })
})
