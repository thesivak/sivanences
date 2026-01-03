'use client'

import { cn } from '@/lib/utils'
import { useSidebar } from '@/lib/sidebar-context'

interface MainLayoutProps {
  children: React.ReactNode
}

/**
 * Main layout wrapper for pages with sidebar offset
 * Note: Period management is handled by individual pages via useMonthlyData hook
 */
export function MainLayout({ children }: MainLayoutProps) {
  const { expanded } = useSidebar()

  return (
    <main className={cn('min-h-screen transition-all duration-200', expanded ? 'ml-44' : 'ml-14')}>
      <div className="px-6 py-6">{children}</div>
    </main>
  )
}
