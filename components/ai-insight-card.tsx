'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardAction } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sparkles, RefreshCw, AlertCircle, Lightbulb, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { InsightSection, InsightResponse } from '@/lib/ai-prompts'

interface AiInsightCardProps {
  section: InsightSection
  year: number
  month: number
  className?: string
}

interface AIInsightResult {
  section: InsightSection
  insights: InsightResponse
  generatedAt: string
  cached: boolean
}

type LoadingState = 'idle' | 'loading' | 'success' | 'error'

export function AiInsightCard({ section, year, month, className }: AiInsightCardProps) {
  const [result, setResult] = useState<AIInsightResult | null>(null)
  const [loadingState, setLoadingState] = useState<LoadingState>('idle')
  const [error, setError] = useState<string | null>(null)

  const fetchInsights = useCallback(
    async (forceRefresh = false) => {
      setLoadingState('loading')
      setError(null)

      try {
        const response = await fetch('/api/ai-insights', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            section,
            year,
            month,
            forceRefresh,
          }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || 'Chyba pri generovani')
        }

        const data: AIInsightResult = await response.json()
        setResult(data)
        setLoadingState('success')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Neznama chyba')
        setLoadingState('error')
      }
    },
    [section, year, month]
  )

  // Auto-load on mount and when period changes
  useEffect(() => {
    fetchInsights(false)
  }, [fetchInsights])

  const handleRefresh = () => {
    fetchInsights(true) // Force refresh, bypass cache
  }

  // Health score color mapping
  const getHealthColor = (score: number) => {
    if (score >= 85) return 'text-[#1B5E20] bg-[#1B5E20]/10'
    if (score >= 65) return 'text-[#37474F] bg-[#37474F]/10'
    if (score >= 40) return 'text-[#E65100] bg-[#E65100]/10'
    return 'text-[#B71C1C] bg-[#B71C1C]/10'
  }

  return (
    <Card className={cn('opacity-0 animate-fade-in', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <Sparkles className="h-4 w-4 text-muted-foreground" />
          AI Postrehy
          {result?.cached && (
            <Badge variant="outline" className="text-xs font-normal">
              z cache
            </Badge>
          )}
        </CardTitle>
        <CardAction>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleRefresh}
            disabled={loadingState === 'loading'}
            title="Obnovit analyzu"
          >
            <RefreshCw className={cn('h-4 w-4', loadingState === 'loading' && 'animate-spin')} />
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent>
        {/* Loading State */}
        {loadingState === 'loading' && (
          <div className="space-y-3">
            <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
            <p className="mt-4 text-xs text-muted-foreground">
              Generuji AI postrehy... (muze trvat az 2 minuty)
            </p>
          </div>
        )}

        {/* Error State */}
        {loadingState === 'error' && (
          <div className="flex items-start gap-3 text-sm">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#B71C1C]" />
            <div>
              <p className="font-medium text-[#B71C1C]">{error}</p>
              <Button variant="link" size="sm" className="mt-1 h-auto p-0" onClick={handleRefresh}>
                Zkusit znovu
              </Button>
            </div>
          </div>
        )}

        {/* Success State */}
        {loadingState === 'success' && result && (
          <div className="space-y-4">
            {/* Health Score Badge */}
            {result.insights.healthScore !== undefined && (
              <div
                className={cn(
                  'inline-flex items-center gap-2 rounded-full px-3 py-1.5',
                  getHealthColor(result.insights.healthScore)
                )}
              >
                <span className="font-mono-numbers font-semibold">{result.insights.healthScore}</span>
                <span className="text-sm">{result.insights.healthLabel}</span>
              </div>
            )}

            {/* Summary */}
            <p className="text-sm leading-relaxed">{result.insights.summary}</p>

            {/* Patterns */}
            {result.insights.patterns.length > 0 && (
              <div>
                <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <TrendingUp className="h-3 w-3" />
                  Zjistene vzorce
                </div>
                <ul className="space-y-1.5">
                  {result.insights.patterns.map((pattern, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-muted-foreground">-</span>
                      {pattern}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            {result.insights.recommendations.length > 0 && (
              <div>
                <div className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                  <Lightbulb className="h-3 w-3" />
                  Doporuceni
                </div>
                <ul className="space-y-1.5">
                  {result.insights.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="font-medium text-[#1B5E20]">{i + 1}.</span>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Generated timestamp */}
            <p className="text-xs text-muted-foreground">
              Vygenerovano: {new Date(result.generatedAt).toLocaleString('cs-CZ')}
            </p>
          </div>
        )}

        {/* Idle State (initial - should not appear due to auto-fetch) */}
        {loadingState === 'idle' && (
          <div className="py-4 text-center">
            <Button variant="outline" size="sm" onClick={() => fetchInsights(false)}>
              <Sparkles className="mr-2 h-4 w-4" />
              Generovat AI postrehy
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
