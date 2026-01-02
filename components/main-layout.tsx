'use client'

import { useState, useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { AiInsightsSidebar } from '@/components/ai-insights-sidebar'
import { Sparkles } from 'lucide-react'
import { getCurrentPeriod } from '@/lib/format'

interface MainLayoutProps {
  children: React.ReactNode
}

export function MainLayout({ children }: MainLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [period, setPeriod] = useState(getCurrentPeriod())
  const pathname = usePathname()
  const searchParams = useSearchParams()

  // Update period from URL params if available
  useEffect(() => {
    const yearParam = searchParams.get('year')
    const monthParam = searchParams.get('month')

    if (yearParam && monthParam) {
      setPeriod({
        year: parseInt(yearParam),
        month: parseInt(monthParam),
      })
    } else {
      setPeriod(getCurrentPeriod())
    }
  }, [searchParams])

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  return (
    <>
      <main className="ml-56 min-h-screen">
        <div className="px-8 py-8">{children}</div>
      </main>

      {/* Floating AI Insights Button */}
      <Button
        onClick={() => setSidebarOpen(true)}
        className="fixed bottom-6 right-6 z-30 h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
        size="icon"
        title="AI Postrehy"
      >
        <Sparkles className="h-6 w-6" />
      </Button>

      {/* AI Insights Sidebar */}
      <AiInsightsSidebar
        year={period.year}
        month={period.month}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
    </>
  )
}
