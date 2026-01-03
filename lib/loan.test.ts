import { describe, it, expect } from 'vitest'
import {
  calculateLoan,
  evaluateLoan,
  runStressTests,
  type LoanInput,
  type LoanResult,
  type LoanVerdict,
} from './loan'

describe('calculateLoan', () => {
  it('calculates a standard loan correctly (5% rate, 120 months)', () => {
    const input: LoanInput = {
      amount: 1_000_000,
      annualRate: 0.05,
      termMonths: 120,
    }

    const result = calculateLoan(input)

    // Monthly payment should be around 10,606.55 CZK
    expect(result.monthlyPayment).toBeCloseTo(10606.55, 0)
    expect(result.totalPayment).toBeCloseTo(1_272_786, 0)
    expect(result.totalInterest).toBeCloseTo(272_786, 0)
    expect(result.amortization).toHaveLength(120)
  })

  it('handles zero interest rate correctly', () => {
    const input: LoanInput = {
      amount: 120_000,
      annualRate: 0,
      termMonths: 12,
    }

    const result = calculateLoan(input)

    expect(result.monthlyPayment).toBe(10_000)
    expect(result.totalPayment).toBe(120_000)
    expect(result.totalInterest).toBe(0)
    expect(result.amortization).toHaveLength(12)
  })

  it('handles 1 month term edge case', () => {
    const input: LoanInput = {
      amount: 10_000,
      annualRate: 0.12,
      termMonths: 1,
    }

    const result = calculateLoan(input)

    // For 1 month loan at 12% annual (1% monthly)
    // Payment should be principal + 1 month interest
    expect(result.monthlyPayment).toBeCloseTo(10_100, 0)
    expect(result.amortization).toHaveLength(1)
    expect(result.amortization[0].balance).toBeCloseTo(0, 2)
  })

  it('generates correct amortization schedule', () => {
    const input: LoanInput = {
      amount: 100_000,
      annualRate: 0.06,
      termMonths: 12,
    }

    const result = calculateLoan(input)

    // First payment: more interest, less principal
    const firstEntry = result.amortization[0]
    expect(firstEntry.month).toBe(1)
    expect(firstEntry.interest).toBeCloseTo(500, 0) // 100000 * 0.06 / 12

    // Last payment: balance should be 0
    const lastEntry = result.amortization[11]
    expect(lastEntry.month).toBe(12)
    expect(lastEntry.balance).toBeCloseTo(0, 2)

    // Each payment should equal monthlyPayment
    result.amortization.forEach((entry) => {
      expect(entry.payment).toBeCloseTo(result.monthlyPayment, 2)
    })
  })

  it('calculates total interest correctly', () => {
    const input: LoanInput = {
      amount: 500_000,
      annualRate: 0.049,
      termMonths: 240,
    }

    const result = calculateLoan(input)

    // Sum of all interest payments should equal totalInterest
    const summedInterest = result.amortization.reduce(
      (sum, entry) => sum + entry.interest,
      0
    )
    expect(summedInterest).toBeCloseTo(result.totalInterest, 0)
  })

  it('handles typical mortgage scenario (4.9% rate, 30 years)', () => {
    const input: LoanInput = {
      amount: 3_000_000,
      annualRate: 0.049,
      termMonths: 360,
    }

    const result = calculateLoan(input)

    expect(result.monthlyPayment).toBeGreaterThan(15_000)
    expect(result.monthlyPayment).toBeLessThan(20_000)
    expect(result.totalInterest).toBeGreaterThan(2_000_000)
    expect(result.amortization).toHaveLength(360)
  })
})

