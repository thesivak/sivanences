'use client'

import { useState, useEffect, useCallback } from 'react'
import { getCurrentPeriod } from '@/lib/format'

export interface Period {
  year: number
  month: number
}

export interface UseMonthlyDataOptions<T> {
  endpoint: string
  initialPeriod?: Period
}

export interface UseMonthlyDataReturn<T> {
  data: T | null
  loading: boolean
  error: Error | null
  period: Period
  setPeriod: (period: Period) => void
  refetch: () => Promise<void>
}

/**
 * Custom hook for fetching monthly data with period selection
 * Eliminates duplicate data fetching logic across pages
 */
export function useMonthlyData<T>({
  endpoint,
  initialPeriod = getCurrentPeriod(),
}: UseMonthlyDataOptions<T>): UseMonthlyDataReturn<T> {
  const [period, setPeriod] = useState<Period>(initialPeriod)
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const url = `${endpoint}?year=${period.year}&month=${period.month}`
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.statusText}`)
      }

      const json = await response.json()
      setData(json)
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error')
      setError(error)
      console.error(`Failed to fetch from ${endpoint}:`, error)
    } finally {
      setLoading(false)
    }
  }, [endpoint, period.year, period.month])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return {
    data,
    loading,
    error,
    period,
    setPeriod,
    refetch: fetchData,
  }
}
