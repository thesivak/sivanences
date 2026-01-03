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
 * @param initialAmount - Initial principal amount (must be >= 0)
 * @param monthlyRate - Monthly interest rate (annual rate / 12, must be >= 0)
 * @param months - Number of months (must be >= 0)
 * @returns Future value of the principal
 */
export function calculatePrincipalFutureValue(
  initialAmount: number,
  monthlyRate: number,
  months: number
): number {
  // Treat negative inputs as zero
  const safeInitial = Math.max(0, initialAmount)
  const safeRate = Math.max(0, monthlyRate)
  const safeMonths = Math.max(0, months)

  if (safeMonths === 0) {
    return safeInitial
  }
  return safeInitial * Math.pow(1 + safeRate, safeMonths)
}

/**
 * Calculate future value of monthly contributions (ordinary annuity formula)
 * FV = PMT * ((1 + r)^n - 1) / r
 *
 * @param monthlyContribution - Monthly payment amount (must be >= 0)
 * @param monthlyRate - Monthly interest rate (annual rate / 12, must be >= 0)
 * @param months - Number of months (must be >= 0)
 * @returns Future value of the annuity
 */
export function calculateContributionsFutureValue(
  monthlyContribution: number,
  monthlyRate: number,
  months: number
): number {
  // Treat negative inputs as zero
  const safeContribution = Math.max(0, monthlyContribution)
  const safeRate = Math.max(0, monthlyRate)
  const safeMonths = Math.max(0, months)

  if (safeMonths === 0) {
    return 0
  }

  if (safeRate === 0) {
    // If no interest, just sum the contributions
    return safeContribution * safeMonths
  }

  return safeContribution * ((Math.pow(1 + safeRate, safeMonths) - 1) / safeRate)
}

/**
 * Calculate investment projection over a specified period
 *
 * @param input - Investment parameters (negative values are treated as zero)
 * @returns Projection results including future values and gains
 */
export function calculateInvestmentProjection(
  input: InvestmentProjectionInput
): InvestmentProjectionResult {
  // Treat negative inputs as zero
  const safeAnnualRate = Math.max(0, input.annualRate)
  const safeYears = Math.max(0, input.years)
  const monthlyRate = safeAnnualRate / 12
  const months = safeYears * 12

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
 * Values are rounded to whole numbers for cleaner chart display.
 *
 * @param input - Investment parameters (negative values are treated as zero)
 * @returns Array of yearly data points with future values (rounded to integers)
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
