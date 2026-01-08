import { prisma } from '@/lib/db'
import {
  successResponse,
  errorResponse,
  notFoundResponse,
} from '@/lib/api'
import type { ParsedBankStatement } from '@/lib/types'

interface Params {
  params: Promise<{ id: string }>
}

/**
 * GET /api/bank-statements/[id] - Fetch a specific bank statement upload
 */
export async function GET(request: Request, { params }: Params) {
  try {
    const { id } = await params

    const upload = await prisma.bankStatementUpload.findUnique({
      where: { id },
    })

    if (!upload) {
      return notFoundResponse('Výpis nebyl nalezen')
    }

    return successResponse({
      ...upload,
      parsedData: upload.parsedData ? JSON.parse(upload.parsedData) as ParsedBankStatement : null,
    })
  } catch (error) {
    console.error('Error fetching bank statement:', error)
    return errorResponse('Failed to fetch bank statement')
  }
}

/**
 * PATCH /api/bank-statements/[id] - Update parsed transaction data
 * Used to update categories/sources before applying
 */
export async function PATCH(request: Request, { params }: Params) {
  try {
    const { id } = await params
    const body = await request.json()
    const { transactions, status } = body

    const upload = await prisma.bankStatementUpload.findUnique({
      where: { id },
    })

    if (!upload) {
      return notFoundResponse('Výpis nebyl nalezen')
    }

    const updateData: Record<string, unknown> = {}

    // Update transactions if provided
    if (transactions && upload.parsedData) {
      const parsedData: ParsedBankStatement = JSON.parse(upload.parsedData)

      // Create a map for quick lookup
      const txUpdates = new Map(
        transactions.map((t: { id: string; [key: string]: unknown }) => [t.id, t])
      )

      // Update transactions
      parsedData.transactions = parsedData.transactions.map(tx => {
        const update = txUpdates.get(tx.id) as {
          suggestedCategoryId?: string
          suggestedCategoryName?: string
          suggestedIncomeSourceId?: string
          suggestedIncomeSourceName?: string
          excluded?: boolean
          excludeReason?: string
        } | undefined

        if (!update) return tx

        return {
          ...tx,
          suggestedCategoryId: update.suggestedCategoryId ?? tx.suggestedCategoryId,
          suggestedCategoryName: update.suggestedCategoryName ?? tx.suggestedCategoryName,
          suggestedIncomeSourceId: update.suggestedIncomeSourceId ?? tx.suggestedIncomeSourceId,
          suggestedIncomeSourceName: update.suggestedIncomeSourceName ?? tx.suggestedIncomeSourceName,
          excluded: update.excluded ?? tx.excluded,
          excludeReason: update.excludeReason ?? tx.excludeReason,
        }
      })

      // Recalculate summary
      let totalExpenses = 0
      let totalIncome = 0
      let internalTransfers = 0
      let excludedCount = 0
      let duplicateCount = 0

      for (const tx of parsedData.transactions) {
        if (tx.excluded) {
          excludedCount++
          if (tx.isInternalTransfer) {
            internalTransfers++
          }
        }

        if (tx.isDuplicate) {
          duplicateCount++
        }

        if (!tx.excluded && !tx.isDuplicate) {
          if (tx.amount < 0) {
            totalExpenses += Math.abs(tx.amount)
          } else {
            totalIncome += tx.amount
          }
        }
      }

      parsedData.summary = {
        totalTransactions: parsedData.transactions.length,
        totalExpenses,
        totalIncome,
        internalTransfers,
        excludedCount,
        duplicateCount,
      }

      updateData.parsedData = JSON.stringify(parsedData)
    }

    // Update status if provided
    if (status) {
      updateData.status = status
    }

    const updated = await prisma.bankStatementUpload.update({
      where: { id },
      data: updateData,
    })

    return successResponse({
      ...updated,
      parsedData: updated.parsedData ? JSON.parse(updated.parsedData) as ParsedBankStatement : null,
    })
  } catch (error) {
    console.error('Error updating bank statement:', error)
    return errorResponse('Failed to update bank statement')
  }
}
