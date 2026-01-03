// Centralized type definitions for the application

// ============================================
// Core Types
// ============================================

export interface Period {
  year: number
  month: number
}

// ============================================
// Category & Expense Types
// ============================================

export interface Category {
  id: string
  name: string
  icon: string | null
  order: number
}

export interface Expense {
  id: string
  amount: number
  year: number
  month: number
  categoryId: string
}

export interface CategoryWithExpense extends Category {
  expense: Pick<Expense, 'id' | 'amount'> | null
}

export interface ExpensesPageData {
  year: number
  month: number
  categories: CategoryWithExpense[]
}

// ============================================
// Income Source Types
// ============================================

export interface IncomeSource {
  id: string
  name: string
  order: number
}

export interface Income {
  id: string
  amount: number
  year: number
  month: number
  sourceId: string
}

export interface IncomeSourceWithAmount extends IncomeSource {
  income: Pick<Income, 'id' | 'amount'> | null
}

export interface IncomePageData {
  year: number
  month: number
  sources: IncomeSourceWithAmount[]
}

// ============================================
// Investment Types
// ============================================

export interface InvestmentType {
  id: string
  name: string
  order: number
  totalInvested: number | null
  annualRate: number | null
  investmentYears: number | null
}

export interface Investment {
  id: string
  amount: number
  year: number
  month: number
  typeId: string
}

export interface InvestmentTypeWithAmount extends InvestmentType {
  investment: Pick<Investment, 'id' | 'amount'> | null
}

export interface InvestmentsPageData {
  year: number
  month: number
  types: InvestmentTypeWithAmount[]
}

// ============================================
// Saving Goal Types
// ============================================

export interface FundTransaction {
  id: string
  amount: number
  description: string | null
  date: string
  savingGoalId: string
}

export interface SavingGoal {
  id: string
  name: string
  targetAmount: number | null
  currentAmount: number
  isEmergency: boolean
  order: number
}

export interface SavingGoalWithProgress extends SavingGoal {
  progress: number
  recommendedTarget?: number
  emergencyFundMonths?: number
  transactions?: FundTransaction[]
}

export interface GoalsPageData {
  goals: SavingGoalWithProgress[]
  avgMonthlyExpenses: number
}

// ============================================
// Loan Types
// ============================================

export type LoanType = 'MORTGAGE' | 'CONSUMER'

export interface ActiveLoan {
  id: string
  name: string
  type: string
  originalAmount: number
  remainingAmount: number
  interestRate: number
  monthlyPayment: number
  startDate: string
  termMonths: number
}

export interface ActiveLoanWithDetails extends ActiveLoan {
  calculatedBalance: number
  paymentsMade: number
  monthsRemaining: number
  paidOffPercent: number
}

// ============================================
// Dashboard Summary Types
// ============================================

export interface PreviousMonthData {
  totalIncome: number
  totalExpenses: number
  totalInvestments: number
  totalLoanPayments: number
}

export interface DashboardSummary {
  year: number
  month: number
  totalIncome: number
  totalExpenses: number
  totalInvestments: number
  totalLoanPayments: number
  totalLoanBalance: number
  balance: number
  previousMonth: PreviousMonthData
  categories: CategoryWithExpense[]
  incomeSources: IncomeSourceWithAmount[]
  investmentTypes: InvestmentTypeWithAmount[]
  savingGoals: SavingGoalWithProgress[]
  activeLoans: ActiveLoanWithDetails[]
  avgMonthlyExpenses: number
}

// ============================================
// Navigation Types
// ============================================

export interface NavItem {
  href: string
  label: string
  icon: string
}

// Navigation items - single source of truth
export const NAV_ITEMS: NavItem[] = [
  { href: '/', label: 'Přehled', icon: 'LayoutDashboard' },
  { href: '/vydaje', label: 'Výdaje', icon: 'Receipt' },
  { href: '/prijmy', label: 'Příjmy', icon: 'Wallet' },
  { href: '/investice', label: 'Investice', icon: 'TrendingUp' },
  { href: '/cile', label: 'Cíle', icon: 'Target' },
  { href: '/pujcky', label: 'Půjčky', icon: 'Calculator' },
  { href: '/export', label: 'Export', icon: 'Download' },
] as const

