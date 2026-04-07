'use client'

import { cn } from '@/lib/utils'

type StatusVariant =
  | 'ACTIVE'
  | 'INACTIVE'
  | 'LEFT'
  | 'TRANSFERRED'
  | 'SUSPENDED'
  | 'GRADUATED'
  | 'PENDING'
  | 'PAID'
  | 'OVERDUE'
  | 'PARTIAL'
  | 'CANCELLED'
  | 'DRAFT'
  | 'PUBLISHED'
  | 'COMPLETED'
  | string

const statusConfig: Record<string, { label: string; classes: string }> = {
  ACTIVE: {
    label: 'Active',
    classes: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
  INACTIVE: {
    label: 'Inactive',
    classes: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  },
  LEFT: {
    label: 'Left',
    classes: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  },
  TRANSFERRED: {
    label: 'Transferred',
    classes: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
  SUSPENDED: {
    label: 'Suspended',
    classes: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
  GRADUATED: {
    label: 'Graduated',
    classes: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  },
  PENDING: {
    label: 'Pending',
    classes: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  },
  PAID: {
    label: 'Paid',
    classes: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
  OVERDUE: {
    label: 'Overdue',
    classes: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
  PARTIAL: {
    label: 'Partial',
    classes: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  },
  CANCELLED: {
    label: 'Cancelled',
    classes: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  },
  DRAFT: {
    label: 'Draft',
    classes: 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400',
  },
  PUBLISHED: {
    label: 'Published',
    classes: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  },
  COMPLETED: {
    label: 'Completed',
    classes: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
  APPROVED: {
    label: 'Approved',
    classes: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  },
  REJECTED: {
    label: 'Rejected',
    classes: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  },
}

export interface StatusBadgeProps {
  status: StatusVariant
  /** Override the displayed label */
  label?: string
  className?: string
  /** Size variant */
  size?: 'xs' | 'sm'
}

export function StatusBadge({ status, label, className, size = 'xs' }: StatusBadgeProps) {
  const config = statusConfig[status] ?? {
    label: status,
    classes: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        size === 'xs' && 'px-2 py-0.5 text-[0.625rem]',
        size === 'sm' && 'px-2.5 py-0.5 text-xs',
        config.classes,
        className,
      )}
    >
      {label ?? config.label}
    </span>
  )
}
