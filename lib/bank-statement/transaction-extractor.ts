import {
  parseCzechDate,
  parseCzechAmount,
  parseAccountNumber,
  detectBankName,
  detectAccountType,
  extractStatementPeriod,
  extractStatementNumber,
  extractOwnerName,
  extractAccountSummary,
} from './pdf-parser'
import type { BankStatementMetadata, TransactionType } from '@/lib/types'

export interface RawTransaction {
  date: string              // ISO date
  description: string       // Combined description
  amount: number           // Negative for expenses, positive for income
  counterAccountNumber: string | null
  counterAccountName: string | null
  variableSymbol: string | null
  constantSymbol: string | null
  specificSymbol: string | null
  originalText: string      // Raw text for debugging
}

export interface ExtractionResult {
  metadata: BankStatementMetadata
  transactions: RawTransaction[]
  rawText: string
}

/**
 * Extract metadata from bank statement text
 */
export function extractMetadata(text: string): BankStatementMetadata {
  const bankName = detectBankName(text)
  const accountType = detectAccountType(text)
  const period = extractStatementPeriod(text)
  const statementNumber = extractStatementNumber(text)
  const ownerName = extractOwnerName(text)
  const summary = extractAccountSummary(text)

  // Extract account number from header
  const accountMatch = text.match(/Číslo účtu\/kód banky[:\s]*(\d+\/\d+)/)
  const accountNumber = accountMatch ? accountMatch[1] : ''

  return {
    bankName,
    accountNumber,
    accountType,
    periodStart: period?.start || '',
    periodEnd: period?.end || '',
    statementNumber,
    ownerName,
    currency: 'CZK',
    startingBalance: summary.startingBalance || 0,
    endingBalance: summary.endingBalance || 0,
    totalCredits: summary.totalCredits || 0,
    totalDebits: summary.totalDebits || 0,
  }
}

/**
 * Extract transactions from Česká spořitelna regular account statement
 */
function extractCeskaSporitelnaCheckingTransactions(text: string): RawTransaction[] {
  const transactions: RawTransaction[] = []

  // Split text into lines for processing
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)

  // Find the transaction section
  let inTransactionSection = false
  let currentTransaction: Partial<RawTransaction> | null = null
  let currentLines: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Detect start of transactions section
    if (line.includes('PŘEHLED POHYBŮ NA ÚČTU')) {
      inTransactionSection = true
      continue
    }

    // Skip header rows
    if (line.includes('Zaúčtováno') || line.includes('Provedeno')) {
      continue
    }

    if (!inTransactionSection) continue

    // Stop at footer
    if (line.includes('Pokračování na další straně') || line.includes('Česká spořitelna, a.s.')) {
      // Process last transaction if exists
      if (currentLines.length > 0) {
        const tx = parseTransactionBlock(currentLines)
        if (tx) transactions.push(tx)
      }
      currentLines = []
      continue
    }

    // Detect new transaction by date pattern at start of line
    const dateMatch = line.match(/^(\d{2}\.\d{2}\.\d{4})/)
    if (dateMatch) {
      // Save previous transaction
      if (currentLines.length > 0) {
        const tx = parseTransactionBlock(currentLines)
        if (tx) transactions.push(tx)
      }
      currentLines = [line]
    } else if (currentLines.length > 0) {
      // Append to current transaction
      currentLines.push(line)
    }
  }

  // Process last transaction
  if (currentLines.length > 0) {
    const tx = parseTransactionBlock(currentLines)
    if (tx) transactions.push(tx)
  }

  return transactions
}

/**
 * Parse a block of lines into a transaction
 */
