import { describe, it, expect, vi, beforeEach } from 'vitest'
import { GET, POST } from './route'
import { mockPrisma } from '@/lib/__mocks__/db'

vi.spyOn(console, 'error').mockImplementation(() => {})

describe('GET /api/settings/household', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns existing household settings', async () => {
    const mockSettings = {
      id: 'default',
      totalMembers: 4,
      dependentChildren: 2,
      adults: 2,
    }

    mockPrisma.householdSettings.findUnique.mockResolvedValue(mockSettings)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual(mockSettings)
    expect(mockPrisma.householdSettings.findUnique).toHaveBeenCalledWith({
      where: { id: 'default' },
    })
  })

  it('returns default settings when none exist', async () => {
    mockPrisma.householdSettings.findUnique.mockResolvedValue(null)

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual({
      id: 'default',
      totalMembers: 1,
      dependentChildren: 0,
      adults: 1,
      emergencyFundTarget: null,
      emergencyFundMonths: 3,
    })
  })

  it('returns 500 error when database query fails', async () => {
    mockPrisma.householdSettings.findUnique.mockRejectedValue(new Error('DB error'))

    const response = await GET()
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to fetch household settings')
  })
})

describe('POST /api/settings/household', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates or updates household settings successfully', async () => {
    const mockSettings = {
      id: 'default',
      totalMembers: 4,
      dependentChildren: 2,
      adults: 2,
    }

    mockPrisma.householdSettings.upsert.mockResolvedValue(mockSettings)
    mockPrisma.aIInsightsCache.deleteMany.mockResolvedValue({ count: 1 })

    const request = new Request('http://localhost/api/settings/household', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        totalMembers: 4,
        dependentChildren: 2,
        adults: 2,
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data).toEqual(mockSettings)
    expect(mockPrisma.aIInsightsCache.deleteMany).toHaveBeenCalled()
  })

  it('returns 400 when totalMembers is missing', async () => {
    const request = new Request('http://localhost/api/settings/household', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dependentChildren: 2,
        adults: 2,
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('Missing required fields')
  })

  it('returns 400 when adults is less than 1', async () => {
    const request = new Request('http://localhost/api/settings/household', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        totalMembers: 2,
        dependentChildren: 2,
        adults: 0,
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('Invalid values')
  })

  it('returns 400 when children + adults does not equal totalMembers', async () => {
    const request = new Request('http://localhost/api/settings/household', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        totalMembers: 5,
        dependentChildren: 2,
        adults: 2,
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(400)
    expect(data.error).toContain('must equal totalMembers')
  })

  it('returns 500 error when database operation fails', async () => {
    mockPrisma.householdSettings.upsert.mockRejectedValue(new Error('DB error'))

    const request = new Request('http://localhost/api/settings/household', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        totalMembers: 4,
        dependentChildren: 2,
        adults: 2,
      }),
    })

    const response = await POST(request)
    const data = await response.json()

    expect(response.status).toBe(500)
    expect(data.error).toBe('Failed to save household settings')
  })
})
