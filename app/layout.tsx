import type { Metadata } from 'next'
import { Suspense } from 'react'
import './globals.css'
import { SidebarNav } from '@/components/sidebar-nav'
import { MainLayout } from '@/components/main-layout'
import { SidebarProvider } from '@/lib/sidebar-context'

export const metadata: Metadata = {
  title: 'Rodinný rozpočet',
  description: 'Aplikace pro správu rodinného rozpočtu',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="cs">
      <body className="antialiased">
        <SidebarProvider>
          <SidebarNav />
          <Suspense fallback={null}>
            <MainLayout>{children}</MainLayout>
          </Suspense>
        </SidebarProvider>
      </body>
    </html>
  )
}
