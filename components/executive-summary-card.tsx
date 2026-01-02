'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardAction } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sparkles, RefreshCw, AlertCircle, Lightbulb, TrendingUp, Loader2, Check } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { InsightResponse, InsightSection } from '@/lib/ai-prompts'

interface ExecutiveSummaryCardProps {
  year: number
  month: number
  className?: string
}

interface ExecutiveSummaryResult {
  section: string
  insights: InsightResponse
  generatedAt: string
  cached?: boolean
}

// Module-level cache to persist across component mounts/unmounts
const memoryCache: Map<string, ExecutiveSummaryResult> = new Map()

function getCacheKey(year: number, month: number): string {
  return `${year}-${month}`
}

// idle = initial state, checking cache
// showing-cached = showing cached data, regenerating in background
// waiting-sections = no cache, waiting for individual sections to be ready
// generating = generating executive summary
// success = showing final data
// error = error state
type LoadingState = 'idle' | 'showing-cached' | 'waiting-sections' | 'generating' | 'success' | 'error'

const SECTIONS_TO_CHECK: InsightSection[] = ['expenses', 'income', 'investments', 'goals', 'loans']
const SECTION_LABELS: Record<InsightSection, string> = {
  dashboard: 'Prehled',
  expenses: 'Vydaje',
  income: 'Prijmy',
  investments: 'Investice',
  goals: 'Cile',
  loans: 'Pujcky',
}

