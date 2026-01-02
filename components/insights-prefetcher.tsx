'use client'

import { useEffect, useRef } from 'react'
import type { InsightSection } from '@/lib/ai-prompts'

// Only prefetch individual sections - dashboard uses executive summary from these
const PREFETCH_SECTIONS: InsightSection[] = [
  'expenses',
  'income',
  'investments',
  'goals',
  'loans',
]

interface InsightsPrefetcherProps {
  year: number
  month: number
}

/**
 * Invisible component that prefetches fresh AI insights for all sections
 * on page load. Results are saved to the database so individual
 * AiInsightCard components will find fresh data when they load.
 */
export function InsightsPrefetcher({ year, month }: InsightsPrefetcherProps) {
  const hasPrefetched = useRef(false)

  useEffect(() => {
    // Only prefetch once per mount
    if (hasPrefetched.current) return
    hasPrefetched.current = true

    // Fire off all prefetch requests in parallel (low priority)
    const prefetchAll = async () => {
      const requests = PREFETCH_SECTIONS.map((section) =>
        fetch('/api/ai-insights', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            section,
            year,
            month,
            forceRefresh: true,
          }),
          // Use low priority to not block other requests
          priority: 'low',
        } as RequestInit).catch(() => {
          // Silently ignore prefetch errors
        })
      )

      await Promise.allSettled(requests)
    }

    // Start prefetching after a short delay to prioritize visible content
    const timeoutId = setTimeout(prefetchAll, 500)

    return () => clearTimeout(timeoutId)
  }, [year, month])

  // Render nothing - this is just for side effects
  return null
}