describe('evaluateLoan', () => {
  it('returns NOT_RECOMMENDED when payment exceeds disposable income', () => {
    const result = evaluateLoan(
      15_000, // monthlyPayment
      50_000, // monthlyIncome
      40_000 // monthlyExpenses (disposable = 10,000)
    )

    expect(result.status).toBe('NOT_RECOMMENDED')
    expect(result.label).toBe('Nedoporuceno')
    expect(result.reason).toContain('prevysuje')
  })

  it('returns RISKY when impact exceeds 40%', () => {
    const result = evaluateLoan(
      25_000, // monthlyPayment (50% of income)
      50_000, // monthlyIncome
      15_000 // monthlyExpenses
    )

    expect(result.status).toBe('RISKY')
    expect(result.label).toBe('Rizikove')
    expect(result.monthlyBudgetImpact).toBe(50)
  })

  it('returns RISKY when remaining income is less than 10%', () => {
    const result = evaluateLoan(
      18_000, // monthlyPayment
      60_000, // monthlyIncome
      38_000 // monthlyExpenses (remaining after loan = 4000 = 6.7%)
    )

    expect(result.status).toBe('RISKY')
    expect(result.label).toBe('Rizikove')
  })

  it('returns AVAILABLE when impact is between 30-40%', () => {
    const result = evaluateLoan(
      17_500, // monthlyPayment (35% of income)
      50_000, // monthlyIncome
      15_000 // monthlyExpenses
    )

    expect(result.status).toBe('AVAILABLE')
    expect(result.label).toBe('Dostupne')
    expect(result.reason).toContain('horni hranici')
    expect(result.monthlyBudgetImpact).toBe(35)
  })

  it('returns AVAILABLE with comfortable message when impact is under 30%', () => {
    const result = evaluateLoan(
      10_000, // monthlyPayment (20% of income)
      50_000, // monthlyIncome
      20_000 // monthlyExpenses
    )

    expect(result.status).toBe('AVAILABLE')
    expect(result.label).toBe('Dostupne')
    expect(result.reason).toContain('komfortni')
    expect(result.monthlyBudgetImpact).toBe(20)
  })

  it('calculates budget impact percentage correctly', () => {
    const result = evaluateLoan(
      12_500, // monthlyPayment
      50_000, // monthlyIncome
      20_000 // monthlyExpenses
    )

    expect(result.monthlyBudgetImpact).toBe(25)
  })

  it('includes remaining amount in reason text', () => {
    const result = evaluateLoan(
      10_000,
      50_000,
      20_000
    )

    // Remaining = 50000 - 20000 - 10000 = 20000
    expect(result.reason).toContain('20')
  })
})

