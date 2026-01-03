// Loan calculation utilities

export interface LoanInput {
  amount: number          // Principal amount in CZK
  annualRate: number      // Annual interest rate (e.g., 0.0575 for 5.75%)
  termMonths: number      // Loan term in months
}

export interface LoanResult {
  monthlyPayment: number
  totalPayment: number
  totalInterest: number
  amortization: AmortizationEntry[]
}

export interface AmortizationEntry {
  month: number
  payment: number
  principal: number
  interest: number
  balance: number
}

/**
 * Calculate loan details using standard amortization formula
 */
export function calculateLoan(input: LoanInput): LoanResult {
  const { amount, annualRate, termMonths } = input

  // Monthly interest rate
  const monthlyRate = annualRate / 12

  // Monthly payment using amortization formula
  // M = P * [r(1+r)^n] / [(1+r)^n - 1]
  let monthlyPayment: number

  if (monthlyRate === 0) {
    monthlyPayment = amount / termMonths
  } else {
    const factor = Math.pow(1 + monthlyRate, termMonths)
    monthlyPayment = amount * (monthlyRate * factor) / (factor - 1)
  }

  // Generate amortization schedule
  const amortization: AmortizationEntry[] = []
  let balance = amount
  let totalInterest = 0

  for (let month = 1; month <= termMonths; month++) {
    const interest = balance * monthlyRate
    const principal = monthlyPayment - interest
    balance -= principal
    totalInterest += interest

    amortization.push({
      month,
      payment: monthlyPayment,
      principal,
      interest,
      balance: Math.max(0, balance),
    })
  }

  const totalPayment = monthlyPayment * termMonths

  return {
    monthlyPayment,
    totalPayment,
    totalInterest,
    amortization,
  }
}

export interface LoanVerdict {
  status: 'AVAILABLE' | 'RISKY' | 'NOT_RECOMMENDED'
  label: string
  reason: string
  monthlyBudgetImpact: number // percentage of monthly income
}

/**
 * Evaluate if a loan is affordable based on income and expenses
 */
export function evaluateLoan(
  monthlyPayment: number,
  monthlyIncome: number,
  monthlyExpenses: number
): LoanVerdict {
  const disposableIncome = monthlyIncome - monthlyExpenses
  const impactPercent = (monthlyPayment / monthlyIncome) * 100
  const remainingAfterLoan = disposableIncome - monthlyPayment
  const remainingPercent = (remainingAfterLoan / monthlyIncome) * 100

  // Debt-to-income ratio considerations:
  // < 30% of gross income on all debt payments = good
  // 30-40% = manageable but tight
  // > 40% = risky

  if (monthlyPayment > disposableIncome) {
    return {
      status: 'NOT_RECOMMENDED',
      label: 'Nedoporučeno',
      reason: `Měsíční splátka ${Math.round(monthlyPayment).toLocaleString('cs-CZ')} Kč převyšuje disponibilní příjem ${Math.round(disposableIncome).toLocaleString('cs-CZ')} Kč.`,
      monthlyBudgetImpact: impactPercent,
    }
  }

  if (impactPercent > 40 || remainingPercent < 10) {
    return {
      status: 'RISKY',
      label: 'Rizikové',
      reason: `Splátka představuje ${impactPercent.toFixed(1)} % příjmu. Po zaplacení zbyde pouze ${Math.round(remainingAfterLoan).toLocaleString('cs-CZ')} Kč měsíčně.`,
      monthlyBudgetImpact: impactPercent,
    }
  }

  if (impactPercent > 30) {
    return {
      status: 'AVAILABLE',
      label: 'Dostupné',
      reason: `Splátka ${impactPercent.toFixed(1)} % příjmu je na horní hranici, ale zvládnutelná. Zbývá ${Math.round(remainingAfterLoan).toLocaleString('cs-CZ')} Kč měsíčně.`,
      monthlyBudgetImpact: impactPercent,
    }
  }

  return {
    status: 'AVAILABLE',
    label: 'Dostupné',
    reason: `Splátka ${impactPercent.toFixed(1)} % příjmu je komfortní. Po zaplacení zbývá ${Math.round(remainingAfterLoan).toLocaleString('cs-CZ')} Kč měsíčně.`,
    monthlyBudgetImpact: impactPercent,
  }
}

