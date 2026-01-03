'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { NAV_ITEMS } from '@/lib/types'
import { useSidebar } from '@/lib/sidebar-context'
import {
  LayoutDashboard,
  Receipt,
  Wallet,
  TrendingUp,
  Target,
  Calculator,
  Download,
  ChevronLeft,
  ChevronRight,
  type LucideIcon,
} from 'lucide-react'

// Icon mapping - maps string names to actual icon components
const iconMap: Record<string, LucideIcon> = {
  LayoutDashboard,
  Receipt,
  Wallet,
  TrendingUp,
  Target,
  Calculator,
  Download,
}

export function SidebarNav() {
  const pathname = usePathname()
  const { expanded, isLoading, toggle } = useSidebar()

  return (
    <aside
      className={cn(
        'fixed left-0 top-0 z-40 h-screen border-r border-border bg-sidebar transition-all duration-200 overflow-hidden',
        expanded ? 'w-44' : 'w-14'
      )}
    >
      <div className="flex h-full flex-col w-44">
        {/* Logo / Brand */}
        <div className="flex h-14 items-center border-b border-border px-3">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-primary text-primary-foreground">
              <span className="font-display text-lg font-semibold">R</span>
            </div>
            <span
              className={cn(
                'font-display text-lg font-semibold tracking-tight whitespace-nowrap transition-opacity duration-200',
                expanded ? 'opacity-100' : 'opacity-0'
              )}
            >
              Rozpočet
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV_ITEMS.map((item, index) => {
            const isActive = pathname === item.href
            const Icon = iconMap[item.icon] || LayoutDashboard

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'group flex items-center gap-2 rounded px-2 py-2 text-sm font-medium transition-all duration-200',
                  'opacity-0 animate-slide-in',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                )}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span
                  className={cn(
                    'whitespace-nowrap transition-opacity duration-200',
                    expanded ? 'opacity-100' : 'opacity-0'
                  )}
                >
                  {item.label}
                </span>
              </Link>
            )
          })}
        </nav>

        {/* Toggle button and footer */}
        <div className="border-t border-border p-2">
          <button
            onClick={toggle}
            disabled={isLoading}
            className={cn(
              'flex items-center rounded p-2 text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors',
              expanded ? 'w-full justify-center' : 'w-8 justify-center'
            )}
            aria-label={expanded ? 'Sbalit menu' : 'Rozbalit menu'}
          >
            {expanded ? (
              <>
                <ChevronLeft className="h-4 w-4 shrink-0" />
                <span className="ml-2 text-sm">Sbalit</span>
              </>
            ) : (
              <ChevronRight className="h-4 w-4 shrink-0" />
            )}
          </button>
          {expanded && (
            <div className="mt-2 text-xs text-muted-foreground">
              <div className="font-medium text-foreground">Rodinný rozpočet</div>
              <div className="mt-0.5">v1.0.0</div>
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}
