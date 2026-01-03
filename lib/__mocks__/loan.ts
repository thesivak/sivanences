import { vi } from 'vitest'
import type { LoanInput, LoanResult, AmortizationEntry } from '../loan'

export const calculateLoan = vi.fn((input: LoanInput): LoanResult => {
  const { amount, annualRate, termMonths } = input
  const monthlyRate = annualRate / 12

  // Simple monthly payment calculation for mock
  let monthlyPayment: number
  if (monthlyRate === 0) {
    monthlyPayment = amount / termMonths
  } else {
    const factor = Math.pow(1 + monthlyRate, termMonths)
    monthlyPayment = amount * (monthlyRate * factor) / (factor - 1)
  }

  // Create simplified amortization schedule for tests
  const amortization: AmortizationEntry[] = []
  let balance = amount

  for (let month = 1; month <= termMonths; month++) {
    const interest = balance * monthlyRate
    const principal = monthlyPayment - interest
    balance -= principal

    amortization.push({
      month,
      payment: monthlyPayment,
      principal,
      interest,
      balance: Math.max(0, balance),
    })
  }

  const totalPayment = monthlyPayment * termMonths
  const totalInterest = totalPayment - amount

  return {
    monthlyPayment,
    totalPayment,
    totalInterest,
    amortization,
  }
})

export const evaluateLoan = vi.fn()
export const runStressTests = vi.fn()
