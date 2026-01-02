'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardAction } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sparkles, RefreshCw, AlertCircle, Lightbulb, TrendingUp, Loader2 } from 'lucide-react'
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
  cached?: boolean
}

type LoadingState = 'idle' | 'loading-cached' | 'regenerating' | 'success' | 'error'

export function AiInsightCard({ section, year, month, className }: AiInsightCardProps) {
  const [result, setResult] = useState<AIInsightResult | null>(null)
  const [loadingState, setLoadingState] = useState<LoadingState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [isStale, setIsStale] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  // Fetch cached insight from database (GET - instant)
  const fetchCachedInsight = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/ai-insights?section=${section}&year=${year}&month=${month}`
      )
      if (!response.ok) return null
      const data = await response.json()
      return data.cached as AIInsightResult | null
    } catch {
      return null
    }
  }, [section, year, month])

  // Generate fresh insight (POST)
  const generateFreshInsight = useCallback(
    async (forceRefresh = false, signal?: AbortSignal) => {
      const response = await fetch('/api/ai-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          section,
          year,
          month,
          forceRefresh,
        }),
        signal,
      })

      if (!response.ok) {
        const data = await response.json()
        const errorMsg = data.details ? `${data.error}: ${data.details}` : data.error
        throw new Error(errorMsg || 'Chyba pri generovani')
      }

      return (await response.json()) as AIInsightResult
    },
    [section, year, month]
  )

  // Main loading flow: cached first, then regenerate
  const loadInsights = useCallback(async () => {
    // Cancel any pending request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    setError(null)
    setLoadingState('loading-cached')

    // Step 1: Try to get cached insight
    const cached = await fetchCachedInsight()

    if (cached) {
      // Show cached result immediately
      setResult(cached)
      setIsStale(true)
      setLoadingState('regenerating')

      // Step 2: Regenerate in background
      try {
        const fresh = await generateFreshInsight(true, abortControllerRef.current.signal)

        // Animate transition to fresh result
        setIsTransitioning(true)
        setTimeout(() => {
          setResult(fresh)
          setIsStale(false)
          setIsTransitioning(false)
          setLoadingState('success')
        }, 300)
      } catch (err) {
        if ((err as Error).name === 'AbortError') return
        // If regeneration fails, keep showing cached (already set)
        setIsStale(true)
        setLoadingState('success')
        console.error('Failed to regenerate insight, using cached:', err)
      }
    } else {
      // No cached insight, generate fresh
      setLoadingState('loading-cached')
      try {
        const fresh = await generateFreshInsight(false, abortControllerRef.current.signal)
        setResult(fresh)
        setIsStale(false)
        setLoadingState('success')
      } catch (err) {
        if ((err as Error).name === 'AbortError') return
        setError(err instanceof Error ? err.message : 'Neznama chyba')
        setLoadingState('error')
      }
    }
  }, [fetchCachedInsight, generateFreshInsight])

  // Auto-load on mount and when period changes
  useEffect(() => {
    loadInsights()
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [loadInsights])

  const handleRefresh = () => {
    setResult(null)
    setIsStale(false)
    loadInsights()
  }

  // Health score color mapping
  const getHealthColor = (score: number) => {
    if (score >= 85) return 'text-[#1B5E20] bg-[#1B5E20]/10'
    if (score >= 65) return 'text-[#37474F] bg-[#37474F]/10'
    if (score >= 40) return 'text-[#E65100] bg-[#E65100]/10'
    return 'text-[#B71C1C] bg-[#B71C1C]/10'
  }

  const isLoading = loadingState === 'loading-cached' && !result
  const isRegenerating = loadingState === 'regenerating'

  return (
    <Card className={cn('opacity-0 animate-fade-in', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <Sparkles className="h-4 w-4 text-muted-foreground" />
          AI Postrehy
          {isStale && isRegenerating && (
            <Badge variant="outline" className="text-xs font-normal text-amber-600 border-amber-300 bg-amber-50 flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Aktualizuji...
            </Badge>
          )}
        </CardTitle>
        <CardAction>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleRefresh}
            disabled={isLoading || isRegenerating}
            title="Obnovit analyzu"
          >
            <RefreshCw className={cn('h-4 w-4', (isLoading || isRegenerating) && 'animate-spin')} />
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent>
        {/* Loading State (no cached data available) */}
        {isLoading && (
          <div className="space-y-3">
            <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
            <p className="mt-4 text-xs text-muted-foreground">
              Generuji AI postrehy...
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

        {/* Success State (or showing cached while regenerating) */}
        {(loadingState === 'success' || loadingState === 'regenerating') && result && (
          <div
            className={cn(
              'space-y-4 transition-all duration-300 ease-out',
              isTransitioning ? 'opacity-0 -translate-y-2' : 'opacity-100 translate-y-0'
            )}
          >
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

            {/* Generated timestamp with stale indicator */}
            <p className="text-xs text-muted-foreground">
              {isStale && !isRegenerating && (
                <span className="text-amber-600 mr-1">(starsi verze)</span>
              )}
              Vygenerovano: {new Date(result.generatedAt).toLocaleString('cs-CZ')}
            </p>
          </div>
        )}

        {/* Idle State (initial - should not appear due to auto-fetch) */}
        {loadingState === 'idle' && (
          <div className="py-4 text-center">
            <Button variant="outline" size="sm" onClick={loadInsights}>
              <Sparkles className="mr-2 h-4 w-4" />
              Generovat AI postrehy
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
