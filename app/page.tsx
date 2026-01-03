'use client'

import { StatCard } from '@/components/stat-card'
import { PageHeader } from '@/components/page-header'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { StatCardsSkeleton, CardSkeleton } from '@/components/ui/skeleton'
import { useMonthlyData } from '@/lib/hooks'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'
import { AlertCircle, TrendingUp, Wallet, PiggyBank, CreditCard } from 'lucide-react'
import { IncomeBreakdown } from '@/components/income-breakdown'
import { AIFinancialOverview } from '@/components/ai-financial-overview'
import type { DashboardSummary } from '@/lib/types'

export default function DashboardPage() {
  const { data, loading, error, period, setPeriod } = useMonthlyData<DashboardSummary>({
    endpoint: '/api/summary',
  })

  if (loading) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Přehled"
          period={period}
          onPeriodChange={(year, month) => setPeriod({ year, month })}
        />
        <StatCardsSkeleton count={4} />
        <div className="grid grid-cols-2 gap-6">
          <CardSkeleton height="h-64" />
          <CardSkeleton height="h-64" />
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Přehled"
          period={period}
          onPeriodChange={(year, month) => setPeriod({ year, month })}
        />
        <div className="flex items-center gap-2 text-muted-foreground">
          <AlertCircle className="h-5 w-5" />
          <span>Nepodařilo se načíst data</span>
        </div>
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
      <PageHeader
        title="Přehled"
        period={period}
        onPeriodChange={(year, month) => setPeriod({ year, month })}
      />

      {/* AI Financial Overview - Hero Section */}
      <AIFinancialOverview period={period} />

      {/* Main Financial Summary */}
      <div className="space-y-3 opacity-0 animate-fade-in">
        {/* Primary: Income → Total Outgoing → Balance */}
        <div className="grid grid-cols-3 gap-4">
          <StatCard
            label="Příjmy"
            value={data.totalIncome || 0}
            previousValue={data.previousMonth?.totalIncome}
            type="income"
          />
          <StatCard
            label="Celkové výdaje"
            value={(data.totalExpenses || 0) + (data.totalInvestments || 0) + (data.totalLoanPayments || 0)}
            previousValue={data.previousMonth ? (data.previousMonth.totalExpenses + data.previousMonth.totalInvestments + (data.previousMonth.totalLoanPayments || 0)) : undefined}
            type="expense"
          />
          <StatCard
            label="Bilance"
            value={data.balance || 0}
            previousValue={data.previousMonth ? (data.previousMonth.totalIncome - data.previousMonth.totalExpenses - data.previousMonth.totalInvestments - (data.previousMonth.totalLoanPayments || 0)) : undefined}
            type="balance"
          />
        </div>

        {/* Expense Breakdown */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded border border-border/50 bg-muted/30 px-4 py-3">
            <div className="text-xs text-muted-foreground">Běžné výdaje</div>
            <div className="font-mono-numbers text-lg font-medium text-[#B71C1C]">
              {formatCurrency(data.totalExpenses || 0, false)}
            </div>
          </div>
          <div className="rounded border border-border/50 bg-muted/30 px-4 py-3">
            <div className="text-xs text-muted-foreground">Investice</div>
            <div className="font-mono-numbers text-lg font-medium text-[#37474F]">
              {formatCurrency(data.totalInvestments || 0, false)}
            </div>
          </div>
          <div className="rounded border border-border/50 bg-muted/30 px-4 py-3">
            <div className="text-xs text-muted-foreground">Splátky půjček</div>
            <div className="font-mono-numbers text-lg font-medium text-[#B71C1C]">
              {formatCurrency(data.totalLoanPayments || 0, false)}
            </div>
          </div>
        </div>
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
              Nejvyšší výdaje
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topExpenses.length === 0 ? (
              <p className="text-sm text-muted-foreground">Žádné výdaje tento měsíc</p>
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
                Aktivní půjčky
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="mb-4 rounded-lg bg-muted/50 p-3">
                <div className="text-sm text-muted-foreground">Celkem k splacení</div>
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
                        {formatCurrency(loan.monthlyPayment, false)}/měs
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
              Spořící cíle
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(data.savingGoals || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">Žádné spořící cíle</p>
            ) : (
              <div className="space-y-4">
                {(data.savingGoals || []).slice(0, 4).map((goal) => (
                  <div key={goal.id}>
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {goal.name}
                        {goal.isEmergency && (
                          <span className="ml-2 text-xs text-muted-foreground">(Nouzový)</span>
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
                        Doporučeno: {formatCurrency(goal.recommendedTarget, false)} ({goal.emergencyFundMonths ?? 3}x měsíční výdaje)
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
            Rozdělení příjmů
          </CardTitle>
        </CardHeader>
        <CardContent>
          <IncomeBreakdown sources={data.incomeSources || []} />
        </CardContent>
      </Card>

      {/* Quick Stats Footer */}
      <div className="flex items-center justify-between border-t border-border pt-6 text-sm text-muted-foreground opacity-0 animate-fade-in stagger-5">
        <div>
          Průměrné měsíční výdaje:{' '}
          <span className="font-mono-numbers font-medium text-foreground">
            {formatCurrency(data.avgMonthlyExpenses, false)}
          </span>
        </div>
        <div>
          Míra úspor:{' '}
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
    </div>
  )
}
