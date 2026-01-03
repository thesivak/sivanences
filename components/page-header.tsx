'use client'

import { MonthSelector } from '@/components/month-selector'
import { formatMonth } from '@/lib/format'
import type { Period } from '@/lib/types'

interface PageHeaderProps {
  title: string
  period?: Period
  onPeriodChange?: (year: number, month: number) => void
  showMonthSelector?: boolean
  children?: React.ReactNode
}

/**
 * Reusable page header with optional month selector
 */
export function PageHeader({
  title,
  period,
  onPeriodChange,
  showMonthSelector = true,
  children,
}: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">{title}</h1>
        {period && (
          <p className="mt-1 text-muted-foreground">
            {formatMonth(period.year, period.month)}
          </p>
        )}
      </div>
      <div className="flex items-center gap-4">
        {children}
        {showMonthSelector && period && onPeriodChange && (
          <MonthSelector
            year={period.year}
            month={period.month}
            onChange={onPeriodChange}
          />
        )}
      </div>
    </div>
  )
}
