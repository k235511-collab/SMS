'use client'

import { ErrorFallback } from '@/components/ui/error-fallback'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <ErrorFallback
      error={error}
      reset={reset}
      title="Dashboard Error"
      description="An error occurred while loading the dashboard. Please try again."
    />
  )
}
