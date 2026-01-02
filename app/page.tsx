'use client'

import { useEffect, useState } from 'react'
import { StatCard } from '@/components/stat-card'
import { MonthSelector } from '@/components/month-selector'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { formatCurrency, formatMonth, getCurrentPeriod } from '@/lib/format'
import { cn } from '@/lib/utils'
import { AlertCircle, TrendingUp, Wallet, PiggyBank, CreditCard } from 'lucide-react'
import { IncomeBreakdown } from '@/components/income-breakdown'
import { InsightsPrefetcher } from '@/components/insights-prefetcher'
import { ExecutiveSummaryCard } from '@/components/executive-summary-card'

interface CategoryExpense {
  id: string
  name: string
  expense: { amount: number } | null
}

interface IncomeSource {
  id: string
  name: string
  income: { amount: number } | null
}

interface InvestmentType {
  id: string
  name: string
  investment: { amount: number } | null
}

interface SavingGoal {
  id: string
  name: string
  currentAmount: number
  targetAmount: number | null
  progress: number
  isEmergency: boolean
  recommendedTarget?: number
}

interface ActiveLoan {
  id: string
  name: string
  type: string
  monthlyPayment: number
  calculatedBalance: number
  paidOffPercent: number
}

interface SummaryData {
  year: number
  month: number
  totalIncome: number
  totalExpenses: number
  totalInvestments: number
  totalLoanPayments: number
  totalLoanBalance: number
  balance: number
  previousMonth: {
    totalIncome: number
    totalExpenses: number
    totalInvestments: number
  }
  categories: CategoryExpense[]
  incomeSources: IncomeSource[]
  investmentTypes: InvestmentType[]
  savingGoals: SavingGoal[]
  activeLoans: ActiveLoan[]
  avgMonthlyExpenses: number
}

