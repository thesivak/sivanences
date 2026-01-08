// Bank statement parsing module
export * from './pdf-parser'
export * from './transaction-extractor'
export * from './ai-categorizer'

import { extractTextFromPDF } from './pdf-parser'
import { extractTransactions } from './transaction-extractor'
import { processTransactions } from './ai-categorizer'
import type { Category, IncomeSource, ParsedBankStatement, ParsedTransaction } from '@/lib/types'

/**
 * Main entry point: Parse a PDF bank statement and categorize transactions
 */
export async function parseBankStatement(
  pdfBuffer: Buffer,
  categories: Category[],
  incomeSources: IncomeSource[],
  userAccountNumbers: string[]
): Promise<ParsedBankStatement> {
  // Step 1: Extract text from PDF
  const pdfResult = await extractTextFromPDF(pdfBuffer)

  // Step 2: Extract metadata and raw transactions
  const extractionResult = extractTransactions(pdfResult.text)

  // Step 3: Categorize transactions with AI
  const parsedTransactions = await processTransactions(
    extractionResult.transactions,
    categories,
    incomeSources,
    userAccountNumbers
  )

  // Step 4: Calculate summary
  const summary = calculateSummary(parsedTransactions)

  return {
    metadata: extractionResult.metadata,
    transactions: parsedTransactions,
    summary,
  }
}

/**
 * Calculate transaction summary
 */
function calculateSummary(transactions: ParsedTransaction[]) {
  let totalExpenses = 0
  let totalIncome = 0
  let internalTransfers = 0
  let excludedCount = 0
  let duplicateCount = 0

  for (const tx of transactions) {
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

  return {
    totalTransactions: transactions.length,
    totalExpenses,
    totalIncome,
    internalTransfers,
    excludedCount,
    duplicateCount,
  }
}

/**
 * Detect potential duplicate transactions
 */
export function detectDuplicates(
  newTransactions: ParsedTransaction[],
  existingTransactions: ParsedTransaction[]
): ParsedTransaction[] {
  return newTransactions.map(tx => {
    // Check for exact duplicates (same date, amount, description)
    const duplicate = existingTransactions.find(
      existing =>
        existing.date === tx.date &&
        existing.amount === tx.amount &&
        existing.description === tx.description
    )

    if (duplicate) {
      return {
        ...tx,
        isDuplicate: true,
        duplicateReason: 'Shodná transakce již existuje (datum, částka, popis)',
      }
    }

    // Check for similar transactions (same date and amount)
    const similar = existingTransactions.find(
      existing =>
        existing.date === tx.date &&
        existing.amount === tx.amount
    )

    if (similar) {
      return {
        ...tx,
        isDuplicate: true,
        duplicateReason: `Podobná transakce: ${similar.description}`,
      }
    }

    return tx
  })
}

/**
 * Update transactions with user modifications
 */
export function updateTransactionCategories(
  transactions: ParsedTransaction[],
  updates: { id: string; categoryId?: string; incomeSourceId?: string; excluded?: boolean }[],
  categories: Category[],
  incomeSources: IncomeSource[]
): ParsedTransaction[] {
  const updateMap = new Map(updates.map(u => [u.id, u]))
  const categoryById = new Map(categories.map(c => [c.id, c]))
  const sourceById = new Map(incomeSources.map(s => [s.id, s]))

  return transactions.map(tx => {
    const update = updateMap.get(tx.id)
    if (!update) return tx

    const newTx = { ...tx }

    if (update.categoryId !== undefined) {
      const category = categoryById.get(update.categoryId)
      newTx.suggestedCategoryId = update.categoryId
      newTx.suggestedCategoryName = category?.name || null
    }

    if (update.incomeSourceId !== undefined) {
      const source = sourceById.get(update.incomeSourceId)
      newTx.suggestedIncomeSourceId = update.incomeSourceId
      newTx.suggestedIncomeSourceName = source?.name || null
    }

    if (update.excluded !== undefined) {
      newTx.excluded = update.excluded
    }

    return newTx
  })
}
