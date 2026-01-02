// Czech formatting utilities

/**
 * Format number as Czech currency (CZK)
 * Example: 1234567.89 -> "1 234 567,89 Kc"
 */
export function formatCurrency(amount: number, showDecimals = true): string {
  const formatted = new Intl.NumberFormat('cs-CZ', {
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(amount)
  return `${formatted} Kc`
}

/**
 * Format number with Czech formatting (spaces as thousand separator, comma as decimal)
 * Example: 1234567.89 -> "1 234 567,89"
 */
export function formatNumber(num: number, decimals = 2): string {
  return new Intl.NumberFormat('cs-CZ', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(num)
}

/**
 * Format percentage with Czech formatting
 * Example: 0.0575 -> "5,75 %"
 */
export function formatPercent(value: number, decimals = 2): string {
  return new Intl.NumberFormat('cs-CZ', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

/**
 * Format date in Czech format
 * Example: new Date('2024-01-15') -> "15. 1. 2024"
 */
export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('cs-CZ', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  }).format(date)
}

/**
 * Format month/year in Czech
 * Example: (2024, 1) -> "Leden 2024"
 */
export function formatMonth(year: number, month: number): string {
  const date = new Date(year, month - 1, 1)
  return new Intl.DateTimeFormat('cs-CZ', {
    month: 'long',
    year: 'numeric',
  }).format(date)
}

/**
 * Get full month name in Czech
 * Example: 1 -> "Leden"
 */
export function getMonthName(month: number): string {
  const date = new Date(2024, month - 1, 1)
  const formatted = new Intl.DateTimeFormat('cs-CZ', { month: 'long' }).format(date)
  return formatted.charAt(0).toUpperCase() + formatted.slice(1)
}

/**
 * Parse Czech currency input (handles both . and , as decimal separator)
 */
export function parseCurrencyInput(input: string): number | null {
  // Remove currency symbol, spaces, and normalize decimal separator
  const cleaned = input
    .replace(/Kc|Kč/gi, '')
    .replace(/\s/g, '')
    .replace(',', '.')
    .trim()

  const num = parseFloat(cleaned)
  return isNaN(num) ? null : num
}

/**
 * Get current year and month
 */
export function getCurrentPeriod(): { year: number; month: number } {
  const now = new Date()
  return {
    year: now.getFullYear(),
    month: now.getMonth() + 1,
  }
}

/**
 * Generate array of months for a year
 */
export function getMonthsArray(): Array<{ value: number; label: string }> {
  return Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: getMonthName(i + 1),
  }))
}

/**
 * Generate array of years (past 5 years to current + 1)
 */
export function getYearsArray(): number[] {
  const currentYear = new Date().getFullYear()
  return Array.from({ length: 7 }, (_, i) => currentYear - 5 + i)
}
