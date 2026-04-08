'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { Card, CardBody } from '@/components/ui/card'
import { ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface StatCardProps {
  /** Label displayed above the value */
  label: string
  /** Primary value (number or formatted string) */
  value: ReactNode
  /** Lucide icon component */
  icon: React.ComponentType<{ className?: string }>
  /** Background color class for the icon container, e.g. "bg-blue-500" */
  color: string
  /** Optional link — makes the entire card clickable */
  href?: string
  className?: string
}

export function StatCard({ label, value, icon: Icon, color, href, className }: StatCardProps) {
  const inner = (
    <Card className={cn('group transition-all hover:shadow-lg', className)}>
      <CardBody className="flex items-center gap-4 p-5">
        <div className={cn('shrink-0 rounded-xl p-3 text-white', color)}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            {label}
          </p>
          <p className="mt-1 overflow-visible whitespace-normal break-words text-2xl font-bold leading-tight tabular-nums text-foreground">
            {value}
          </p>
        </div>
        {href && (
          <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        )}
      </CardBody>
    </Card>
  )

  if (href) {
    return <Link href={href}>{inner}</Link>
  }

  return inner
}
