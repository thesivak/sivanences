'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Sparkles,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  Wallet,
  TrendingUp,
  PiggyBank,
  Target,
  CreditCard,
  Loader2,
  AlertCircle,
  X,
  Lightbulb,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { InsightSection, InsightResponse } from '@/lib/ai-prompts'

interface AiInsightsSidebarProps {
  year: number
  month: number
  isOpen: boolean
  onClose: () => void
}

interface SectionInsight {
  section: InsightSection
  insights: InsightResponse
  generatedAt: string
}

interface ExecutiveSummary {
  insights: InsightResponse
  generatedAt: string
}

// Individual sections (not dashboard - that uses executive summary)
const SECTIONS: { id: InsightSection; label: string; icon: React.ElementType }[] = [
  { id: 'expenses', label: 'Vydaje', icon: Wallet },
  { id: 'income', label: 'Prijmy', icon: TrendingUp },
  { id: 'investments', label: 'Investice', icon: PiggyBank },
  { id: 'goals', label: 'Sporici cile', icon: Target },
  { id: 'loans', label: 'Pujcky', icon: CreditCard },
]

// Module-level cache to persist across open/close cycles
interface CacheData {
  sectionInsights: Record<InsightSection, SectionInsight | null>
  executiveSummary: ExecutiveSummary | null
  timestamp: number
}
const memoryCacheMap = new Map<string, CacheData>()
const getCacheKey = (year: number, month: number) => `${year}-${month}`