function parseTransactionBlock(lines: string[]): RawTransaction | null {
  if (lines.length === 0) return null

  const originalText = lines.join(' ')
  const firstLine = lines[0]

  // Extract date from first line
  const dateMatch = firstLine.match(/^(\d{2}\.\d{2}\.\d{4})/)
  if (!dateMatch) return null

  const date = parseCzechDate(dateMatch[1])
  if (!date) return null

  // Extract amount - look for numbers at the end, possibly with +/- prefix
  // Amount patterns: "-22 415.00", "+2 000.00", "-1 500.00"
  const amountMatch = originalText.match(/([+-]?\d[\d\s]*[.,]\d{2})(?:\s*$|\s+(?:Kč|CZK))/i)
  let amount: number | null = null

  if (amountMatch) {
    amount = parseCzechAmount(amountMatch[1])
  } else {
    // Try alternative pattern - amount might be at the end of a line
    for (const line of lines) {
      const lineAmountMatch = line.match(/([+-]?\d[\d\s]*[.,]\d{2})\s*$/)
      if (lineAmountMatch) {
        amount = parseCzechAmount(lineAmountMatch[1])
        if (amount !== null) break
      }
    }
  }

  if (amount === null) return null

  // Extract counter account
  const accountMatch = originalText.match(/(\d{6,16}\/\d{4})/)
  const counterAccount = accountMatch ? parseAccountNumber(accountMatch[1]) : null

  // Extract variable symbol
  const varSymbolMatch = originalText.match(/(?:Variabilní symbol|VS)[:\s]*(\d+)/i)
  const variableSymbol = varSymbolMatch ? varSymbolMatch[1] : null

  // Extract constant symbol
  const constSymbolMatch = originalText.match(/(?:Konstantní symbol|KS)[:\s]*(\d+)/i)
  const constantSymbol = constSymbolMatch ? constSymbolMatch[1] : null

  // Extract specific symbol
  const specSymbolMatch = originalText.match(/(?:Specifický symbol|SS)[:\s]*(\d+)/i)
  const specificSymbol = specSymbolMatch ? specSymbolMatch[1] : null

  // Build description from transaction type and additional info
  const transactionTypes = [
    'Trvalý příkaz',
    'Tuzemská odchozí úhrada okamžitá',
    'Tuzemská odchozí úhrada',
    'Příchozí úhrada',
    'Platba kartou',
    'Vratka platby kartou',
    'Výběr z bankomatu',
    'Inkaso',
  ]

  let description = ''
  for (const type of transactionTypes) {
    if (originalText.includes(type)) {
      description = type
      break
    }
  }

  // Add any additional description info
  // Look for text after the transaction type that isn't a number
  const descriptionParts: string[] = []
  for (const line of lines.slice(1)) {
    // Skip lines that are just numbers, dates, or symbols
    if (/^\d+$/.test(line)) continue
    if (/^\d{2}\.\d{2}\.\d{4}$/.test(line)) continue
    if (/^[+-]?\d[\d\s]*[.,]\d{2}$/.test(line.trim())) continue
    if (/^\d+\/\d+$/.test(line)) continue
    if (line.length < 3) continue

    // This might be a description or counter-party name
    descriptionParts.push(line)
  }

  // Extract counter-party name - usually after "Číslo instrukce" or account number
  let counterAccountName: string | null = null
  for (const part of descriptionParts) {
    // Skip known non-name patterns
    if (part.startsWith('Číslo instrukce')) continue
    if (part.match(/^\d{2}\.\d{2}\.\d{4}$/)) continue

    // Names often start with capital letters
    if (part.match(/^[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ]/)) {
      counterAccountName = part
      break
    }
  }

  // If no specific description found, use the description parts
  if (!description && descriptionParts.length > 0) {
    description = descriptionParts.join(' ')
  }

  // Add counter-party name to description if different
  if (counterAccountName && !description.includes(counterAccountName)) {
    description = description ? `${description} - ${counterAccountName}` : counterAccountName
  }

  return {
    date,
    description: description || 'Transakce',
    amount,
    counterAccountNumber: counterAccount ? `${counterAccount.accountNumber}/${counterAccount.bankCode}` : null,
    counterAccountName,
    variableSymbol,
    constantSymbol,
    specificSymbol,
    originalText,
  }
}

/**
 * Extract transactions from Česká spořitelna credit card statement
 */