export default function DashboardPage() {
  const [period, setPeriod] = useState(getCurrentPeriod())
  const [data, setData] = useState<SummaryData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      try {
        const res = await fetch(`/api/summary?year=${period.year}&month=${period.month}`)
        const json = await res.json()
        setData(json)
      } catch (error) {
        console.error('Failed to fetch summary:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [period])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl font-semibold">Prehled</h1>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded border border-border bg-muted" />
          ))}
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <AlertCircle className="h-5 w-5" />
        <span>Nepodarilo se nacist data</span>
      </div>
    )
  }

  // Top 5 expense categories
  const topExpenses = [...(data.categories || [])]
    .filter((c) => c.expense?.amount)
    .sort((a, b) => (b.expense?.amount || 0) - (a.expense?.amount || 0))
    .slice(0, 5)

  return (
    <div className="space-y-8">
      {/* Prefetch AI insights for all sections in background */}
      <InsightsPrefetcher year={period.year} month={period.month} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">Prehled</h1>
          <p className="mt-1 text-muted-foreground">{formatMonth(period.year, period.month)}</p>
        </div>
        <MonthSelector
          year={period.year}
          month={period.month}
          onChange={(year, month) => setPeriod({ year, month })}
        />
      </div>

      {/* Main Stats */}
      <div className={cn(
        "grid gap-4 opacity-0 animate-fade-in",
        (data.totalLoanPayments > 0) ? "grid-cols-5" : "grid-cols-4"
      )}>
        <StatCard
          label="Prijmy"
          value={data.totalIncome || 0}
          previousValue={data.previousMonth?.totalIncome}
          type="income"
        />
        <StatCard
          label="Vydaje"
          value={data.totalExpenses || 0}
          previousValue={data.previousMonth?.totalExpenses}
          type="expense"
        />
        <StatCard
          label="Investice"
          value={data.totalInvestments || 0}
          previousValue={data.previousMonth?.totalInvestments}
          type="investment"
        />
        {(data.totalLoanPayments > 0) && (
          <StatCard
            label="Splatky pujcek"
            value={data.totalLoanPayments}
            type="expense"
          />
        )}
        <StatCard
          label="Bilance"
          value={data.balance || 0}
          previousValue={data.previousMonth ? (data.previousMonth.totalIncome - data.previousMonth.totalExpenses - data.previousMonth.totalInvestments) : undefined}
          type="balance"
        />
      </div>

      {/* Secondary Content */}
      <div className={cn(
        "grid gap-6",
        (data.activeLoans?.length > 0) ? "grid-cols-3" : "grid-cols-2"
      )}>
        {/* Top Expenses */}
        <Card className="opacity-0 animate-fade-in stagger-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              Nejvyssi vydaje
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topExpenses.length === 0 ? (
              <p className="text-sm text-muted-foreground">Zadne vydaje tento mesic</p>
            ) : (
              <div className="space-y-3">
                {topExpenses.map((cat, index) => (
                  <div key={cat.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded bg-muted text-xs font-medium text-muted-foreground">
                        {index + 1}
                      </span>
                      <span className="text-sm">{cat.name}</span>
                    </div>
                    <span className="font-mono-numbers text-sm font-medium">
                      {formatCurrency(cat.expense?.amount || 0, false)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Loans Summary */}
        {(data.activeLoans?.length > 0) && (
          <Card className="opacity-0 animate-fade-in stagger-2">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base font-medium">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                Aktivni pujcky
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 rounded-lg bg-muted/50 p-3">
                <div className="text-sm text-muted-foreground">Celkem k splaceni</div>
                <div className="font-mono-numbers text-xl font-semibold">
                  {formatCurrency(data.totalLoanBalance, false)}
                </div>
              </div>
              <div className="space-y-3">
                {data.activeLoans.slice(0, 4).map((loan) => (
                  <div key={loan.id} className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-medium">{loan.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {loan.paidOffPercent.toFixed(0)}% splaceno
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono-numbers text-sm">
                        {formatCurrency(loan.monthlyPayment, false)}/mes
                      </div>
                      <div className="font-mono-numbers text-xs text-muted-foreground">
                        {formatCurrency(loan.calculatedBalance, false)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Saving Goals */}
        <Card className="opacity-0 animate-fade-in stagger-3">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-medium">
              <PiggyBank className="h-4 w-4 text-muted-foreground" />
              Sporici cile
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(data.savingGoals || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Zadne sporici cile</p>
            ) : (
              <div className="space-y-4">
                {(data.savingGoals || []).slice(0, 4).map((goal) => (
                  <div key={goal.id}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {goal.name}
                        {goal.isEmergency && (
                          <span className="ml-2 text-xs text-muted-foreground">(Nouzovy)</span>
                        )}
                      </span>
                      <span className="font-mono-numbers text-xs text-muted-foreground">
                        {formatCurrency(goal.currentAmount, false)}
                        {goal.targetAmount && (
                          <span> / {formatCurrency(goal.targetAmount, false)}</span>
                        )}
                      </span>
                    </div>
                    {goal.targetAmount && (
                      <Progress
                        value={Math.min(goal.progress, 100)}
                        className="h-1.5"
                      />
                    )}
                    {goal.isEmergency && goal.recommendedTarget && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Doporuceno: {formatCurrency(goal.recommendedTarget, false)} (3x mesicni vydaje)
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Income Breakdown */}
      <Card className="opacity-0 animate-fade-in stagger-4">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-medium">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            Rozdeleni prijmu
          </CardTitle>
        </CardHeader>
        <CardContent>
          <IncomeBreakdown sources={data.incomeSources || []} />
        </CardContent>
      </Card>

      {/* Quick Stats Footer */}
      <div className="flex items-center justify-between border-t border-border pt-6 text-sm text-muted-foreground opacity-0 animate-fade-in stagger-5">
        <div>
          Prumerny mesicni vydaj:{' '}
          <span className="font-mono-numbers font-medium text-foreground">
            {formatCurrency(data.avgMonthlyExpenses, false)}
          </span>
        </div>
        <div>
          Mira usporeni:{' '}
          <span
            className={cn(
              'font-mono-numbers font-medium',
              data.balance >= 0 ? 'text-[#1B5E20]' : 'text-[#B71C1C]'
            )}
          >
            {data.totalIncome > 0
              ? `${((data.balance / data.totalIncome) * 100).toFixed(1)} %`
              : '0 %'}
          </span>
        </div>
      </div>

      {/* AI Insights - Executive Summary */}
      <ExecutiveSummaryCard
        year={period.year}
        month={period.month}
        className="stagger-6"
      />
    </div>
  )
}
