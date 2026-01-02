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
      label: 'Nedoporuceno',
      reason: `Mesicni splatka ${Math.round(monthlyPayment).toLocaleString('cs-CZ')} Kc prevysuje disponibilni prijem ${Math.round(disposableIncome).toLocaleString('cs-CZ')} Kc.`,
      monthlyBudgetImpact: impactPercent,
    }
  }

  if (impactPercent > 40 || remainingPercent < 10) {
    return {
      status: 'RISKY',
      label: 'Rizikove',
      reason: `Splatka predstavuje ${impactPercent.toFixed(1)} % prijmu. Po zaplaceni zbyde pouze ${Math.round(remainingAfterLoan).toLocaleString('cs-CZ')} Kc mesicne.`,
      monthlyBudgetImpact: impactPercent,
    }
  }

  if (impactPercent > 30) {
    return {
      status: 'AVAILABLE',
      label: 'Dostupne',
      reason: `Splatka ${impactPercent.toFixed(1)} % prijmu je na horni hranici, ale zvladnutelna. Zbyva ${Math.round(remainingAfterLoan).toLocaleString('cs-CZ')} Kc mesicne.`,
      monthlyBudgetImpact: impactPercent,
    }
  }

  return {
    status: 'AVAILABLE',
    label: 'Dostupne',
    reason: `Splatka ${impactPercent.toFixed(1)} % prijmu je komfortni. Po zaplaceni zbyva ${Math.round(remainingAfterLoan).toLocaleString('cs-CZ')} Kc mesicne.`,
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
    scenario: 'Aktualni situace',
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
      scenario: `Pokles prijmu o ${drop * 100} %`,
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
      scenario: `Inflace ${rate * 100} % rocne (za ${yearsAhead} let)`,
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
    { label: 'Hypoteka - nizka (4,4 %)', value: 0.044 },
    { label: 'Hypoteka - prumerna (4,9 %)', value: 0.049 },
    { label: 'Hypoteka - vyssi (5,5 %)', value: 0.055 },
  ],
  consumer: [
    { label: 'Spotrebitelsky uver - nizky (5,9 %)', value: 0.059 },
    { label: 'Spotrebitelsky uver - prumerny (8,9 %)', value: 0.089 },
    { label: 'Spotrebitelsky uver - vyssi (12,9 %)', value: 0.129 },
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
