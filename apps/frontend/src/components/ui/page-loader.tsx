import { cn } from '@/lib/utils'

interface PageLoaderProps {
  /** Optional message shown below the spinner */
  message?: string
  /** Fill the full viewport height instead of just the container */
  fullScreen?: boolean
  className?: string
}

/**
 * Reusable page-level loading spinner.
 * Uses the same spinning animation as DataTable's loading overlay.
 */
export function PageLoader({ message = 'Loading...', fullScreen = false, className }: PageLoaderProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3',
        fullScreen ? 'min-h-screen' : 'min-h-[60vh]',
        className,
      )}
    >
      <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-primary-600 border-t-transparent" />
      {message && <p className="text-sm text-muted-foreground">{message}</p>}
    </div>
  )
}
