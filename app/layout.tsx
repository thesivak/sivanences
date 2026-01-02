import type { Metadata } from 'next'
import { Suspense } from 'react'
import './globals.css'
import { SidebarNav } from '@/components/sidebar-nav'
import { MainLayout } from '@/components/main-layout'

export const metadata: Metadata = {
  title: 'Rodinny rozpocet',
  description: 'Aplikace pro spravu rodinneho rozpoctu',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="cs">
      <body className="antialiased">
        <SidebarNav />
        <Suspense fallback={null}>
          <MainLayout>{children}</MainLayout>
        </Suspense>
      </body>
    </html>
  )
}
