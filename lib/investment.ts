/**
 * Investment projection calculations
 */

export interface InvestmentProjectionInput {
  /** Initial amount already invested */
  initialAmount: number
  /** Monthly contribution amount */
  monthlyContribution: number
  /** Annual interest rate (as decimal, e.g., 0.07 for 7%) */
  annualRate: number
  /** Number of years to project */
  years: number
}

export interface InvestmentProjectionResult {
  /** Future value of initial principal with compound interest */
  principalFV: number
  /** Future value of monthly contributions (annuity) */
  contributionsFV: number
  /** Total future value (principal + contributions) */
  totalFV: number
  /** Total amount contributed (initial + monthly contributions) */
  totalContributed: number
  /** Total gain from interest */
  totalGain: number
}

/**
 * Calculate future value of initial principal using compound interest formula
 * FV = P * (1 + r)^n
 *
 * @param initialAmount - Initial principal amount
 * @param monthlyRate - Monthly interest rate (annual rate / 12)
 * @param months - Number of months
 * @returns Future value of the principal
 */
export function calculatePrincipalFutureValue(
  initialAmount: number,
  monthlyRate: number,
  months: number
): number {
  if (months === 0) {
    return initialAmount
  }
  return initialAmount * Math.pow(1 + monthlyRate, months)
}

/**
 * Calculate future value of monthly contributions (ordinary annuity formula)
 * FV = PMT * ((1 + r)^n - 1) / r
 *
 * @param monthlyContribution - Monthly payment amount
 * @param monthlyRate - Monthly interest rate (annual rate / 12)
 * @param months - Number of months
 * @returns Future value of the annuity
 */
export function calculateContributionsFutureValue(
  monthlyContribution: number,
  monthlyRate: number,
  months: number
): number {
  if (months === 0) {
    return 0
  }

  if (monthlyRate === 0) {
    // If no interest, just sum the contributions
    return monthlyContribution * months
  }

  return monthlyContribution * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate)
}

/**
 * Calculate investment projection over a specified period
 *
 * @param input - Investment parameters
 * @returns Projection results including future values and gains
 */
export function calculateInvestmentProjection(
  input: InvestmentProjectionInput
): InvestmentProjectionResult {
  const monthlyRate = input.annualRate / 12
  const months = input.years * 12

  const principalFV = calculatePrincipalFutureValue(
    input.initialAmount,
    monthlyRate,
    months
  )

  const contributionsFV = calculateContributionsFutureValue(
    input.monthlyContribution,
    monthlyRate,
    months
  )

  const totalFV = principalFV + contributionsFV
  const totalContributed = input.initialAmount + input.monthlyContribution * months
  const totalGain = totalFV - totalContributed

  return {
    principalFV,
    contributionsFV,
    totalFV,
    totalContributed,
    totalGain,
  }
}

/**
 * Generate projection data points for charting
 *
 * @param input - Investment parameters
 * @returns Array of yearly data points with future values
 */
export function generateProjectionData(
  input: InvestmentProjectionInput
): Array<{
  year: number
  principalFV: number
  contributionsFV: number
  totalFV: number
}> {
  const result: Array<{
    year: number
    principalFV: number
    contributionsFV: number
    totalFV: number
  }> = []

  const monthlyRate = input.annualRate / 12

  for (let year = 0; year <= input.years; year++) {
    const months = year * 12

    const principalFV = calculatePrincipalFutureValue(
      input.initialAmount,
      monthlyRate,
      months
    )

    const contributionsFV = calculateContributionsFutureValue(
      input.monthlyContribution,
      monthlyRate,
      months
    )

    const totalFV = principalFV + contributionsFV

    result.push({
      year,
      principalFV: Math.round(principalFV),
      contributionsFV: Math.round(contributionsFV),
      totalFV: Math.round(totalFV),
    })
  }

  return result
}
