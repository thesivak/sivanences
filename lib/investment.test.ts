import { describe, it, expect } from 'vitest'
import {
  calculatePrincipalFutureValue,
  calculateContributionsFutureValue,
  calculateInvestmentProjection,
  generateProjectionData,
  type InvestmentProjectionInput,
} from './investment'

describe('calculatePrincipalFutureValue', () => {
  it('calculates compound interest correctly for 1 year at 7% annual', () => {
    const initialAmount = 100_000
    const monthlyRate = 0.07 / 12
    const months = 12

    const result = calculatePrincipalFutureValue(initialAmount, monthlyRate, months)

    // Should be approximately 107,229 (compound interest)
    expect(result).toBeCloseTo(107_229, 0)
  })

  it('calculates compound interest for 10 years at 7% annual', () => {
    const initialAmount = 100_000
    const monthlyRate = 0.07 / 12
    const months = 120

    const result = calculatePrincipalFutureValue(initialAmount, monthlyRate, months)

    // Should be approximately 200,966
    expect(result).toBeCloseTo(200_966, 0)
  })

  it('handles zero months edge case', () => {
    const initialAmount = 100_000
    const monthlyRate = 0.07 / 12
    const months = 0

    const result = calculatePrincipalFutureValue(initialAmount, monthlyRate, months)

    // At time zero, value should equal initial amount
    expect(result).toBe(initialAmount)
  })

  it('handles zero interest rate', () => {
    const initialAmount = 100_000
    const monthlyRate = 0
    const months = 120

    const result = calculatePrincipalFutureValue(initialAmount, monthlyRate, months)

    // With no interest, value should remain unchanged
    expect(result).toBe(initialAmount)
  })

  it('calculates correctly for high interest rates (15% annual)', () => {
    const initialAmount = 50_000
    const monthlyRate = 0.15 / 12
    const months = 60

    const result = calculatePrincipalFutureValue(initialAmount, monthlyRate, months)

    // Should be approximately 105,359
    expect(result).toBeCloseTo(105_359, 0)
  })

  it('calculates correctly for low interest rates (3% annual)', () => {
    const initialAmount = 200_000
    const monthlyRate = 0.03 / 12
    const months = 60

    const result = calculatePrincipalFutureValue(initialAmount, monthlyRate, months)

    // Should be approximately 232,323
    expect(result).toBeCloseTo(232_323, 0)
  })

  it('handles small initial amounts', () => {
    const initialAmount = 1_000
    const monthlyRate = 0.07 / 12
    const months = 12

    const result = calculatePrincipalFutureValue(initialAmount, monthlyRate, months)

    // Should be approximately 1,072
    expect(result).toBeCloseTo(1_072, 0)
  })

  it('handles large initial amounts', () => {
    const initialAmount = 10_000_000
    const monthlyRate = 0.05 / 12
    const months = 120

    const result = calculatePrincipalFutureValue(initialAmount, monthlyRate, months)

    // Should be approximately 16,470,095
    expect(result).toBeCloseTo(16_470_095, 0)
  })
})

describe('calculateContributionsFutureValue', () => {
  it('calculates annuity future value for 1 year at 7% annual', () => {
    const monthlyContribution = 5_000
    const monthlyRate = 0.07 / 12
    const months = 12

    const result = calculateContributionsFutureValue(monthlyContribution, monthlyRate, months)

    // Should be approximately 61,963
    expect(result).toBeCloseTo(61_963, 0)
  })

  it('calculates annuity future value for 10 years at 7% annual', () => {
    const monthlyContribution = 5_000
    const monthlyRate = 0.07 / 12
    const months = 120

    const result = calculateContributionsFutureValue(monthlyContribution, monthlyRate, months)

    // Should be approximately 865,424
    expect(result).toBeCloseTo(865_424, 0)
  })

  it('handles zero months edge case', () => {
    const monthlyContribution = 5_000
    const monthlyRate = 0.07 / 12
    const months = 0

    const result = calculateContributionsFutureValue(monthlyContribution, monthlyRate, months)

    // At time zero, no contributions have been made
    expect(result).toBe(0)
  })

  it('handles zero interest rate', () => {
    const monthlyContribution = 5_000
    const monthlyRate = 0
    const months = 12

    const result = calculateContributionsFutureValue(monthlyContribution, monthlyRate, months)

    // With no interest, just sum of contributions
    expect(result).toBe(60_000)
  })

  it('handles zero interest rate for multiple years', () => {
    const monthlyContribution = 10_000
    const monthlyRate = 0
    const months = 60

    const result = calculateContributionsFutureValue(monthlyContribution, monthlyRate, months)

    // 10,000 * 60 = 600,000
    expect(result).toBe(600_000)
  })

  it('calculates correctly for high interest rates (15% annual)', () => {
    const monthlyContribution = 3_000
    const monthlyRate = 0.15 / 12
    const months = 60

    const result = calculateContributionsFutureValue(monthlyContribution, monthlyRate, months)

    // Should be approximately 265,724
    expect(result).toBeCloseTo(265_724, 0)
  })

  it('calculates correctly for low interest rates (3% annual)', () => {
    const monthlyContribution = 2_000
    const monthlyRate = 0.03 / 12
    const months = 60

    const result = calculateContributionsFutureValue(monthlyContribution, monthlyRate, months)

    // Should be approximately 129,293
    expect(result).toBeCloseTo(129_293, 0)
  })

  it('handles small monthly contributions', () => {
    const monthlyContribution = 500
    const monthlyRate = 0.07 / 12
    const months = 12

    const result = calculateContributionsFutureValue(monthlyContribution, monthlyRate, months)

    // Should be approximately 6,196
    expect(result).toBeCloseTo(6_196, 0)
  })

  it('handles large monthly contributions', () => {
    const monthlyContribution = 50_000
    const monthlyRate = 0.06 / 12
    const months = 120

    const result = calculateContributionsFutureValue(monthlyContribution, monthlyRate, months)

    // Should be approximately 8,193,967
    expect(result).toBeCloseTo(8_193_967, 0)
  })
})