export function AiInsightsSidebar({ year, month, isOpen, onClose }: AiInsightsSidebarProps) {
  const cacheKey = getCacheKey(year, month)
  const memoryCached = memoryCacheMap.get(cacheKey)

  // Initialize from memory cache if available
  const [sectionInsights, setSectionInsights] = useState<Record<InsightSection, SectionInsight | null>>(
    memoryCached?.sectionInsights ?? {
      dashboard: null,
      expenses: null,
      income: null,
      investments: null,
      goals: null,
      loans: null,
    }
  )
  const [executiveSummary, setExecutiveSummary] = useState<ExecutiveSummary | null>(
    memoryCached?.executiveSummary ?? null
  )
  const [loading, setLoading] = useState(!memoryCached)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [expandedSections, setExpandedSections] = useState<Set<InsightSection>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const abortControllerRef = useRef<AbortController | null>(null)
  const hasLoadedRef = useRef(!!memoryCached)

  // Fetch all section insights from cache (GET only, instant)
  const fetchAllCachedInsights = useCallback(async () => {
    const results = await Promise.all(
      SECTIONS.map(async ({ id }) => {
        try {
          const response = await fetch(`/api/ai-insights?section=${id}&year=${year}&month=${month}`)
          if (!response.ok) return { section: id, data: null }
          const json = await response.json()
          return { section: id, data: json.cached as SectionInsight | null }
        } catch {
          return { section: id, data: null }
        }
      })
    )

    const newInsights: Record<InsightSection, SectionInsight | null> = {
      dashboard: null,
      expenses: null,
      income: null,
      investments: null,
      goals: null,
      loans: null,
    }

    results.forEach(({ section, data }) => {
      newInsights[section] = data
    })

    return newInsights
  }, [year, month])

  // Fetch executive summary from cache (GET only, instant)
  const fetchCachedExecutiveSummary = useCallback(async () => {
    try {
      const response = await fetch(`/api/ai-insights/executive-summary?year=${year}&month=${month}`)
      if (!response.ok) return null
      const json = await response.json()
      return json.cached as ExecutiveSummary | null
    } catch {
      return null
    }
  }, [year, month])

  // Generate fresh executive summary
  const generateExecutiveSummary = useCallback(async () => {
    try {
      const response = await fetch('/api/ai-insights/executive-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year, month, forceRefresh: true }),
      })
      if (!response.ok) return null
      return (await response.json()) as ExecutiveSummary
    } catch {
      return null
    }
  }, [year, month])

  // Save to memory cache
  const saveToMemoryCache = useCallback(
    (insights: Record<InsightSection, SectionInsight | null>, summary: ExecutiveSummary | null) => {
      memoryCacheMap.set(cacheKey, {
        sectionInsights: insights,
        executiveSummary: summary,
        timestamp: Date.now(),
      })
    },
    [cacheKey]
  )

  // Load data when sidebar opens
  useEffect(() => {
    if (!isOpen) return

    let mounted = true

    const loadData = async () => {
      // If we have memory cache, show it immediately and refresh in background
      if (hasLoadedRef.current && memoryCached) {
        setIsRefreshing(true)

        // Background refresh
        const [newInsights, newSummary] = await Promise.all([
          fetchAllCachedInsights(),
          fetchCachedExecutiveSummary(),
        ])

        if (mounted) {
          setSectionInsights(newInsights)
          if (newSummary) {
            setExecutiveSummary(newSummary)
          }
          saveToMemoryCache(newInsights, newSummary || executiveSummary)
          setIsRefreshing(false)
        }
        return
      }

      // First load - show loading state
      setLoading(true)
      setError(null)

      try {
        // Fetch cached data
        const [newInsights, newSummary] = await Promise.all([
          fetchAllCachedInsights(),
          fetchCachedExecutiveSummary(),
        ])

        if (!mounted) return

        setSectionInsights(newInsights)
        setExecutiveSummary(newSummary)
        saveToMemoryCache(newInsights, newSummary)
        hasLoadedRef.current = true

        // If no executive summary but have section insights, generate one
        const availableCount = Object.values(newInsights).filter(Boolean).length
        if (!newSummary && availableCount >= 3) {
          const generated = await generateExecutiveSummary()
          if (mounted && generated) {
            setExecutiveSummary(generated)
            saveToMemoryCache(newInsights, generated)
          }
        }
      } catch (err) {
        if (mounted) {
          setError('Nepodarilo se nacist postrehy')
        }
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    loadData()

    return () => {
      mounted = false
    }
  }, [
    isOpen,
    memoryCached,
    executiveSummary,
    fetchAllCachedInsights,
    fetchCachedExecutiveSummary,
    generateExecutiveSummary,
    saveToMemoryCache,
  ])

  // Manual refresh
  const handleRefresh = async () => {
    setIsRefreshing(true)
    setError(null)

    try {
      const [newInsights, newSummary] = await Promise.all([
        fetchAllCachedInsights(),
        generateExecutiveSummary(),
      ])

      setSectionInsights(newInsights)
      if (newSummary) {
        setExecutiveSummary(newSummary)
      }
      saveToMemoryCache(newInsights, newSummary || executiveSummary)
    } catch {
      setError('Nepodarilo se obnovit postrehy')
    } finally {
      setIsRefreshing(false)
    }
  }

  const toggleSection = (section: InsightSection) => {
    setExpandedSections((prev) => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }

  const getHealthColor = (score: number) => {
    if (score >= 85) return 'text-[#1B5E20] bg-[#1B5E20]/10 border-[#1B5E20]/20'
    if (score >= 65) return 'text-[#37474F] bg-[#37474F]/10 border-[#37474F]/20'
    if (score >= 40) return 'text-[#E65100] bg-[#E65100]/10 border-[#E65100]/20'
    return 'text-[#B71C1C] bg-[#B71C1C]/10 border-[#B71C1C]/20'
  }

  const getScoreBgColor = (score: number) => {
    if (score >= 85) return 'bg-[#1B5E20]'
    if (score >= 65) return 'bg-[#37474F]'
    if (score >= 40) return 'bg-[#E65100]'
    return 'bg-[#B71C1C]'
  }

  // Count available insights (from SECTIONS only)
  const availableCount = SECTIONS.filter(({ id }) => sectionInsights[id]).length

  // Calculate average health score
  const avgScore =
    availableCount > 0
      ? Math.round(
          SECTIONS.filter(({ id }) => sectionInsights[id])
            .map(({ id }) => sectionInsights[id]!.insights.healthScore)
            .reduce((sum, score) => sum + score, 0) / availableCount
        )
      : 0

  if (!isOpen) return null

  const showLoading = loading && !memoryCached
  const showContent = !showLoading

  return (
    <div className="fixed inset-y-0 right-0 z-50 flex">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />

      {/* Sidebar */}
      <aside className="relative ml-auto h-full w-[420px] overflow-y-auto bg-background border-l border-border shadow-2xl animate-slide-in-right">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/95 backdrop-blur-sm px-5 py-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-muted-foreground" />
            <h2 className="font-display text-lg font-semibold">AI Postrehy</h2>
            {showContent && availableCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {availableCount}/{SECTIONS.length}
              </Badge>
            )}
            {isRefreshing && (
              <Badge variant="outline" className="ml-2 text-xs text-amber-600 border-amber-300">
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                Aktualizuji
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleRefresh}
              disabled={loading || isRefreshing}
              title="Obnovit vse"
            >
              <RefreshCw className={cn('h-4 w-4', (loading || isRefreshing) && 'animate-spin')} />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Loading State */}
          {showLoading && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mb-3" />
              <p className="text-sm">Nacitam AI postrehy...</p>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-red-50 border border-red-200 text-red-800">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <div>
                <p className="font-medium">{error}</p>
                <Button variant="link" size="sm" className="h-auto p-0 text-red-700" onClick={handleRefresh}>
                  Zkusit znovu
                </Button>
              </div>
            </div>
          )}

          {/* Executive Summary */}
          {showContent && availableCount > 0 && (
            <Card className="border-2 overflow-hidden">
              <CardHeader className="pb-3 bg-gradient-to-br from-muted/50 to-muted/30">
                <CardTitle className="flex items-center justify-between text-base">
                  <span className="flex items-center gap-2">
                    <Lightbulb className="h-4 w-4" />
                    Souhrnne hodnoceni
                  </span>
                  <div
                    className={cn(
                      'flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium border',
                      getHealthColor(executiveSummary?.insights.healthScore ?? avgScore)
                    )}
                  >
                    <span className="font-mono-numbers font-bold">
                      {executiveSummary?.insights.healthScore ?? avgScore}
                    </span>
                    <span>{executiveSummary?.insights.healthLabel ?? 'Celkove'}</span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                {/* Score Bar */}
                <div className="relative h-2 rounded-full bg-muted overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      getScoreBgColor(executiveSummary?.insights.healthScore ?? avgScore)
                    )}
                    style={{ width: `${executiveSummary?.insights.healthScore ?? avgScore}%` }}
                  />
                </div>

                {/* Summary Text */}
                {executiveSummary ? (
                  <>
                    <p className="text-sm leading-relaxed">{executiveSummary.insights.summary}</p>

                    {executiveSummary.insights.patterns.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">Hlavni vzorce:</p>
                        <ul className="space-y-1">
                          {executiveSummary.insights.patterns.slice(0, 3).map((pattern, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <span className="text-muted-foreground">-</span>
                              {pattern}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {executiveSummary.insights.recommendations.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground mb-2">Doporuceni:</p>
                        <ul className="space-y-1">
                          {executiveSummary.insights.recommendations.slice(0, 3).map((rec, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <span className="text-[#1B5E20] font-medium">{i + 1}.</span>
                              {rec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Prumerny zdravotni skore ze vsech sekci je {avgScore}. Rozbalte jednotlive sekce pro detailni
                    analyzu.
                  </p>
                )}
              </CardContent>
            </Card>
          )}

          {/* Section Insights */}
          {showContent && (
            <div className="space-y-2">
              {SECTIONS.map(({ id, label, icon: Icon }) => {
                const insight = sectionInsights[id]
                const isExpanded = expandedSections.has(id)

                return (
                  <div key={id} className="rounded-lg border border-border overflow-hidden">
                    {/* Section Header */}
                    <button
                      onClick={() => insight && toggleSection(id)}
                      disabled={!insight}
                      className={cn(
                        'w-full flex items-center justify-between px-4 py-3 text-left transition-colors',
                        insight ? 'hover:bg-muted/50 cursor-pointer' : 'opacity-50 cursor-not-allowed',
                        isExpanded && 'bg-muted/30'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm">{label}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {insight ? (
                          <>
                            <span
                              className={cn(
                                'font-mono-numbers text-xs font-bold px-2 py-0.5 rounded',
                                getHealthColor(insight.insights.healthScore)
                              )}
                            >
                              {insight.insights.healthScore}
                            </span>
                            {isExpanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground" />
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-muted-foreground">Neni k dispozici</span>
                        )}
                      </div>
                    </button>

                    {/* Section Content */}
                    {insight && isExpanded && (
                      <div className="px-4 py-3 border-t border-border bg-muted/20 space-y-3">
                        {/* Health Label */}
                        <Badge variant="outline" className={cn('text-xs', getHealthColor(insight.insights.healthScore))}>
                          {insight.insights.healthLabel}
                        </Badge>

                        {/* Summary */}
                        <p className="text-sm leading-relaxed">{insight.insights.summary}</p>

                        {/* Patterns */}
                        {insight.insights.patterns.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Vzorce:</p>
                            <ul className="space-y-1">
                              {insight.insights.patterns.slice(0, 3).map((pattern, i) => (
                                <li key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                                  <span>-</span>
                                  {pattern}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Recommendations */}
                        {insight.insights.recommendations.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-muted-foreground mb-1">Doporuceni:</p>
                            <ul className="space-y-1">
                              {insight.insights.recommendations.slice(0, 2).map((rec, i) => (
                                <li key={i} className="text-xs flex items-start gap-1">
                                  <span className="text-[#1B5E20] font-medium">{i + 1}.</span>
                                  {rec}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Timestamp */}
                        <p className="text-xs text-muted-foreground pt-1">
                          {new Date(insight.generatedAt).toLocaleString('cs-CZ')}
                        </p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* No Insights Available */}
          {showContent && availableCount === 0 && !error && (
            <div className="text-center py-12 text-muted-foreground">
              <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p className="text-sm">Zadne AI postrehy nejsou k dispozici.</p>
              <p className="text-xs mt-1">Navstivte jednotlive stranky pro jejich vygenerovani.</p>
            </div>
          )}
        </div>
      </aside>
    </div>
  )
}
