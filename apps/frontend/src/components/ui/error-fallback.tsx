'use client'

import { useRouter } from 'next/navigation'

interface ErrorFallbackProps {
  error?: Error
  /** Custom heading */
  title?: string
  /** Custom description */
  description?: string
  /** Reset the error boundary */
  reset?: () => void
  /** Show a "Go back" button */
  showBack?: boolean
}

/**
 * Reusable error fallback component for error boundaries and error.tsx files.
 */
export function ErrorFallback({
  error,
  reset,
  title = 'Something went wrong',
  description,
  showBack = true,
}: ErrorFallbackProps) {
  const router = useRouter()

  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-6 p-8">
      <div className="rounded-full bg-danger-50 p-4">
        <svg
          className="h-10 w-10 text-danger-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
          />
        </svg>
      </div>

      <div className="text-center">
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          {description || error?.message || 'An unexpected error occurred. Please try again.'}
        </p>
      </div>

      <div className="flex gap-3">
        {showBack && (
          <button
            onClick={() => router.back()}
            className="rounded-lg border border-input bg-card px-4 py-2 text-sm font-medium text-foreground hover:bg-accent transition-colors"
          >
            Go back
          </button>
        )}
        <button
          onClick={() => (reset ? reset() : window.location.reload())}
          className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary-700 transition-colors"
        >
          {reset ? 'Try again' : 'Reload page'}
        </button>
      </div>
    </div>
  )
}
