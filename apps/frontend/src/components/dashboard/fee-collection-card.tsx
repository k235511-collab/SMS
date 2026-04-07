'use client'

import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'

interface FeeCollectionCardProps {
  title: string
  received: number
  loading?: boolean
  variant: 'today' | 'monthly' | 'yearly' | 'pending' | 'arrears'
  currency?: string
}

const variantColors = {
  today: {
    header: 'bg-blue-500',
    label: 'Received',
  },
  monthly: {
    header: 'bg-amber-500',
    label: 'Received',
  },
  yearly: {
    header: 'bg-rose-500',
    label: 'Received',
  },
  pending: {
    header: 'bg-purple-500',
    label: 'Total Pending',
  },
  arrears: {
    header: 'bg-orange-500',
    label: 'Previous Year Dues',
  },
}

export function FeeCollectionCard({
  title,
  received,
  loading = false,
  variant,
  currency = 'PKR',
}: FeeCollectionCardProps) {
  const colors = variantColors[variant]

  if (loading) {
    return (
      <Card className="overflow-hidden border-border bg-card shadow-sm">
        <div className={cn('px-4 py-2.5 text-center', colors.header)}>
          <Skeleton className="h-4 w-32 mx-auto bg-white/30" />
        </div>
        <div className="p-5 space-y-3">
          <Skeleton className="h-4 w-20 mx-auto" />
          <Skeleton className="h-7 w-40 mx-auto" />
        </div>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden border-border bg-card shadow-sm">
      <div className={cn('px-4 py-2.5 text-center text-white text-xs font-bold uppercase tracking-wider', colors.header)}>
        {title}
      </div>
      <div className="p-5 text-center">
        <p className="text-sm text-muted-foreground">{colors.label}</p>
        <p className={cn(
          "text-2xl font-bold tabular-nums mt-1",
          variant === 'pending' || variant === 'arrears' ? "text-rose-600 dark:text-rose-400" : "text-foreground"
        )}>
          {received.toLocaleString()} {currency}
        </p>
      </div>
    </Card>
  )
}
