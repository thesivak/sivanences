import { cn } from '@/lib/utils'
import { formatCurrency } from '@/lib/format'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface StatCardProps {
  label: string
  value: number
  previousValue?: number
  type?: 'neutral' | 'income' | 'expense' | 'investment' | 'balance'
  showCurrency?: boolean
  className?: string
}

export function StatCard({
  label,
  value,
  previousValue,
  type = 'neutral',
  showCurrency = true,
  className,
}: StatCardProps) {
  const change = previousValue !== undefined ? value - previousValue : undefined
  const changePercent =
    previousValue !== undefined && previousValue !== 0
      ? ((value - previousValue) / previousValue) * 100
      : undefined

  const getValueColor = () => {
    switch (type) {
      case 'income':
        return 'text-[#1B5E20]'
      case 'expense':
        return 'text-[#B71C1C]'
      case 'investment':
        return 'text-[#37474F]'
      case 'balance':
        return value >= 0 ? 'text-[#1B5E20]' : 'text-[#B71C1C]'
      default:
        return 'text-foreground'
    }
  }

  const getTrendIcon = () => {
    if (change === undefined) return null
    if (change > 0) {
      return <TrendingUp className="h-3 w-3" />
    } else if (change < 0) {
      return <TrendingDown className="h-3 w-3" />
    }
    return <Minus className="h-3 w-3" />
  }

  const getTrendColor = () => {
    if (change === undefined) return ''
    // For expenses, decrease is good (green), increase is bad (red)
    // For income/balance, increase is good (green), decrease is bad (red)
    if (type === 'expense') {
      return change < 0 ? 'text-[#1B5E20]' : change > 0 ? 'text-[#B71C1C]' : 'text-muted-foreground'
    }
    return change > 0 ? 'text-[#1B5E20]' : change < 0 ? 'text-[#B71C1C]' : 'text-muted-foreground'
  }

  return (
    <div
      className={cn(
        'rounded border border-border bg-card p-5 card-hover',
        className
      )}
    >
      <div className="text-sm font-medium text-muted-foreground">{label}</div>
      <div className={cn('mt-2 font-mono-numbers text-2xl font-semibold', getValueColor())}>
        {showCurrency ? formatCurrency(value, false) : value.toLocaleString('cs-CZ')}
      </div>
      {changePercent !== undefined && (
        <div className={cn('mt-2 flex items-center gap-1 text-xs', getTrendColor())}>
          {getTrendIcon()}
          <span>
            {changePercent > 0 ? '+' : ''}
            {changePercent.toFixed(1)} % oproti minulemu mesici
          </span>
        </div>
      )}
    </div>
  )
}
