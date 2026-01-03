'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { TrendingUp, TrendingDown, Minus, ThumbsUp, ThumbsDown, ChevronDown } from 'lucide-react'
import type { CategoryInsight } from '@/lib/types'

interface CategoryInsightCardProps {
  categoryName: string
  insight: CategoryInsight
  onFeedback: (isPositive: boolean) => void
}

export function CategoryInsightCard({
  categoryName,
  insight,
  onFeedback,
}: CategoryInsightCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [feedbackGiven, setFeedbackGiven] = useState<boolean | null>(null)

  const handleFeedback = (isPositive: boolean) => {
    setFeedbackGiven(isPositive)
    onFeedback(isPositive)
  }

  const getTrendIcon = () => {
    switch (insight.trend) {
      case 'up':
        return <TrendingUp className="h-3.5 w-3.5 text-red-500" />
      case 'down':
        return <TrendingDown className="h-3.5 w-3.5 text-green-500" />
      case 'stable':
        return <Minus className="h-3.5 w-3.5 text-muted-foreground" />
    }
  }

  const getTrendLabel = () => {
    switch (insight.trend) {
      case 'up':
        return 'Nárůst'
      case 'down':
        return 'Pokles'
      case 'stable':
        return 'Stabilní'
    }
  }

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all duration-200 hover:shadow-md',
        expanded && 'col-span-2 row-span-2'
      )}
      onClick={() => setExpanded(!expanded)}
    >
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-medium truncate flex-1">{categoryName}</h4>
          <div className="flex items-center gap-1">
            {getTrendIcon()}
            <ChevronDown
              className={cn(
                'h-3.5 w-3.5 text-muted-foreground transition-transform duration-200',
                expanded && 'rotate-180'
              )}
            />
          </div>
        </div>

        {!expanded && (
          <p className="text-xs text-muted-foreground">{getTrendLabel()}</p>
        )}

        {expanded && (
          <div className="mt-3 space-y-3 animate-fade-in">
            <p className="text-sm leading-relaxed">{insight.insight}</p>

            {insight.benchmarkComparison && (
              <p className="text-xs text-muted-foreground border-l-2 border-primary/30 pl-2">
                {insight.benchmarkComparison}
              </p>
            )}

            <div
              className="flex items-center justify-end gap-1 pt-2 border-t"
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'h-6 w-6',
                  feedbackGiven === true && 'text-green-600 bg-green-100'
                )}
                onClick={() => handleFeedback(true)}
                disabled={feedbackGiven !== null}
              >
                <ThumbsUp className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  'h-6 w-6',
                  feedbackGiven === false && 'text-red-600 bg-red-100'
                )}
                onClick={() => handleFeedback(false)}
                disabled={feedbackGiven !== null}
              >
                <ThumbsDown className="h-3 w-3" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
