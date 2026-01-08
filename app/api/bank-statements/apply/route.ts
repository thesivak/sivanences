import { prisma } from '@/lib/db'
import {
  successResponse,
  errorResponse,
  badRequestResponse,
  invalidateInsightsCache,
} from '@/lib/api'
import type { ParsedBankStatement, ApplyTransactionsResult } from '@/lib/types'

interface ApplyRequest {
  uploadId: string
  year: number
  month: number
  transactions: {
    id: string
    categoryId?: string
    incomeSourceId?: string
    excluded: boolean
  }[]
}

/**
 * POST /api/bank-statements/apply - Apply parsed transactions to expenses/income
 * This replaces existing data for the month with the imported data
 */
export async function POST(request: Request) {
  try {
    const body: ApplyRequest = await request.json()
    const { uploadId, year, month, transactions } = body

    if (!uploadId || !year || !month || !transactions) {
      return badRequestResponse('Chybí povinná pole: uploadId, year, month, transactions')
    }

    // Fetch the upload
    const upload = await prisma.bankStatementUpload.findUnique({
      where: { id: uploadId },
    })

    if (!upload) {
      return badRequestResponse('Výpis nebyl nalezen')
    }

    if (!upload.parsedData) {
      return badRequestResponse('Výpis nemá žádná data k aplikování')
    }

    const parsedData: ParsedBankStatement = JSON.parse(upload.parsedData)

    // Build a map of transaction updates
    const transactionUpdates = new Map(
      transactions.map(t => [t.id, t])
    )

    // Aggregate transactions by category and income source
    const expensesByCategory = new Map<string, number>()
    const incomeBySource = new Map<string, number>()
    const categoriesAffected = new Set<string>()
    const incomeSourcesAffected = new Set<string>()

    for (const tx of parsedData.transactions) {
      const update = transactionUpdates.get(tx.id)

      // Skip excluded transactions
      if (update?.excluded || tx.excluded) {
        continue
      }

      // Get the category/source from update or original suggestion
      const categoryId = update?.categoryId || tx.suggestedCategoryId
      const incomeSourceId = update?.incomeSourceId || tx.suggestedIncomeSourceId

      // Aggregate expenses (negative amounts)
      if (tx.amount < 0 && categoryId) {
        const current = expensesByCategory.get(categoryId) || 0
        expensesByCategory.set(categoryId, current + Math.abs(tx.amount))
        categoriesAffected.add(categoryId)
      }

      // Aggregate income (positive amounts)
      if (tx.amount > 0 && incomeSourceId) {
        const current = incomeBySource.get(incomeSourceId) || 0
        incomeBySource.set(incomeSourceId, current + tx.amount)
        incomeSourcesAffected.add(incomeSourceId)
      }
    }

    // Delete existing expenses for the month (replace mode)
    await prisma.expense.deleteMany({
      where: { year, month },
    })

    // Delete existing income for the month (replace mode)
    await prisma.income.deleteMany({
      where: { year, month },
    })

    // Create new expense records
    const expensePromises = Array.from(expensesByCategory.entries()).map(([categoryId, amount]) =>
      prisma.expense.create({
        data: {
          categoryId,
          year,
          month,
          amount,
        },
      })
    )

    // Create new income records
    const incomePromises = Array.from(incomeBySource.entries()).map(([sourceId, amount]) =>
      prisma.income.create({
        data: {
          sourceId,
          year,
          month,
          amount,
        },
      })
    )

    // Execute all creates
    await Promise.all([...expensePromises, ...incomePromises])

    // Update the upload status
    await prisma.bankStatementUpload.update({
      where: { id: uploadId },
      data: {
        status: 'applied',
        appliedAt: new Date(),
      },
    })

    // Invalidate AI insights cache
    await invalidateInsightsCache()

    const result: ApplyTransactionsResult = {
      success: true,
      expensesUpdated: expensesByCategory.size,
      incomeUpdated: incomeBySource.size,
      categoriesAffected: Array.from(categoriesAffected),
      incomeSourcesAffected: Array.from(incomeSourcesAffected),
    }

    return successResponse(result)
  } catch (error) {
    console.error('Error applying transactions:', error)
    return errorResponse(`Chyba při aplikování transakcí: ${error instanceof Error ? error.message : 'Neznámá chyba'}`)
  }
}