function extractCeskaSparitelnaCreditCardTransactions(text: string): RawTransaction[] {
  const transactions: RawTransaction[] = []

  // Credit card statements have different format
  // Pattern: "DD.MM.YYYY Platba kartou MERCHANT ..."
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0)

  let inTransactionSection = false

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Detect start of transactions section
    if (line.includes('PŘEHLED POHYBŮ NA ÚČTU') || line.includes('KARTA ČÍSLO')) {
      inTransactionSection = true
      continue
    }

    if (!inTransactionSection) continue

    // Skip headers
    if (line.includes('Zaúčtováno') || line.includes('Cizí měna')) continue

    // Stop at footer
    if (line.includes('Česká spořitelna, a.s.')) {
      inTransactionSection = false
      continue
    }

    // Parse credit card transaction line
    // Format: "DD.MM.YYYY Platba kartou LOCATION MERCHANT ... [-]AMOUNT"
    const dateMatch = line.match(/^(\d{2}\.\d{2}\.\d{4})/)
    if (!dateMatch) continue

    const date = parseCzechDate(dateMatch[1])
    if (!date) continue

    // Extract amount - at the end of line
    const amountMatch = line.match(/([+-]?\d[\d\s]*[.,]\d{2})\s*$/)
    if (!amountMatch) continue

    const amount = parseCzechAmount(amountMatch[1])
    if (amount === null) continue

    // Extract description - everything between date and amount
    const descStart = dateMatch[0].length
    const descEnd = line.lastIndexOf(amountMatch[1])
    let description = line.substring(descStart, descEnd).trim()

    // Clean up description
    // Remove card number patterns like "XXXXXXXXXXXX3406"
    description = description.replace(/X{10,}\d{4}/g, '').trim()
    // Remove date patterns like "d.tran.DD.MM.YYYY"
    description = description.replace(/d\.(?:tran|přep)\.\d{2}\.\d{2}\.\d{4}/g, '').trim()
    // Remove exchange rate patterns like "kurz USD 21.636"
    description = description.replace(/kurz\s+\w+\s+[\d.,]+/gi, '').trim()

    // Extract merchant name from "Platba kartou LOCATION MERCHANT" pattern
    const merchantMatch = description.match(/Platba kartou\s+(\S+)\s+(.+)/i)
    let counterAccountName: string | null = null
    if (merchantMatch) {
      counterAccountName = merchantMatch[2].trim()
    } else if (description.includes('Vratka platby')) {
      const refundMatch = description.match(/Vratka platby kartou\s+(\S+)\s+(.+)/i)
      if (refundMatch) {
        counterAccountName = refundMatch[2].trim()
      }
    }

    transactions.push({
      date,
      description,
      amount,
      counterAccountNumber: null,
      counterAccountName,
      variableSymbol: null,
      constantSymbol: null,
      specificSymbol: null,
      originalText: line,
    })
  }

  return transactions
}

/**
 * Main extraction function - detects bank and format, extracts transactions
 */
export function extractTransactions(text: string): ExtractionResult {
  const metadata = extractMetadata(text)
  let transactions: RawTransaction[] = []

  // Detect bank and account type, use appropriate extractor
  if (metadata.bankName === 'Česká spořitelna') {
    if (metadata.accountType === 'credit_card') {
      transactions = extractCeskaSparitelnaCreditCardTransactions(text)
    } else {
      transactions = extractCeskaSporitelnaCheckingTransactions(text)
    }
  } else {
    // Fallback: try both extractors and use the one with more results
    const checkingTx = extractCeskaSporitelnaCheckingTransactions(text)
    const cardTx = extractCeskaSparitelnaCreditCardTransactions(text)
    transactions = checkingTx.length > cardTx.length ? checkingTx : cardTx
  }

  return {
    metadata,
    transactions,
    rawText: text,
  }
}

/**
 * Determine transaction type based on amount and description
 */
export function determineTransactionType(
  amount: number,
  description: string
): TransactionType {
  // Positive amounts are usually income
  if (amount > 0) {
    return 'income'
  }

  // Check for transfer patterns
  const transferPatterns = [
    /převod mezi vlastními účty/i,
    /vnitřní převod/i,
    /splátka kreditní karty/i,
  ]

  for (const pattern of transferPatterns) {
    if (pattern.test(description)) {
      return 'transfer'
    }
  }

  // Negative amounts are expenses
  if (amount < 0) {
    return 'expense'
  }

  return 'unknown'
}
