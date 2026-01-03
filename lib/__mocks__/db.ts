import { vi, type Mock } from 'vitest'

// Create mock functions for each Prisma model operation
function createModelMock() {
  return {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    createMany: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
    aggregate: vi.fn(),
    groupBy: vi.fn(),
  }
}

// Mock Prisma client matching the schema models
export const mockPrisma = {
  // Expense related
  category: createModelMock(),
  expense: createModelMock(),

  // Income related
  incomeSource: createModelMock(),
  income: createModelMock(),

  // Investment related
  investmentType: createModelMock(),
  investment: createModelMock(),

  // Saving goals
  savingGoal: createModelMock(),
  fundTransaction: createModelMock(),

  // Loans
  loanScenario: createModelMock(),
  activeLoan: createModelMock(),

  // AI & Settings
  householdSettings: createModelMock(),
  aIInsightsCache: createModelMock(),
  aIFeedback: createModelMock(),

  // Transaction support
  $transaction: vi.fn((callback) => callback(mockPrisma)),
  $connect: vi.fn(),
  $disconnect: vi.fn(),
}

// Export as prisma to match the real db.ts export
export const prisma = mockPrisma

// Helper to reset all mocks
export function resetPrismaMocks() {
  Object.values(mockPrisma).forEach((model) => {
    if (typeof model === 'object' && model !== null) {
      Object.values(model).forEach((fn) => {
        if (typeof fn === 'function' && 'mockReset' in fn) {
          ;(fn as Mock).mockReset()
        }
      })
    } else if (typeof model === 'function' && 'mockReset' in model) {
      ;(model as Mock).mockReset()
    }
  })
}

// Helper to setup common mock responses
export function setupMockResponses(responses: {
  [model: string]: {
    [method: string]: unknown
  }
}) {
  Object.entries(responses).forEach(([model, methods]) => {
    Object.entries(methods).forEach(([method, response]) => {
      const modelMock = mockPrisma[model as keyof typeof mockPrisma]
      if (modelMock && typeof modelMock === 'object' && method in modelMock) {
        const methodMock = modelMock[method as keyof typeof modelMock]
        if (typeof methodMock === 'function' && 'mockResolvedValue' in methodMock) {
          ;(methodMock as Mock).mockResolvedValue(response)
        }
      }
    })
  })
}
