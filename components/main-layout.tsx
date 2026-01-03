'use client'

interface MainLayoutProps {
  children: React.ReactNode
}

/**
 * Main layout wrapper for pages with sidebar offset
 * Note: Period management is handled by individual pages via useMonthlyData hook
 */
export function MainLayout({ children }: MainLayoutProps) {
  return (
    <main className="ml-56 min-h-screen">
      <div className="px-8 py-8">{children}</div>
    </main>
  )
}
