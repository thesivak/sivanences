'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatPercent } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { SavedLoanScenario } from '@/lib/loan'
import {
  GitCompare,
  X,
  CheckCircle,
  AlertTriangle,
  XCircle,
  ArrowUp,
  ArrowDown,
} from 'lucide-react'

interface LoanCompareViewProps {
  scenarios: [SavedLoanScenario, SavedLoanScenario]
  onClose: () => void
}

export function LoanCompareView({ scenarios, onClose }: LoanCompareViewProps) {
  const [scenario1, scenario2] = scenarios

  const getVerdictIcon = (status?: string | null) => {
    switch (status) {
      case 'AVAILABLE':
        return <CheckCircle className="h-4 w-4 text-[#1B5E20]" />
      case 'RISKY':
        return <AlertTriangle className="h-4 w-4 text-[#E65100]" />
      case 'NOT_RECOMMENDED':
        return <XCircle className="h-4 w-4 text-[#B71C1C]" />
      default:
        return null
    }
  }

  const compareValue = (val1: number, val2: number, lowerIsBetter = true) => {
    const diff = val2 - val1
    if (Math.abs(diff) < 0.01) return null
    const isBetter = lowerIsBetter ? diff > 0 : diff < 0
    return {
      diff,
      isBetter,
      icon:
        diff > 0 ? (
          <ArrowUp className="h-3 w-3" />
        ) : (
          <ArrowDown className="h-3 w-3" />
        ),
    }
  }

  const comparisons: {
    label: string
    key: keyof SavedLoanScenario
    lowerIsBetter: boolean
    isRate?: boolean
    isMonths?: boolean
  }[] = [
    { label: 'Vyse pujcky', key: 'amount', lowerIsBetter: true },
    { label: 'Mesicni splatka', key: 'monthlyPayment', lowerIsBetter: true },
    { label: 'Celkem zaplatite', key: 'totalPayment', lowerIsBetter: true },
    { label: 'Celkem na urocich', key: 'totalInterest', lowerIsBetter: true },
    { label: 'Urokova sazba', key: 'interestRate', lowerIsBetter: true, isRate: true },
    { label: 'Doba splaceni', key: 'termMonths', lowerIsBetter: true, isMonths: true },
  ]

  const formatValue = (val: number, isRate?: boolean, isMonths?: boolean) => {
    if (isRate) return formatPercent(val)
    if (isMonths) return `${val} mesicu`
    return formatCurrency(val, false)
  }

  return (
    <Card className="animate-fade-in">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <GitCompare className="h-4 w-4 text-muted-foreground" />
          Porovnani analyz
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 gap-4">
          {/* Header Row */}
          <div className="font-medium text-sm text-muted-foreground">Metrika</div>
          <div className="text-center">
            <div className="font-medium text-sm truncate" title={scenario1.name}>
              {scenario1.name}
            </div>
            <div className="flex items-center justify-center gap-1 mt-1">
              {getVerdictIcon(scenario1.verdictStatus)}
              <span className="text-xs">{scenario1.verdictLabel}</span>
            </div>
          </div>
          <div className="text-center">
            <div className="font-medium text-sm truncate" title={scenario2.name}>
              {scenario2.name}
            </div>
            <div className="flex items-center justify-center gap-1 mt-1">
              {getVerdictIcon(scenario2.verdictStatus)}
              <span className="text-xs">{scenario2.verdictLabel}</span>
            </div>
          </div>

          {/* Comparison Rows */}
          {comparisons.map(({ label, key, lowerIsBetter, isRate, isMonths }) => {
            const val1 = scenario1[key] as number
            const val2 = scenario2[key] as number
            const comparison = compareValue(val1, val2, lowerIsBetter)

            return (
              <div key={key} className="contents">
                <div className="text-sm py-2 border-t">{label}</div>
                <div className="text-center font-mono-numbers py-2 border-t">
                  {formatValue(val1, isRate, isMonths)}
                </div>
                <div
                  className={cn(
                    'text-center font-mono-numbers py-2 border-t flex items-center justify-center gap-1',
                    comparison?.isBetter
                      ? 'text-[#1B5E20]'
                      : comparison
                        ? 'text-[#B71C1C]'
                        : ''
                  )}
                >
                  {formatValue(val2, isRate, isMonths)}
                  {comparison && <span className="text-xs">{comparison.icon}</span>}
                </div>
              </div>
            )
          })}
        </div>
      </CardContent>
    </Card>
  )
}
