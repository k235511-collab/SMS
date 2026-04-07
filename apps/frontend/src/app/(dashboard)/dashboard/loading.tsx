import { Spinner } from '@/components/ui/spinner'

export default function DashboardLoading() {
  return (
    <div className="flex min-h-[400px] flex-col items-center justify-center gap-3">
      <Spinner size="lg" />
      <p className="text-sm text-muted-foreground animate-pulse">Loading dashboard...</p>
    </div>
  )
}
