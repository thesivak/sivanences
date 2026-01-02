// Shared types for the application

export interface MonthlyData {
  year: number
  month: number
}

export interface CategoryWithExpense {
  id: string
  name: string
  icon: string | null
  order: number
  expense?: {
    id: string
    amount: number
  } | null
}

export interface IncomeSourceWithAmount {
  id: string
  name: string
  order: number
  income?: {
    id: string
    amount: number
  } | null
}

export interface MonthSummary {
  year: number
  month: number
  totalIncome: number
  totalExpenses: number
  balance: number
  categories: CategoryWithExpense[]
  incomeSources: IncomeSourceWithAmount[]
}

export interface SavingGoalWithProgress {
  id: string
  name: string
  targetAmount: number | null
  currentAmount: number
  isEmergency: boolean
  progress: number // 0-100
  recommendedTarget?: number // For emergency fund: 3× monthly expenses
}

export interface TaxDeductibleSummary {
  year: number
  mortgageInterest: number
  pension: number
  lifeInsurance: number
  charity: number
  total: number
}

// Navigation items
export const NAV_ITEMS = [
  { href: '/', label: 'Prehled', icon: 'LayoutDashboard' },
  { href: '/vydaje', label: 'Vydaje', icon: 'Receipt' },
  { href: '/prijmy', label: 'Prijmy', icon: 'Wallet' },
  { href: '/cile', label: 'Cile', icon: 'Target' },
  { href: '/pujcky', label: 'Pujcky', icon: 'Calculator' },
  { href: '/dane', label: 'Dane', icon: 'FileText' },
  { href: '/export', label: 'Export', icon: 'Download' },
] as const

// Default expense categories
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
]

// Default income sources
export const DEFAULT_INCOME_SOURCES = [
  { name: 'Mzda', order: 1 },
  { name: 'Bonusy', order: 2 },
  { name: 'Ostatni', order: 3 },
]