describe('runStressTests', () => {
  const basePayment = 10_000
  const baseIncome = 50_000
  const baseExpenses = 25_000

  it('generates 6 scenarios total', () => {
    const results = runStressTests(basePayment, baseIncome, baseExpenses)

    expect(results).toHaveLength(6)
  })

  it('includes current situation as first scenario', () => {
    const results = runStressTests(basePayment, baseIncome, baseExpenses)

    expect(results[0].scenario).toBe('Aktualni situace')
    expect(results[0].monthlyIncome).toBe(baseIncome)
    expect(results[0].monthlyExpenses).toBe(baseExpenses)
  })

  it('includes income drop scenarios (10%, 20%, 30%)', () => {
    const results = runStressTests(basePayment, baseIncome, baseExpenses)

    const incomeDropScenarios = results.filter((r) =>
      r.scenario.includes('Pokles prijmu')
    )

    expect(incomeDropScenarios).toHaveLength(3)

    // 10% drop
    expect(incomeDropScenarios[0].monthlyIncome).toBe(45_000)
    expect(incomeDropScenarios[0].scenario).toContain('10')

    // 20% drop
    expect(incomeDropScenarios[1].monthlyIncome).toBe(40_000)
    expect(incomeDropScenarios[1].scenario).toContain('20')

    // 30% drop
    expect(incomeDropScenarios[2].monthlyIncome).toBe(35_000)
    expect(incomeDropScenarios[2].scenario).toContain('30')
  })

  it('includes inflation scenarios (3%, 5% over 5 years)', () => {
    const results = runStressTests(basePayment, baseIncome, baseExpenses)

    const inflationScenarios = results.filter((r) =>
      r.scenario.includes('Inflace')
    )

    expect(inflationScenarios).toHaveLength(2)

    // 3% inflation over 5 years: 25000 * (1.03)^5
    const expected3pct = baseExpenses * Math.pow(1.03, 5)
    expect(inflationScenarios[0].monthlyExpenses).toBeCloseTo(expected3pct, 0)
    expect(inflationScenarios[0].scenario).toContain('3')

    // 5% inflation over 5 years: 25000 * (1.05)^5
    const expected5pct = baseExpenses * Math.pow(1.05, 5)
    expect(inflationScenarios[1].monthlyExpenses).toBeCloseTo(expected5pct, 0)
    expect(inflationScenarios[1].scenario).toContain('5')
  })

  it('calculates remaining after loan correctly for each scenario', () => {
    const results = runStressTests(basePayment, baseIncome, baseExpenses)

    results.forEach((result) => {
      const expected =
        result.monthlyIncome - result.monthlyExpenses - basePayment
      expect(result.remainingAfterLoan).toBeCloseTo(expected, 2)
    })
  })

  it('generates appropriate verdicts for each scenario', () => {
    const results = runStressTests(basePayment, baseIncome, baseExpenses)

    // Each result should have a verdict
    results.forEach((result) => {
      expect(result.verdict).toBeDefined()
      expect(['AVAILABLE', 'RISKY', 'NOT_RECOMMENDED']).toContain(
        result.verdict.status
      )
    })
  })

  it('uses custom yearsAhead parameter for inflation calculation', () => {
    const results = runStressTests(basePayment, baseIncome, baseExpenses, 10)

    const inflationScenarios = results.filter((r) =>
      r.scenario.includes('Inflace')
    )

    // 3% inflation over 10 years
    const expected3pct = baseExpenses * Math.pow(1.03, 10)
    expect(inflationScenarios[0].monthlyExpenses).toBeCloseTo(expected3pct, 0)
    expect(inflationScenarios[0].scenario).toContain('10 let')
  })

  it('shows worsening verdicts as income drops', () => {
    // With tight budget, income drops should worsen the verdict
    const results = runStressTests(
      12_000, // payment = 30% of income
      40_000, // income
      15_000 // expenses
    )

    const currentVerdict = results[0].verdict.status
    const drop30Verdict = results[3].verdict.status

    // Either the 30% drop should be worse or both should be risky/not_recommended
    const statusOrder = ['AVAILABLE', 'RISKY', 'NOT_RECOMMENDED']
    const currentIndex = statusOrder.indexOf(currentVerdict)
    const drop30Index = statusOrder.indexOf(drop30Verdict)

    expect(drop30Index).toBeGreaterThanOrEqual(currentIndex)
  })
})

describe('edge cases and boundary conditions', () => {
  it('handles very small loan amounts', () => {
    const result = calculateLoan({
      amount: 1000,
      annualRate: 0.1,
      termMonths: 6,
    })

    expect(result.monthlyPayment).toBeGreaterThan(0)
    expect(result.amortization[5].balance).toBeCloseTo(0, 2)
  })

  it('handles very large loan amounts', () => {
    const result = calculateLoan({
      amount: 50_000_000, // 50 million
      annualRate: 0.05,
      termMonths: 360,
    })

    expect(result.monthlyPayment).toBeGreaterThan(250_000)
    expect(result.totalInterest).toBeGreaterThan(40_000_000)
  })

  it('handles high interest rates', () => {
    const result = calculateLoan({
      amount: 100_000,
      annualRate: 0.25, // 25%
      termMonths: 24,
    })

    expect(result.monthlyPayment).toBeGreaterThan(5_000)
    expect(result.totalInterest).toBeGreaterThan(20_000)
  })

  it('evaluateLoan handles edge case where payment equals disposable income', () => {
    const result = evaluateLoan(
      20_000, // monthlyPayment = disposable income exactly
      50_000,
      30_000
    )

    // Should still be RISKY (remaining is 0%)
    expect(result.status).toBe('RISKY')
  })

  it('evaluateLoan handles very high income relative to payment', () => {
    const result = evaluateLoan(
      1_000, // tiny payment
      100_000, // high income
      30_000
    )

    expect(result.status).toBe('AVAILABLE')
    expect(result.monthlyBudgetImpact).toBe(1)
  })
})
