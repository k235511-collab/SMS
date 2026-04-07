'use client'

import { useState, useEffect, type ReactNode } from 'react'
import { AuthProvider, useAuth } from '@/context/auth-context'
import { ThemeProvider } from '@/context/theme-context'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { Toaster } from '@/components/ui/sonner'
import { BrandSplash } from '@/components/ui/brand-splash'
import { GoogleOAuthProvider } from '@react-oauth/google'
import env from '@/lib/env'

/**
 * Shows the branded splash screen while the initial session is being restored.
 * This prevents "half-loaded" UI flickers (Image 1).
 */
function RootLoader({ children }: { children: ReactNode }) {
  const { isLoading, user } = useAuth()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  // If we are restored or truly not logged in, show children
  // Otherwise show the branded splash
  if (isLoading) {
    // Attempt to get branding from localStorage for a premium experience
    // Note: We only access localStorage after mount to avoid hydration mismatch
    const cachedLogo = mounted ? localStorage.getItem('sms_last_school_logo') : null
    const cachedName = mounted ? localStorage.getItem('sms_last_school_name') : null

    return (
      <BrandSplash
        logo={user?.schoolLogo || cachedLogo || undefined}
        schoolName={user?.schoolName || cachedName || undefined}
      />
    )
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
