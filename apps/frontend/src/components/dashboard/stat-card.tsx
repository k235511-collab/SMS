'use client'

import { type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'

interface StatCardProps {
  label: string
  value: string | number
  icon: ReactNode
  description?: string
  href?: string
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info'
  loading?: boolean
  className?: string
  children?: ReactNode
}

const variantStyles = {
  default: 'border-border',
  primary: 'border-primary/20',
  success: 'border-success/20',
  warning: 'border-warning/20',
  danger: 'border-danger/20',
  info: 'border-blue-500/20',
}

const iconStyles = {
  default: 'bg-muted text-muted-foreground',
  primary: 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400',
  success: 'bg-success-50 text-success-600 dark:bg-success-900/20 dark:text-success-400',
  warning: 'bg-warning-50 text-warning-600 dark:bg-warning-900/20 dark:text-warning-400',
  danger: 'bg-danger-50 text-danger-600 dark:bg-danger-900/20 dark:text-danger-400',
  info: 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400',
}

export function StatCard({
  label,
  value,
  icon,
  description,
  variant = 'default',
  loading = false,
  className,
  children,
}: StatCardProps) {
  return (
    <Card
      className={cn(
        'p-5',
        variantStyles[variant],
        className,
      )}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          {loading ? (
            <Skeleton className="h-8 w-20" />
          ) : (
            <p className="text-2xl font-bold text-foreground tabular-nums">{value}</p>
          )}
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
        <div className={cn('rounded-xl p-3', iconStyles[variant])}>
          {icon}
        </div>
      </div>
      {children && <div className="mt-3">{children}</div>}
    </Card>
  )
}