describe('calculateInvestmentProjection', () => {
  it('calculates complete projection for typical investment scenario', () => {
    const input: InvestmentProjectionInput = {
      initialAmount: 100_000,
      monthlyContribution: 5_000,
      annualRate: 0.07,
      years: 10,
    }

    const result = calculateInvestmentProjection(input)

    // Principal FV: ~200,966
    expect(result.principalFV).toBeCloseTo(200_966, 0)

    // Contributions FV: ~865,424
    expect(result.contributionsFV).toBeCloseTo(865_424, 0)

    // Total FV: ~1,066,390
    expect(result.totalFV).toBeCloseTo(1_066_390, 0)

    // Total contributed: 100,000 + (5,000 * 120) = 700,000
    expect(result.totalContributed).toBe(700_000)

    // Total gain: ~366,390
    expect(result.totalGain).toBeCloseTo(366_390, 0)
  })

  it('handles scenario with only initial amount (no monthly contributions)', () => {
    const input: InvestmentProjectionInput = {
      initialAmount: 500_000,
      monthlyContribution: 0,
      annualRate: 0.06,
      years: 5,
    }

    const result = calculateInvestmentProjection(input)

    expect(result.principalFV).toBeCloseTo(674_425, 0)
    expect(result.contributionsFV).toBe(0)
    expect(result.totalFV).toBeCloseTo(674_425, 0)
    expect(result.totalContributed).toBe(500_000)
    expect(result.totalGain).toBeCloseTo(174_425, 0)
  })

  it('handles scenario with only monthly contributions (no initial amount)', () => {
    const input: InvestmentProjectionInput = {
      initialAmount: 0,
      monthlyContribution: 10_000,
      annualRate: 0.08,
      years: 5,
    }

    const result = calculateInvestmentProjection(input)

    expect(result.principalFV).toBe(0)
    expect(result.contributionsFV).toBeCloseTo(734_769, 0)
    expect(result.totalFV).toBeCloseTo(734_769, 0)
    expect(result.totalContributed).toBe(600_000)
    expect(result.totalGain).toBeCloseTo(134_769, 0)
  })

  it('handles zero years edge case', () => {
    const input: InvestmentProjectionInput = {
      initialAmount: 100_000,
      monthlyContribution: 5_000,
      annualRate: 0.07,
      years: 0,
    }

    const result = calculateInvestmentProjection(input)

    expect(result.principalFV).toBe(100_000)
    expect(result.contributionsFV).toBe(0)
    expect(result.totalFV).toBe(100_000)
    expect(result.totalContributed).toBe(100_000)
    expect(result.totalGain).toBe(0)
  })

  it('handles zero interest rate', () => {
    const input: InvestmentProjectionInput = {
      initialAmount: 50_000,
      monthlyContribution: 2_000,
      annualRate: 0,
      years: 5,
    }

    const result = calculateInvestmentProjection(input)

    expect(result.principalFV).toBe(50_000)
    expect(result.contributionsFV).toBe(120_000)
    expect(result.totalFV).toBe(170_000)
    expect(result.totalContributed).toBe(170_000)
    expect(result.totalGain).toBe(0)
  })

  it('calculates projection for 1 year period', () => {
    const input: InvestmentProjectionInput = {
      initialAmount: 50_000,
      monthlyContribution: 3_000,
      annualRate: 0.05,
      years: 1,
    }

    const result = calculateInvestmentProjection(input)

    expect(result.principalFV).toBeCloseTo(52_558, 0)
    expect(result.contributionsFV).toBeCloseTo(36_837, 0)
    expect(result.totalFV).toBeCloseTo(89_395, 0)
    expect(result.totalContributed).toBe(86_000)
    expect(result.totalGain).toBeCloseTo(3_395, 0)
  })

  it('calculates projection for 30 years period', () => {
    const input: InvestmentProjectionInput = {
      initialAmount: 200_000,
      monthlyContribution: 10_000,
      annualRate: 0.07,
      years: 30,
    }

    const result = calculateInvestmentProjection(input)

    expect(result.principalFV).toBeCloseTo(1_623_299, 0)
    expect(result.contributionsFV).toBeCloseTo(12_199_710, 0)
    expect(result.totalFV).toBeCloseTo(13_823_009, 0)
    expect(result.totalContributed).toBe(3_800_000)
    expect(result.totalGain).toBeCloseTo(10_023_009, 0)
  })

  it('calculates projection for high-risk, high-return scenario (12% annual)', () => {
    const input: InvestmentProjectionInput = {
      initialAmount: 100_000,
      monthlyContribution: 5_000,
      annualRate: 0.12,
      years: 10,
    }

    const result = calculateInvestmentProjection(input)

    expect(result.principalFV).toBeCloseTo(330_039, 0)
    expect(result.contributionsFV).toBeCloseTo(1_150_193, 0)
    expect(result.totalFV).toBeCloseTo(1_480_232, 0)
    expect(result.totalContributed).toBe(700_000)
    expect(result.totalGain).toBeCloseTo(780_232, 0)
  })

  it('calculates projection for conservative scenario (3% annual)', () => {
    const input: InvestmentProjectionInput = {
      initialAmount: 150_000,
      monthlyContribution: 3_000,
      annualRate: 0.03,
      years: 10,
    }

    const result = calculateInvestmentProjection(input)

    expect(result.principalFV).toBeCloseTo(202_403, 0)
    expect(result.contributionsFV).toBeCloseTo(419_224, 0)
    expect(result.totalFV).toBeCloseTo(621_627, 0)
    expect(result.totalContributed).toBe(510_000)
    expect(result.totalGain).toBeCloseTo(111_627, 0)
  })
})

