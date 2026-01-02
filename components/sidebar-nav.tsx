'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Receipt,
  Wallet,
  TrendingUp,
  Target,
  Calculator,
  Download,
} from 'lucide-react'

const navItems = [
  { href: '/', label: 'Prehled', icon: LayoutDashboard },
  { href: '/vydaje', label: 'Vydaje', icon: Receipt },
  { href: '/prijmy', label: 'Prijmy', icon: Wallet },
  { href: '/investice', label: 'Investice', icon: TrendingUp },
  { href: '/cile', label: 'Cile', icon: Target },
  { href: '/pujcky', label: 'Pujcky', icon: Calculator },
  { href: '/export', label: 'Export', icon: Download },
]

export function SidebarNav() {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-56 border-r border-border bg-sidebar">
      <div className="flex h-full flex-col">
        {/* Logo / Brand */}
        <div className="flex h-16 items-center border-b border-border px-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-primary text-primary-foreground">
              <span className="font-display text-lg font-semibold">R</span>
            </div>
            <span className="font-display text-xl font-semibold tracking-tight">
              Rozpocet
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item, index) => {
            const isActive = pathname === item.href
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'group flex items-center gap-3 rounded px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  'opacity-0 animate-slide-in',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                )}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <Icon
                  className={cn(
                    'h-4 w-4 transition-transform duration-200',
                    !isActive && 'group-hover:scale-110'
                  )}
                />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-border p-4">
          <div className="text-xs text-muted-foreground">
            <div className="font-medium text-foreground">Rodinny rozpocet</div>
            <div className="mt-1">v1.0.0</div>
          </div>
        </div>
      </div>
    </aside>
  )
}
