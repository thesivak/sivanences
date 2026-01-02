import type { Metadata } from 'next'
import './globals.css'
import { SidebarNav } from '@/components/sidebar-nav'

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
        <main className="ml-56 min-h-screen">
          <div className="px-8 py-8">{children}</div>
        </main>
      </body>
    </html>
  )
}
