'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { RefreshCw, AlertTriangle, ThumbsUp, ThumbsDown, Sparkles, Settings, ChevronDown, ChevronUp } from 'lucide-react'
import type { AIInsightsResponse, Suggestion, Period, HealthScore } from '@/lib/types'
import { HouseholdSettingsDialog } from './household-settings-dialog'

interface AIFinancialOverviewProps {
  period: Period
}

export function AIFinancialOverview({ period }: AIFinancialOverviewProps) {
  const [insights, setInsights] = useState<AIInsightsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [streamedText, setStreamedText] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)

  const fetchInsights = useCallback(async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        setRefreshing(true)
        setIsStreaming(true)
      } else {
        setLoading(true)
      }

      // Use GET endpoint with forceRefresh parameter
      const url = `/api/ai/insights?year=${period.year}&month=${period.month}${forceRefresh ? '&forceRefresh=true' : ''}`
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error('Failed to fetch insights')
      }

      const data = await response.json()
      setInsights(data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
      setRefreshing(false)
      setIsStreaming(false)
    }
  }, [period.year, period.month])

  useEffect(() => {
    fetchInsights()
  }, [fetchInsights])

  const handleFeedback = async (
    insightType: 'overview' | 'category' | 'suggestion',
    isPositive: boolean,
    insightId?: string
  ) => {
    try {
      await fetch('/api/ai/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ insightType, insightId, isPositive }),
      })
    } catch (err) {
      console.error('Failed to submit feedback:', err)
    }
  }

  const getImpactColor = (impact: Suggestion['impact']) => {
    switch (impact) {
      case 'vysoký':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      case 'střední':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'nízký':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
    }
  }

  const getHealthScoreColor = (label: HealthScore['label']) => {
    switch (label) {
      case 'výborné':
        return { bg: 'bg-emerald-500', text: 'text-emerald-700', ring: 'ring-emerald-200' }
      case 'dobré':
        return { bg: 'bg-green-500', text: 'text-green-700', ring: 'ring-green-200' }
      case 'uspokojivé':
        return { bg: 'bg-yellow-500', text: 'text-yellow-700', ring: 'ring-yellow-200' }
      case 'rizikové':
        return { bg: 'bg-orange-500', text: 'text-orange-700', ring: 'ring-orange-200' }
      case 'kritické':
        return { bg: 'bg-red-500', text: 'text-red-700', ring: 'ring-red-200' }
    }
  }

  if (loading && !isStreaming) {
    return (
      <>
        <Card className="border-2 border-primary/20">
          <CardHeader className="pb-2 pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <CardTitle className="text-base">AI Přehled</CardTitle>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" disabled>
                  <Settings className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7" disabled>
                  <RefreshCw className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center gap-4 pb-3 border-b border-border/50">
              <Skeleton className="w-14 h-14 rounded-full" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-48" />
              </div>
            </div>
            <div className="flex items-center gap-2 pt-3">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-32" />
            </div>
          </CardContent>
        </Card>
        <HouseholdSettingsDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          onSave={() => fetchInsights(true)}
        />
      </>
    )
  }

  if (error && !insights) {
    return (
      <>
        <Card className="border-2 border-destructive/20">
          <CardHeader className="pb-2 pt-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <CardTitle className="text-base text-destructive">Chyba AI</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setSettingsOpen(true)}
              >
                <Settings className="h-3.5 w-3.5" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">{error}</span>
              <Button variant="outline" size="sm" className="h-7" onClick={() => fetchInsights()}>
                Zkusit znovu
              </Button>
            </div>
          </CardContent>
        </Card>
        <HouseholdSettingsDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          onSave={() => fetchInsights(true)}
        />
      </>
    )
  }

  return (
    <div className="space-y-6">
      {/* Main AI Overview Card */}
      <Card className="border-2 border-primary/20 opacity-0 animate-slide-in">
        <CardHeader className="pb-2 pt-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">AI Přehled</CardTitle>
              {insights?.metadata.isStale && (
                <Badge variant="secondary" className="text-xs">Zastaralé</Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setSettingsOpen(true)}
                title="Nastavení"
              >
                <Settings className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => fetchInsights(true)}
                disabled={refreshing}
                title="Aktualizovat"
              >
                <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          {/* Streaming loading state or content */}
          {isStreaming ? (
            <div className="flex items-center gap-3">
              <div className="h-2 w-2 bg-primary rounded-full animate-pulse" />
              <p className="text-sm text-muted-foreground">Generuji analýzu...</p>
            </div>
          ) : (
            insights?.overview && (() => {
              const highImpactSuggestions = insights.overview.suggestions.filter(s => s.impact === 'vysoký')
              const otherSuggestions = insights.overview.suggestions.filter(s => s.impact !== 'vysoký')
              const hasMoreContent =
                insights.overview.warnings.length > 1 ||
                highImpactSuggestions.length > 1 ||
                otherSuggestions.length > 0 ||
                insights.overview.narrative ||
                insights.overview.highlights.length > 0

              const healthScore = insights.overview.healthScore
              const scoreColors = healthScore ? getHealthScoreColor(healthScore.label) : null

              return (
                <>
                  {/* Health Score - Always visible */}
                  {healthScore && scoreColors && (
                    <div className="flex items-center gap-4 pb-3 border-b border-border/50">
                      <div className={cn(
                        'relative flex items-center justify-center w-14 h-14 rounded-full ring-4',
                        scoreColors.ring
                      )}>
                        <svg className="absolute w-14 h-14 -rotate-90">
                          <circle
                            cx="28"
                            cy="28"
                            r="24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="4"
                            className="text-muted/20"
                          />
                          <circle
                            cx="28"
                            cy="28"
                            r="24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="4"
                            strokeLinecap="round"
                            strokeDasharray={`${healthScore.score * 1.51} 151`}
                            className={scoreColors.bg.replace('bg-', 'text-')}
                          />
                        </svg>
                        <span className={cn('font-mono-numbers text-lg font-bold', scoreColors.text)}>
                          {healthScore.score}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={cn('text-sm font-semibold capitalize', scoreColors.text)}>
                            {healthScore.label}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {healthScore.description}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Always visible: first warning + first high-impact suggestion */}
                  <div className="space-y-2">
                    {insights.overview.warnings[0] && (
                      <div className="flex items-start gap-2 text-sm text-destructive">
                        <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                        <span>{insights.overview.warnings[0]}</span>
                      </div>
                    )}
                    {highImpactSuggestions[0] && (
                      <div className="flex items-start gap-2 text-sm">
                        <Badge className={cn('shrink-0', getImpactColor(highImpactSuggestions[0].impact))}>
                          {highImpactSuggestions[0].impact}
                        </Badge>
                        <span className="text-muted-foreground">{highImpactSuggestions[0].text}</span>
                      </div>
                    )}
                  </div>

                  {/* Expand button if there's more */}
                  {hasMoreContent && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setExpanded(!expanded)}
                        className="w-full justify-center gap-1 h-7 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50"
                      >
                        {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                        {expanded ? 'Méně' : `Zobrazit více (${insights.overview.warnings.length - 1 + highImpactSuggestions.length - 1 + otherSuggestions.length} dalších)`}
                      </Button>

                      {expanded && (
                        <div className="space-y-3 pt-2 border-t">
                          {/* Remaining warnings */}
                          {insights.overview.warnings.length > 1 && (
                            <div className="space-y-1">
                              {insights.overview.warnings.slice(1).map((warning, i) => (
                                <div key={i} className="flex items-start gap-2 text-sm text-destructive">
                                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                                  <span>{warning}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Remaining high-impact suggestions */}
                          {highImpactSuggestions.length > 1 && (
                            <div className="space-y-2">
                              {highImpactSuggestions.slice(1).map((suggestion) => (
                                <div key={suggestion.id} className="flex items-start gap-2 text-sm">
                                  <Badge className={cn('shrink-0', getImpactColor(suggestion.impact))}>
                                    {suggestion.impact}
                                  </Badge>
                                  <span className="text-muted-foreground">{suggestion.text}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Other suggestions */}
                          {otherSuggestions.length > 0 && (
                            <div className="space-y-2">
                              {otherSuggestions.map((suggestion) => (
                                <div key={suggestion.id} className="flex items-start gap-2 text-sm">
                                  <Badge className={cn('shrink-0', getImpactColor(suggestion.impact))}>
                                    {suggestion.impact}
                                  </Badge>
                                  <span className="text-muted-foreground">{suggestion.text}</span>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Highlights */}
                          {insights.overview.highlights.length > 0 && (
                            <ul className="space-y-1 text-sm text-muted-foreground">
                              {insights.overview.highlights.map((highlight, i) => (
                                <li key={i} className="flex items-start gap-2">
                                  <span className="text-primary">•</span>
                                  {highlight}
                                </li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </>
              )
            })()
          )}
        </CardContent>
      </Card>

      {/* Household Settings Dialog */}
      <HouseholdSettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onSave={() => fetchInsights(true)}
      />
    </div>
  )
}

// Suggestion Card Component
interface SuggestionCardProps {
  suggestion: Suggestion
  onFeedback: (isPositive: boolean) => void
  getImpactColor: (impact: Suggestion['impact']) => string
}

function SuggestionCard({ suggestion, onFeedback, getImpactColor }: SuggestionCardProps) {
  const [feedbackGiven, setFeedbackGiven] = useState<boolean | null>(null)

  const handleFeedback = (isPositive: boolean) => {
    setFeedbackGiven(isPositive)
    onFeedback(isPositive)
  }

  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border p-3">
      <div className="flex-1">
        <Badge className={cn('mb-2', getImpactColor(suggestion.impact))}>
          {suggestion.impact} dopad
        </Badge>
        <p className="text-sm">{suggestion.text}</p>
      </div>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'h-7 w-7',
            feedbackGiven === true && 'text-green-600 bg-green-100'
          )}
          onClick={() => handleFeedback(true)}
          disabled={feedbackGiven !== null}
        >
          <ThumbsUp className="h-3.5 w-3.5" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'h-7 w-7',
            feedbackGiven === false && 'text-red-600 bg-red-100'
          )}
          onClick={() => handleFeedback(false)}
          disabled={feedbackGiven !== null}
        >
          <ThumbsDown className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  )
}
