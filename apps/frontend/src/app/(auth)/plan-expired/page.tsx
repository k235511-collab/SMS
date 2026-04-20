'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import { AlertTriangle, CalendarClock, ShieldAlert } from 'lucide-react'
import { Card, CardBody } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

function formatDate(value?: string | null): string | null {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return parsed.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default function PlanExpiredPage() {
  const searchParams = useSearchParams()

  const code = searchParams.get('code') || 'PLAN_EXPIRED'
  const schoolName = searchParams.get('schoolName')
  const expiryDate = formatDate(searchParams.get('expiry'))
  const backendMessage = searchParams.get('message')

  const content = useMemo(() => {
    if (code === 'SCHOOL_SUSPENDED') {
      return {
        title: 'School Access Suspended',
        description:
          backendMessage ||
          'Your school access is currently suspended. Please contact support to restore access.',
        icon: ShieldAlert,
      }
    }

    return {
      title: 'Subscription Expired',
      description:
        backendMessage ||
        'Your school subscription has expired. Renew your plan to continue using the dashboard.',
      icon: CalendarClock,
    }
  }, [backendMessage, code])

  const Icon = content.icon

  return (
    <Card>
      <CardBody className="space-y-6 p-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-warning/10 text-warning">
          <Icon className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">{content.title}</h2>
          <p className="text-sm text-muted-foreground">{content.description}</p>
        </div>

        {(schoolName || expiryDate) && (
          <div className="rounded-lg border border-border bg-muted/40 p-4 text-left text-sm">
            {schoolName && (
              <p className="text-foreground">
                <span className="font-medium">School:</span> {schoolName}
              </p>
            )}
            {expiryDate && (
              <p className="mt-1 text-foreground">
                <span className="font-medium">Expired On:</span> {expiryDate}
              </p>
            )}
          </div>
        )}

        <div className="rounded-lg border border-warning/30 bg-warning/5 p-3 text-xs text-muted-foreground">
          <div className="flex items-start gap-2 text-left">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <p>
              If you believe this is a mistake, contact your school administrator or support team with your school name.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button asChild>
            <Link href="/login">Back to login</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/register">Register new school</Link>
          </Button>
        </div>
      </CardBody>
    </Card>
  )
}
