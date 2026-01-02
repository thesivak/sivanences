import { describe, it, expect } from 'vitest'
import {
  formatCurrency,
  formatNumber,
  formatPercent,
  parseCurrencyInput,
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