export function ExecutiveSummaryCard({ year, month, className }: ExecutiveSummaryCardProps) {
  const cacheKey = getCacheKey(year, month)
  const memoryCached = memoryCache.get(cacheKey)

  // Initialize state from memory cache if available
  const [result, setResult] = useState<ExecutiveSummaryResult | null>(memoryCached || null)
  const [loadingState, setLoadingState] = useState<LoadingState>(memoryCached ? 'success' : 'idle')
  const [error, setError] = useState<string | null>(null)
  const [sectionsReady, setSectionsReady] = useState<Set<InsightSection>>(new Set())
  const [isRegenerating, setIsRegenerating] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch cached summary (GET - instant)
  const fetchCachedSummary = useCallback(async (): Promise<ExecutiveSummaryResult | null> => {
    try {
      const response = await fetch(
        `/api/ai-insights/executive-summary?year=${year}&month=${month}`
      )
      if (!response.ok) return null
      const data = await response.json()
      return data.cached || null
    } catch {
      return null
    }
  }, [year, month])

  // Check which sections have cached insights
  const checkSectionsCached = useCallback(async (): Promise<Set<InsightSection>> => {
    const ready = new Set<InsightSection>()

    await Promise.all(
      SECTIONS_TO_CHECK.map(async (section) => {
        try {
          const res = await fetch(
            `/api/ai-insights?section=${section}&year=${year}&month=${month}`
          )
          if (res.ok) {
            const data = await res.json()
            if (data.cached) {
              ready.add(section)
            }
          }
        } catch {
          // Ignore errors
        }
      })
    )

    return ready
  }, [year, month])

  // Generate executive summary (POST)
  const generateSummary = useCallback(async (forceRefresh: boolean, signal?: AbortSignal): Promise<ExecutiveSummaryResult> => {
    const response = await fetch('/api/ai-insights/executive-summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ year, month, forceRefresh }),
      signal,
    })

    if (!response.ok) {
      const data = await response.json()
      throw new Error(data.error || 'Chyba pri generovani')
    }

    return await response.json()
  }, [year, month])

  // Main loading flow
  useEffect(() => {
    let mounted = true

    // If we have memory cache, show it and optionally refresh in background
    if (memoryCached) {
      // Already initialized with cached data, just refresh in background
      setIsRegenerating(true)

      generateSummary(true)
        .then((fresh) => {
          if (mounted) {
            setResult(fresh)
            memoryCache.set(cacheKey, fresh)
            setIsRegenerating(false)
          }
        })
        .catch(() => {
          if (mounted) {
            setIsRegenerating(false)
          }
        })

      return () => {
        mounted = false
      }
    }

    // Cancel any pending requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }
    abortControllerRef.current = new AbortController()
    const signal = abortControllerRef.current.signal

    const loadData = async () => {
      setError(null)

      // Step 1: Check for cached executive summary from DB (instant)
      const cached = await fetchCachedSummary()

      if (!mounted) return

      if (cached) {
        // Show cached data immediately and save to memory
        setResult(cached)
        memoryCache.set(cacheKey, cached)
        setLoadingState('showing-cached')
        setIsRegenerating(true)

        // Regenerate in background
        try {
          const fresh = await generateSummary(true, signal)
          if (mounted) {
            setResult(fresh)
            memoryCache.set(cacheKey, fresh)
            setLoadingState('success')
            setIsRegenerating(false)
          }
        } catch (err) {
          if ((err as Error).name === 'AbortError') return
          // Keep showing cached data on error
          if (mounted) {
            setLoadingState('success')
            setIsRegenerating(false)
          }
        }
        return
      }

      // Step 2: No cached summary - check individual sections
      setLoadingState('waiting-sections')

      const pollSections = async () => {
        const ready = await checkSectionsCached()

        if (!mounted) return

        setSectionsReady(ready)

        // If all sections are ready, generate executive summary
        if (ready.size === SECTIONS_TO_CHECK.length) {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current)
            pollingIntervalRef.current = null
          }

          setLoadingState('generating')

          try {
            const summaryResult = await generateSummary(false, signal)
            if (mounted) {
              setResult(summaryResult)
              memoryCache.set(cacheKey, summaryResult)
              setLoadingState('success')
            }
          } catch (err) {
            if ((err as Error).name === 'AbortError') return
            if (mounted) {
              setError(err instanceof Error ? err.message : 'Neznama chyba')
              setLoadingState('error')
            }
          }
        }
      }

      // Initial check
      const initialReady = await checkSectionsCached()
      if (!mounted) return

      setSectionsReady(initialReady)

      // If all sections ready, generate summary immediately
      if (initialReady.size === SECTIONS_TO_CHECK.length) {
        setLoadingState('generating')

        try {
          const summaryResult = await generateSummary(false, signal)
          if (mounted) {
            setResult(summaryResult)
            memoryCache.set(cacheKey, summaryResult)
            setLoadingState('success')
          }
        } catch (err) {
          if ((err as Error).name === 'AbortError') return
          if (mounted) {
            setError(err instanceof Error ? err.message : 'Neznama chyba')
            setLoadingState('error')
          }
        }
      } else {
        // Start polling for remaining sections
        pollingIntervalRef.current = setInterval(pollSections, 2000)
      }
    }

    loadData()

    return () => {
      mounted = false
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
      }
    }
  }, [year, month, cacheKey, memoryCached, fetchCachedSummary, checkSectionsCached, generateSummary])

  const handleRefresh = async () => {
    // Clear polling
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current)
      pollingIntervalRef.current = null
    }

    setIsRegenerating(true)

    try {
      const fresh = await generateSummary(true)
      setResult(fresh)
      memoryCache.set(cacheKey, fresh)
      setLoadingState('success')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Neznama chyba')
      setLoadingState('error')
    } finally {
      setIsRegenerating(false)
    }
  }

  // Health score color mapping
  const getHealthColor = (score: number) => {
    if (score >= 85) return 'text-[#1B5E20] bg-[#1B5E20]/10'
    if (score >= 65) return 'text-[#37474F] bg-[#37474F]/10'
    if (score >= 40) return 'text-[#E65100] bg-[#E65100]/10'
    return 'text-[#B71C1C] bg-[#B71C1C]/10'
  }

  const showContent = result && (loadingState === 'success' || loadingState === 'showing-cached')
  const showSectionsProgress = loadingState === 'waiting-sections'
  const showGenerating = loadingState === 'generating'
  const showInitialLoading = loadingState === 'idle'

  return (
    <Card className={cn('opacity-0 animate-fade-in', className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base font-medium">
          <Sparkles className="h-4 w-4 text-muted-foreground" />
          AI Postrehy
          {isRegenerating && (
            <Badge variant="outline" className="text-xs font-normal text-amber-600 border-amber-300 bg-amber-50 flex items-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Aktualizuji...
            </Badge>
          )}
          {showSectionsProgress && (
            <Badge variant="outline" className="text-xs font-normal">
              {sectionsReady.size}/{SECTIONS_TO_CHECK.length}
            </Badge>
          )}
        </CardTitle>
        <CardAction>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleRefresh}
            disabled={isRegenerating || showGenerating || showSectionsProgress}
            title="Obnovit analyzu"
          >
            <RefreshCw className={cn('h-4 w-4', (isRegenerating || showGenerating) && 'animate-spin')} />
          </Button>
        </CardAction>
      </CardHeader>

      <CardContent>
        {/* Initial Loading */}
        {showInitialLoading && (
          <div className="space-y-3">
            <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
          </div>
        )}

        {/* Waiting for Sections */}
        {showSectionsProgress && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cekam na postrehy z jednotlivych sekci...
            </div>
            <div className="grid grid-cols-5 gap-2">
              {SECTIONS_TO_CHECK.map((section) => (
                <div
                  key={section}
                  className={cn(
                    'flex items-center justify-center gap-1 rounded px-2 py-1 text-xs',
                    sectionsReady.has(section)
                      ? 'bg-[#1B5E20]/10 text-[#1B5E20]'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {sectionsReady.has(section) ? (
                    <Check className="h-3 w-3" />
                  ) : (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  )}
                  {SECTION_LABELS[section]}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Generating Summary */}
        {showGenerating && (
          <div className="space-y-3">
            <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
            <p className="mt-4 text-xs text-muted-foreground">
              Generuji vykonny souhrn...
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

        {/* Content (cached or fresh) */}
        {showContent && (
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
      </CardContent>
    </Card>
  )
}
