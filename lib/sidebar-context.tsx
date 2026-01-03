'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface SidebarContextType {
  expanded: boolean
  isLoading: boolean
  toggle: () => void
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [expanded, setExpanded] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // Fetch initial state from database
  useEffect(() => {
    fetch('/api/settings/sidebar')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setExpanded(data.data.expanded)
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false))
  }, [])

  // Toggle and save to database
  const toggle = async () => {
    const newExpanded = !expanded
    setExpanded(newExpanded)

    try {
      await fetch('/api/settings/sidebar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ expanded: newExpanded }),
      })
    } catch (error) {
      console.error('Failed to save sidebar state:', error)
    }
  }

  return (
    <SidebarContext.Provider value={{ expanded, isLoading, toggle }}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const context = useContext(SidebarContext)
  if (context === undefined) {
    throw new Error('useSidebar must be used within a SidebarProvider')
  }
  return context
}