describe('generateProjectionData', () => {
  it('generates data points for each year', () => {
    const input: InvestmentProjectionInput = {
      initialAmount: 100_000,
      monthlyContribution: 5_000,
      annualRate: 0.07,
      years: 5,
    }

    const result = generateProjectionData(input)

    // Should have 6 points (year 0 through year 5)
    expect(result).toHaveLength(6)

    // Check year values
    expect(result[0].year).toBe(0)
    expect(result[5].year).toBe(5)
  })

  it('has correct values at year 0', () => {
    const input: InvestmentProjectionInput = {
      initialAmount: 100_000,
      monthlyContribution: 5_000,
      annualRate: 0.07,
      years: 5,
    }

    const result = generateProjectionData(input)
    const yearZero = result[0]

    expect(yearZero.year).toBe(0)
    expect(yearZero.principalFV).toBe(100_000)
    expect(yearZero.contributionsFV).toBe(0)
    expect(yearZero.totalFV).toBe(100_000)
  })

  it('has increasing values over time', () => {
    const input: InvestmentProjectionInput = {
      initialAmount: 50_000,
      monthlyContribution: 2_000,
      annualRate: 0.06,
      years: 10,
    }

    const result = generateProjectionData(input)

    // Total FV should increase each year
    for (let i = 1; i < result.length; i++) {
      expect(result[i].totalFV).toBeGreaterThan(result[i - 1].totalFV)
    }
  })

  it('rounds values to whole numbers', () => {
    const input: InvestmentProjectionInput = {
      initialAmount: 100_000,
      monthlyContribution: 5_000,
      annualRate: 0.07,
      years: 3,
    }

    const result = generateProjectionData(input)

    result.forEach((point) => {
      expect(Number.isInteger(point.principalFV)).toBe(true)
      expect(Number.isInteger(point.contributionsFV)).toBe(true)
      expect(Number.isInteger(point.totalFV)).toBe(true)
    })
  })

  it('handles zero interest rate scenario', () => {
    const input: InvestmentProjectionInput = {
      initialAmount: 100_000,
      monthlyContribution: 5_000,
      annualRate: 0,
      years: 3,
    }

    const result = generateProjectionData(input)

    // Year 0: 100,000
    expect(result[0].totalFV).toBe(100_000)

    // Year 1: 100,000 + 60,000 = 160,000
    expect(result[1].totalFV).toBe(160_000)

    // Year 2: 100,000 + 120,000 = 220,000
    expect(result[2].totalFV).toBe(220_000)

    // Year 3: 100,000 + 180,000 = 280,000
    expect(result[3].totalFV).toBe(280_000)
  })

  it('generates correct data for 1 year projection', () => {
    const input: InvestmentProjectionInput = {
      initialAmount: 50_000,
      monthlyContribution: 3_000,
      annualRate: 0.05,
      years: 1,
    }

    const result = generateProjectionData(input)

    expect(result).toHaveLength(2)
    expect(result[0].year).toBe(0)
    expect(result[1].year).toBe(1)
    expect(result[1].totalFV).toBeCloseTo(89_395, 0)
  })

  it('generates correct data for long-term projection (20 years)', () => {
    const input: InvestmentProjectionInput = {
      initialAmount: 100_000,
      monthlyContribution: 5_000,
      annualRate: 0.07,
      years: 20,
    }

    const result = generateProjectionData(input)

    expect(result).toHaveLength(21)
    expect(result[0].year).toBe(0)
    expect(result[20].year).toBe(20)

    // At year 20, total should be substantial
    expect(result[20].totalFV).toBeGreaterThan(2_500_000)
  })

  it('handles scenario with no monthly contributions', () => {
    const input: InvestmentProjectionInput = {
      initialAmount: 200_000,
      monthlyContribution: 0,
      annualRate: 0.06,
      years: 5,
    }

    const result = generateProjectionData(input)

    // All contributions FV should be 0
    result.forEach((point) => {
      expect(point.contributionsFV).toBe(0)
    })

    // Total FV should equal principal FV
    result.forEach((point) => {
      expect(point.totalFV).toBe(point.principalFV)
    })
  })

  it('handles scenario with no initial amount', () => {
    const input: InvestmentProjectionInput = {
      initialAmount: 0,
      monthlyContribution: 10_000,
      annualRate: 0.08,
      years: 5,
    }

    const result = generateProjectionData(input)

    // All principal FV should be 0
    result.forEach((point) => {
      expect(point.principalFV).toBe(0)
    })

    // Total FV should equal contributions FV
    result.forEach((point) => {
      expect(point.totalFV).toBe(point.contributionsFV)
    })
  })
})

