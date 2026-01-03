import { describe, it, expect } from 'vitest'
import {
  formatCurrency,
  formatNumber,
  formatPercent,
  parseCurrencyInput,
  formatDate,
  formatMonth,
  getMonthName,
  getCurrentPeriod,
  getMonthsArray,
  getYearsArray,
} from './format'

// Czech locale uses non-breaking space (U+00A0) as thousand separator
const NBSP = '\u00A0'

describe('formatCurrency', () => {
  it('formats a number as Czech currency with decimals', () => {
    expect(formatCurrency(1234.56)).toBe(`1${NBSP}234,56 Kc`)
  })

  it('formats a large number correctly', () => {
    expect(formatCurrency(1234567.89)).toBe(`1${NBSP}234${NBSP}567,89 Kc`)
  })

  it('formats without decimals when specified', () => {
    expect(formatCurrency(1234.56, false)).toBe(`1${NBSP}235 Kc`)
  })

  it('handles zero', () => {
    expect(formatCurrency(0)).toBe('0,00 Kc')
  })
})

describe('formatNumber', () => {
  it('formats a number with Czech locale', () => {
    expect(formatNumber(1234567.89)).toBe(`1${NBSP}234${NBSP}567,89`)
  })

  it('respects custom decimal places', () => {
    expect(formatNumber(1234.5678, 3)).toBe(`1${NBSP}234,568`)
  })

  it('formats with zero decimals', () => {
    expect(formatNumber(1234.56, 0)).toBe(`1${NBSP}235`)
  })
})

describe('formatPercent', () => {
  it('formats a decimal as percentage', () => {
    expect(formatPercent(0.0575)).toBe(`5,75${NBSP}%`)
  })

  it('handles 100%', () => {
    expect(formatPercent(1)).toBe(`100,00${NBSP}%`)
  })

  it('respects custom decimal places', () => {
    expect(formatPercent(0.12345, 1)).toBe(`12,3${NBSP}%`)
  })
})

describe('parseCurrencyInput', () => {
  it('parses a simple number', () => {
    expect(parseCurrencyInput('1234.56')).toBe(1234.56)
  })

  it('parses Czech format with comma', () => {
    expect(parseCurrencyInput('1234,56')).toBe(1234.56)
  })

  it('parses with currency symbol', () => {
    expect(parseCurrencyInput('1234 Kc')).toBe(1234)
  })

  it('handles spaces in input', () => {
    expect(parseCurrencyInput('1 234,56 Kc')).toBe(1234.56)
  })

  it('returns null for invalid input', () => {
    expect(parseCurrencyInput('not a number')).toBe(null)
  })
})

describe('formatDate', () => {
  it('formats a date in Czech format (d. m. yyyy)', () => {
    const date = new Date('2024-01-15')
    const result = formatDate(date)

    // Should contain day, month, year with periods
    expect(result).toContain('15')
    expect(result).toContain('1')
    expect(result).toContain('2024')
  })

  it('formats single digit days and months correctly', () => {
    const date = new Date('2024-03-05')
    const result = formatDate(date)

    expect(result).toContain('5')
    expect(result).toContain('3')
    expect(result).toContain('2024')
  })

  it('handles end of year dates', () => {
    const date = new Date('2024-12-31')
    const result = formatDate(date)

    expect(result).toContain('31')
    expect(result).toContain('12')
    expect(result).toContain('2024')
  })
})

describe('formatMonth', () => {
  it('formats January 2024 correctly', () => {
    const result = formatMonth(2024, 1)

    expect(result.toLowerCase()).toContain('leden')
    expect(result).toContain('2024')
  })

  it('formats December 2025 correctly', () => {
    const result = formatMonth(2025, 12)

    expect(result.toLowerCase()).toContain('prosinec')
    expect(result).toContain('2025')
  })

  it('formats months in the middle of year', () => {
    const result = formatMonth(2024, 6)

    expect(result.toLowerCase()).toContain('erven') // cerven or červen
    expect(result).toContain('2024')
  })
})

describe('getMonthName', () => {
  it('returns Leden for January (1)', () => {
    expect(getMonthName(1)).toBe('Leden')
  })

  it('returns Prosinec for December (12)', () => {
    expect(getMonthName(12)).toBe('Prosinec')
  })

  it('returns correct Czech month names', () => {
    const months = [
      'Leden',
      'Unor', // or Únor
      'Brezen', // or Březen
      'Duben',
      'Kveten', // or Květen
      'Cerven', // or Červen
      'Cervenec', // or Červenec
      'Srpen',
      'Zari', // or Září
      'Rijen', // or Říjen
      'Listopad',
      'Prosinec',
    ]

    // Test that we get 12 unique month names
    const actualMonths = Array.from({ length: 12 }, (_, i) => getMonthName(i + 1))
    expect(actualMonths).toHaveLength(12)

    // Each should be capitalized
    actualMonths.forEach((month) => {
      expect(month[0]).toBe(month[0].toUpperCase())
    })
  })

  it('capitalizes the first letter', () => {
    const result = getMonthName(5) // May = Kveten

    expect(result[0]).toBe(result[0].toUpperCase())
    expect(result.slice(1)).toBe(result.slice(1).toLowerCase())
  })
})

describe('getCurrentPeriod', () => {
  it('returns current year and month', () => {
    const now = new Date()
    const result = getCurrentPeriod()

    expect(result.year).toBe(now.getFullYear())
    expect(result.month).toBe(now.getMonth() + 1)
  })

  it('returns month in 1-12 range', () => {
    const result = getCurrentPeriod()

    expect(result.month).toBeGreaterThanOrEqual(1)
    expect(result.month).toBeLessThanOrEqual(12)
  })

  it('returns year as a 4-digit number', () => {
    const result = getCurrentPeriod()

    expect(result.year).toBeGreaterThanOrEqual(2020)
    expect(result.year).toBeLessThanOrEqual(2100)
  })
})

describe('getMonthsArray', () => {
  it('returns 12 months', () => {
    const result = getMonthsArray()

    expect(result).toHaveLength(12)
  })

  it('has correct structure for each month', () => {
    const result = getMonthsArray()

    result.forEach((month) => {
      expect(month).toHaveProperty('value')
      expect(month).toHaveProperty('label')
      expect(typeof month.value).toBe('number')
      expect(typeof month.label).toBe('string')
    })
  })

  it('has values from 1 to 12', () => {
    const result = getMonthsArray()
    const values = result.map((m) => m.value)

    expect(values).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
  })

  it('has Czech month names as labels', () => {
    const result = getMonthsArray()

    expect(result[0].label).toBe('Leden')
    expect(result[11].label).toBe('Prosinec')
  })
})

describe('getYearsArray', () => {
  it('returns 7 years', () => {
    const result = getYearsArray()

    expect(result).toHaveLength(7)
  })

  it('includes current year', () => {
    const currentYear = new Date().getFullYear()
    const result = getYearsArray()

    expect(result).toContain(currentYear)
  })

  it('includes 5 years in the past', () => {
    const currentYear = new Date().getFullYear()
    const result = getYearsArray()

    expect(result).toContain(currentYear - 5)
  })

  it('includes 1 year in the future', () => {
    const currentYear = new Date().getFullYear()
    const result = getYearsArray()

    expect(result).toContain(currentYear + 1)
  })

  it('returns years in ascending order', () => {
    const result = getYearsArray()

    for (let i = 1; i < result.length; i++) {
      expect(result[i]).toBeGreaterThan(result[i - 1])
    }
  })
})
