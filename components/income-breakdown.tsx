'use client'

import { useMemo } from 'react'
import { formatCurrency } from '@/lib/format'
import { cn } from '@/lib/utils'

interface IncomeSource {
  id: string
  name: string
  income: { amount: number } | null
}

interface IncomeBreakdownProps {
  sources: IncomeSource[]
  className?: string
}

// Distinctive color palette with clearly different hues
const COLORS = [
  { bg: 'bg-[#1E3A5F]', text: 'text-[#1E3A5F]' },      // Deep navy blue
  { bg: 'bg-[#2E7D32]', text: 'text-[#2E7D32]' },      // Forest green
  { bg: 'bg-[#E65100]', text: 'text-[#E65100]' },      // Burnt orange
  { bg: 'bg-[#6A1B9A]', text: 'text-[#6A1B9A]' },      // Deep purple
  { bg: 'bg-[#00838F]', text: 'text-[#00838F]' },      // Teal
  { bg: 'bg-[#C62828]', text: 'text-[#C62828]' },      // Crimson red
  { bg: 'bg-[#F9A825]', text: 'text-[#F9A825]' },      // Golden yellow
  { bg: 'bg-[#4527A0]', text: 'text-[#4527A0]' },      // Indigo
]

export function IncomeBreakdown({ sources, className }: IncomeBreakdownProps) {
  const data = useMemo(() => {
    const filtered = sources
      .filter((s) => s.income?.amount && s.income.amount > 0)
      .map((s, index) => ({
        ...s,
        amount: s.income!.amount,
        color: COLORS[index % COLORS.length],
      }))
      .sort((a, b) => b.amount - a.amount)

    const total = filtered.reduce((sum, s) => sum + s.amount, 0)

    return filtered.map((s) => ({
      ...s,
      percentage: total > 0 ? (s.amount / total) * 100 : 0,
    }))
  }, [sources])

  const total = useMemo(
    () => data.reduce((sum, s) => sum + s.amount, 0),
    [data]
  )

  if (data.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Žádné příjmy tento měsíc</p>
    )
  }

  return (
    <div className={cn('space-y-5', className)}>
      {/* Stacked bar visualization */}
      <div className="space-y-2">
        <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
          {data.map((source, index) => (
            <div
              key={source.id}
              className={cn(
                source.color.bg,
                'h-full transition-all duration-500 ease-out',
                index === 0 && 'rounded-l-full',
                index === data.length - 1 && 'rounded-r-full'
              )}
              style={{ width: `${source.percentage}%` }}
              title={`${source.name}: ${formatCurrency(source.amount, false)}`}
            />
          ))}
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Celkem</span>
          <span className="font-mono-numbers font-medium text-foreground">
            {formatCurrency(total, false)}
          </span>
        </div>
      </div>

      {/* Detailed breakdown */}
      <div className="grid gap-3">
        {data.map((source) => (
          <div key={source.id} className="group">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={cn(
                    'h-2.5 w-2.5 rounded-full shrink-0',
                    source.color.bg
                  )}
                />
                <span className="text-sm truncate">{source.name}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="font-mono-numbers text-xs text-muted-foreground tabular-nums">
                  {source.percentage.toFixed(1)}%
                </span>
                <span className="font-mono-numbers text-sm font-medium tabular-nums w-24 text-right">
                  {formatCurrency(source.amount, false)}
                </span>
              </div>
            </div>
            {/* Progress bar for individual item */}
            <div className="mt-1.5 ml-[22px]">
              <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    source.color.bg,
                    'h-full rounded-full transition-all duration-500 ease-out opacity-60'
                  )}
                  style={{ width: `${source.percentage}%` }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