export interface StressTestResult {
  scenario: string
  monthlyIncome: number
  monthlyExpenses: number
  remainingAfterLoan: number
  verdict: LoanVerdict
}

/**
 * Run stress tests on loan affordability
 */
export function runStressTests(
  monthlyPayment: number,
  baseIncome: number,
  baseExpenses: number,
  yearsAhead: number = 5
): StressTestResult[] {
  const results: StressTestResult[] = []

  // Current situation
  results.push({
    scenario: 'Aktuální situace',
    monthlyIncome: baseIncome,
    monthlyExpenses: baseExpenses,
    remainingAfterLoan: baseIncome - baseExpenses - monthlyPayment,
    verdict: evaluateLoan(monthlyPayment, baseIncome, baseExpenses),
  })

  // Income drop scenarios
  const incomeDrops = [0.1, 0.2, 0.3] // 10%, 20%, 30%
  for (const drop of incomeDrops) {
    const reducedIncome = baseIncome * (1 - drop)
    results.push({
      scenario: `Pokles příjmu o ${drop * 100} %`,
      monthlyIncome: reducedIncome,
      monthlyExpenses: baseExpenses,
      remainingAfterLoan: reducedIncome - baseExpenses - monthlyPayment,
      verdict: evaluateLoan(monthlyPayment, reducedIncome, baseExpenses),
    })
  }

  // Inflation scenarios (expenses increase)
  const inflationRates = [0.03, 0.05] // 3%, 5% annual
  for (const rate of inflationRates) {
    const inflatedExpenses = baseExpenses * Math.pow(1 + rate, yearsAhead)
    results.push({
      scenario: `Inflace ${rate * 100} % ročně (za ${yearsAhead} let)`,
      monthlyIncome: baseIncome,
      monthlyExpenses: inflatedExpenses,
      remainingAfterLoan: baseIncome - inflatedExpenses - monthlyPayment,
      verdict: evaluateLoan(monthlyPayment, baseIncome, inflatedExpenses),
    })
  }

  return results
}

// Czech interest rate presets (updated January 2026)
// Sources: CNB, Swiss Life Hypoindex, Czech banking rates
export const CZECH_RATES = {
  mortgage: [
    { label: 'Hypotéka - nízká (4,4 %)', value: 0.044 },
    { label: 'Hypotéka - průměrná (4,9 %)', value: 0.049 },
    { label: 'Hypotéka - vyšší (5,5 %)', value: 0.055 },
  ],
  consumer: [
    { label: 'Spotřebitelský úvěr - nízký (5,9 %)', value: 0.059 },
    { label: 'Spotřebitelský úvěr - průměrný (8,9 %)', value: 0.089 },
    { label: 'Spotřebitelský úvěr - vyšší (12,9 %)', value: 0.129 },
  ],
}

// Common loan term presets
export const LOAN_TERMS = [
  { label: '1 rok', months: 12 },
  { label: '2 roky', months: 24 },
  { label: '3 roky', months: 36 },
  { label: '5 let', months: 60 },
  { label: '10 let', months: 120 },
  { label: '15 let', months: 180 },
  { label: '20 let', months: 240 },
  { label: '25 let', months: 300 },
  { label: '30 let', months: 360 },
]

// Saved loan scenario from database
export interface SavedLoanScenario {
  id: string
  name: string
  amount: number
  interestRate: number
  termMonths: number
  type: 'MORTGAGE' | 'CONSUMER'
  monthlyPayment: number
  totalPayment: number
  totalInterest: number
  verdictStatus?: 'AVAILABLE' | 'RISKY' | 'NOT_RECOMMENDED' | null
  verdictLabel?: string | null
  verdictReason?: string | null
  budgetImpact?: number | null
  budgetIncome?: number | null
  budgetExpenses?: number | null
  createdAt: string
  updatedAt: string
}