describe('edge cases and boundary conditions', () => {
  it('handles very small amounts', () => {
    const input: InvestmentProjectionInput = {
      initialAmount: 100,
      monthlyContribution: 10,
      annualRate: 0.05,
      years: 1,
    }

    const result = calculateInvestmentProjection(input)

    expect(result.totalFV).toBeGreaterThan(0)
    expect(result.totalGain).toBeGreaterThan(0)
  })

  it('handles very large amounts', () => {
    const input: InvestmentProjectionInput = {
      initialAmount: 10_000_000,
      monthlyContribution: 100_000,
      annualRate: 0.06,
      years: 20,
    }

    const result = calculateInvestmentProjection(input)

    expect(result.totalFV).toBeGreaterThan(30_000_000)
  })

  it('handles very long time periods (40 years)', () => {
    const input: InvestmentProjectionInput = {
      initialAmount: 50_000,
      monthlyContribution: 2_000,
      annualRate: 0.07,
      years: 40,
    }

    const result = calculateInvestmentProjection(input)

    expect(result.totalFV).toBeGreaterThan(5_000_000)
  })

  it('handles very high interest rates (20% annual)', () => {
    const input: InvestmentProjectionInput = {
      initialAmount: 10_000,
      monthlyContribution: 1_000,
      annualRate: 0.2,
      years: 10,
    }

    const result = calculateInvestmentProjection(input)

    expect(result.totalFV).toBeGreaterThan(300_000)
  })

  it('handles fractional interest rates', () => {
    const input: InvestmentProjectionInput = {
      initialAmount: 100_000,
      monthlyContribution: 5_000,
      annualRate: 0.0725, // 7.25%
      years: 5,
    }

    const result = calculateInvestmentProjection(input)

    expect(result.totalFV).toBeGreaterThan(400_000)
    expect(result.totalGain).toBeGreaterThan(0)
  })

  it('calculates correctly when total gain is exactly zero', () => {
    const input: InvestmentProjectionInput = {
      initialAmount: 100_000,
      monthlyContribution: 0,
      annualRate: 0,
      years: 10,
    }

    const result = calculateInvestmentProjection(input)

    expect(result.totalGain).toBe(0)
    expect(result.totalFV).toBe(result.totalContributed)
  })
})
