'use client'

import { ErrorFallback } from '@/components/ui/error-fallback'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background antialiased">
        <ErrorFallback
          error={error}
          reset={reset}
          title="Application Error"
          description="A critical error occurred. Our team has been notified."
        />
      </body>
    </html>
  )
}
