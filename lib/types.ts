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
  { href: '/', label: 'Prehled', icon: 'LayoutDashboard' },
  { href: '/vydaje', label: 'Vydaje', icon: 'Receipt' },
  { href: '/prijmy', label: 'Prijmy', icon: 'Wallet' },
  { href: '/investice', label: 'Investice', icon: 'TrendingUp' },
  { href: '/cile', label: 'Cile', icon: 'Target' },
  { href: '/pujcky', label: 'Pujcky', icon: 'Calculator' },
  { href: '/export', label: 'Export', icon: 'Download' },
] as const

// ============================================
// Default Data
// ============================================

export const DEFAULT_CATEGORIES = [
  { name: 'Potraviny', icon: 'shopping-cart', order: 1 },
  { name: 'Bydleni', icon: 'home', order: 2 },
  { name: 'Energie', icon: 'zap', order: 3 },
  { name: 'Doprava', icon: 'car', order: 4 },
  { name: 'Obleceni', icon: 'shirt', order: 5 },
  { name: 'Zdravi', icon: 'heart', order: 6 },
  { name: 'Vzdelavani', icon: 'book', order: 7 },
  { name: 'Zabava', icon: 'gamepad', order: 8 },
  { name: 'Restaurace', icon: 'utensils', order: 9 },
  { name: 'Komunikace', icon: 'phone', order: 10 },
  { name: 'Pojisteni', icon: 'shield', order: 11 },
  { name: 'Deti', icon: 'baby', order: 12 },
  { name: 'Domacnost', icon: 'lamp', order: 13 },
  { name: 'Osobni', icon: 'user', order: 14 },
  { name: 'Ostatni', icon: 'more-horizontal', order: 15 },
] as const

export const DEFAULT_INCOME_SOURCES = [
  { name: 'Mzda', order: 1 },
  { name: 'Bonusy', order: 2 },
  { name: 'Ostatni', order: 3 },
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