// ============================================
// Default Data
// ============================================

export const DEFAULT_CATEGORIES = [
  { name: 'Potraviny', icon: 'shopping-cart', order: 1 },
  { name: 'Bydlení', icon: 'home', order: 2 },
  { name: 'Energie', icon: 'zap', order: 3 },
  { name: 'Doprava', icon: 'car', order: 4 },
  { name: 'Oblečení', icon: 'shirt', order: 5 },
  { name: 'Zdraví', icon: 'heart', order: 6 },
  { name: 'Vzdělávání', icon: 'book', order: 7 },
  { name: 'Zábava', icon: 'gamepad', order: 8 },
  { name: 'Restaurace', icon: 'utensils', order: 9 },
  { name: 'Komunikace', icon: 'phone', order: 10 },
  { name: 'Pojištění', icon: 'shield', order: 11 },
  { name: 'Děti', icon: 'baby', order: 12 },
  { name: 'Domácnost', icon: 'lamp', order: 13 },
  { name: 'Osobní', icon: 'user', order: 14 },
  { name: 'Ostatní', icon: 'more-horizontal', order: 15 },
] as const

export const DEFAULT_INCOME_SOURCES = [
  { name: 'Mzda', order: 1 },
  { name: 'Bonusy', order: 2 },
  { name: 'Ostatní', order: 3 },
] as const

// ============================================
// API Response Types
// ============================================

export interface ApiError {
  error: string
  message?: string
  status?: number
}

export interface ApiSuccess<T> {
  data: T
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError

// Type guard for API errors
export function isApiError(response: unknown): response is ApiError {
  return typeof response === 'object' && response !== null && 'error' in response
}

// ============================================
// AI Insights Types
// ============================================

export interface Suggestion {
  id: string
  text: string
  impact: 'vysoký' | 'střední' | 'nízký'
}

export interface CategoryInsight {
  insight: string
  trend: 'up' | 'down' | 'stable'
  benchmarkComparison?: string
}

export interface HealthScore {
  score: number  // 0-100
  label: 'výborné' | 'dobré' | 'uspokojivé' | 'rizikové' | 'kritické'
  description: string
}

export interface AIInsightsOverview {
  healthScore: HealthScore
  narrative: string
  highlights: string[]
  warnings: string[]
  suggestions: Suggestion[]
}

export interface AIInsightsMetadata {
  generatedAt: string
  dataHash: string
  isStale: boolean
  comparisonMonth?: string
}

export interface AIInsightsResponse {
  overview: AIInsightsOverview
  categories: Record<string, CategoryInsight>
  metadata: AIInsightsMetadata
}

export interface HouseholdSettings {
  id: string
  totalMembers: number
  dependentChildren: number
  adults: number
  emergencyFundTarget: number | null  // User-defined target in Kč, or null for calculated
  emergencyFundMonths: number         // Number of months of expenses for calculated target
}

export interface AIFeedback {
  insightType: 'overview' | 'category' | 'suggestion'
  insightId?: string
  isPositive: boolean
}

// Czech benchmarks from ČSÚ (adjustable)
export interface CzechBenchmarks {
  foodPerCapita: number        // Monthly food spending per person
  housingPercent: number       // Housing as % of income
  transportationPercent: number // Transportation as % of income
  utilitiesPercent: number     // Utilities as % of income
}

export const DEFAULT_CZECH_BENCHMARKS: CzechBenchmarks = {
  foodPerCapita: 3500,         // ~3,500 Kč per person
  housingPercent: 0.25,        // 25% of income
  transportationPercent: 0.10, // 10% of income
  utilitiesPercent: 0.08,      // 8% of income
}
