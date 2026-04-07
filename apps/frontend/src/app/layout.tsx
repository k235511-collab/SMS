import type { Metadata, Viewport } from 'next'
import { Providers } from './providers'
import { ThemeScript } from '@/context/theme-context'
import './globals.css'

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
}

export const metadata: Metadata = {
  title: {
    default: 'SMS SaaS - School Management System',
    template: '%s | SMS SaaS',
  },
  description: 'Enterprise multi-tenant School Management System',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-screen bg-background font-sans text-foreground antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
