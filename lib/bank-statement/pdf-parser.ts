import { PDFParse } from 'pdf-parse'

export interface PDFParseResult {
  text: string
  numPages: number
  info: {
    title?: string
    author?: string
    creationDate?: string
  }
}

/**
 * Extract text content from a PDF buffer
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<PDFParseResult> {
  const parser = new PDFParse({ data: buffer })

  // Get info and text (these methods handle loading internally)
  const info = await parser.getInfo()
  const textResult = await parser.getText()

  return {
    text: textResult.text,
    numPages: info.total || 1,
    info: {
      title: info.info?.Title,
      author: info.info?.Author,
      creationDate: info.info?.CreationDate,
    },
  }
}

/**
 * Parse Czech date format (DD.MM.YYYY) to ISO string
 */
export function parseCzechDate(dateStr: string): string | null {
  const match = dateStr.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/)
  if (!match) return null

  const [, day, month, year] = match
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))

  if (isNaN(date.getTime())) return null
  return date.toISOString().split('T')[0]
}

/**
 * Parse Czech currency amount (e.g., "22 415.00", "-1 500.00", "+2 000.00")
 */
export function parseCzechAmount(amountStr: string): number | null {
  // Remove spaces and replace comma with dot if needed
  let cleaned = amountStr.replace(/\s/g, '').replace(',', '.')

  // Handle negative amounts with minus sign
  const isNegative = cleaned.startsWith('-') || cleaned.includes('-')
  cleaned = cleaned.replace(/-/g, '')

  // Handle positive amounts with plus sign
  const isPositive = cleaned.startsWith('+')
  cleaned = cleaned.replace(/\+/g, '')

  const amount = parseFloat(cleaned)
  if (isNaN(amount)) return null

  return isNegative ? -amount : amount
}

/**
 * Extract account number from various formats
 * Examples: "2647271193/0800", "1051304324/0800"
 */
export function parseAccountNumber(text: string): { accountNumber: string; bankCode: string } | null {
  // Standard format: number/bankcode
  const match = text.match(/(\d{6,16})\/(\d{4})/)
  if (match) {
    return {
      accountNumber: match[1],
      bankCode: match[2],
    }
  }
  return null
}

/**
 * Extract IBAN from text
 */
export function parseIBAN(text: string): string | null {
  const match = text.match(/([A-Z]{2}\d{2}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4}\s*\d{4})/)
  if (match) {
    return match[1].replace(/\s/g, '')
  }
  return null
}

/**
 * Detect bank name from statement text
 */
export function detectBankName(text: string): string {
  const bankPatterns: Record<string, RegExp[]> = {
    'Česká spořitelna': [/Česká spořitelna/i, /ERSTE/i, /GIBACZPX/i],
    'Komerční banka': [/Komerční banka/i, /KOMBCZPP/i],
    'ČSOB': [/ČSOB/i, /CEKOCZPP/i],
    'Raiffeisenbank': [/Raiffeisenbank/i, /RZBCCZPP/i],
    'mBank': [/mBank/i, /BREXCZPP/i],
    'Fio banka': [/Fio banka/i, /FIOBCZPP/i],
    'Air Bank': [/Air Bank/i, /AIRACZPP/i],
    'UniCredit': [/UniCredit/i, /BACXCZPP/i],
    'Moneta': [/Moneta/i, /AGBACZPP/i],
  }

  for (const [bankName, patterns] of Object.entries(bankPatterns)) {
    for (const pattern of patterns) {
      if (pattern.test(text)) {
        return bankName
      }
    }
  }

  return 'Neznámá banka'
}

/**
 * Detect if statement is for regular account or credit card
 */
export function detectAccountType(text: string): 'checking' | 'credit_card' {
  const creditCardPatterns = [
    /kartový účet/i,
    /kreditní/i,
    /Visa.*Infinite/i,
    /MasterCard/i,
    /KARTA ČÍSLO/i,
  ]

  for (const pattern of creditCardPatterns) {
    if (pattern.test(text)) {
      return 'credit_card'
    }
  }

  return 'checking'
}

/**
 * Extract period from statement
 * Returns: { start: ISO date, end: ISO date }
 */
export function extractStatementPeriod(text: string): { start: string; end: string } | null {
  // Pattern: "Období: DD.MM.YYYY - DD.MM.YYYY"
  const periodMatch = text.match(/Období[:\s]*(\d{1,2}\.\d{1,2}\.\d{4})\s*[-–]\s*(\d{1,2}\.\d{1,2}\.\d{4})/)

  if (periodMatch) {
    const start = parseCzechDate(periodMatch[1])
    const end = parseCzechDate(periodMatch[2])
    if (start && end) {
      return { start, end }
    }
  }

  return null
}

/**
 * Extract statement number
 */
export function extractStatementNumber(text: string): string | null {
  const match = text.match(/Číslo výpisu[:\s]*(\d+)/)
  return match ? match[1] : null
}

/**
 * Extract account owner name
 */
export function extractOwnerName(text: string): string | null {
  const match = text.match(/Majitel účtu[:\s]*([^\n]+)/)
  return match ? match[1].trim() : null
}

/**
 * Extract basic account info section values
 */
export function extractAccountSummary(text: string): {
  startingBalance: number | null
  endingBalance: number | null
  totalCredits: number | null
  totalDebits: number | null
} {
  const result = {
    startingBalance: null as number | null,
    endingBalance: null as number | null,
    totalCredits: null as number | null,
    totalDebits: null as number | null,
  }

  // Starting balance patterns
  const startBalanceMatch = text.match(/Počáteční zůstatek[:\s]*([-\d\s,.]+)/)
  if (startBalanceMatch) {
    result.startingBalance = parseCzechAmount(startBalanceMatch[1])
  }

  // Ending balance patterns
  const endBalanceMatch = text.match(/Konečný zůstatek[:\s]*([-\d\s,.]+)/)
  if (endBalanceMatch) {
    result.endingBalance = parseCzechAmount(endBalanceMatch[1])
  }

  // Total credits (příjmy)
  const creditsMatch = text.match(/Celkem přišlo[:\s]*([-\d\s,.]+)/)
  if (creditsMatch) {
    result.totalCredits = parseCzechAmount(creditsMatch[1])
  }

  // Total debits (výdaje)
  const debitsMatch = text.match(/Celkem odešlo[:\s]*([-\d\s,.]+)/)
  if (debitsMatch) {
    result.totalDebits = parseCzechAmount(debitsMatch[1])
  }

  return result
}
