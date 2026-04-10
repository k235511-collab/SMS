'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { AuthProvider, useAuth } from '@/context/auth-context'
import { ThemeProvider } from '@/context/theme-context'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { Toaster } from '@/components/ui/sonner'
import { BrandSplash } from '@/components/ui/brand-splash'
import { GoogleOAuthProvider } from '@react-oauth/google'
import env from '@/lib/env'

/**
 * Shows a lightweight splash spinner while the initial session is being restored.
 * This prevents "half-loaded" UI flickers (Image 1).
 */
function RootLoader({ children }: { children: ReactNode }) {
  const { isLoading } = useAuth()
  const [showSplash, setShowSplash] = useState(false)

  useEffect(() => {
    if (!isLoading) {
      setShowSplash(false)
      return
    }

    // Avoid spinner flash on quick warm-session restores.
    const timer = window.setTimeout(() => {
      setShowSplash(true)
    }, 180)

    return () => {
      window.clearTimeout(timer)
    }
  }, [isLoading])

  if (isLoading) {
    // Keep the screen neutral during the grace window to avoid showing route-level
    // loading states before the global splash appears.
    if (!showSplash) return null
    return <BrandSplash />
  }

  return <>{children}</>
}



/**
 * Root client providers wrapper.
 * Order: ErrorBoundary → ThemeProvider → AuthProvider → RootLoader.
 * Toaster is rendered alongside children so toast() works everywhere.
 */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <GoogleOAuthProvider clientId={env.GOOGLE_CLIENT_ID}>
      <ErrorBoundary>
        <ThemeProvider defaultTheme="system">
          <AuthProvider>
            <RootLoader>
              {children}
              <Toaster position="top-right" richColors closeButton />
            </RootLoader>
          </AuthProvider>
        </ThemeProvider>
      </ErrorBoundary>
    </GoogleOAuthProvider>
  )
}
