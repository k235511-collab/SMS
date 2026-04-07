'use client'

import { CalendarDays } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { Card } from '@/components/ui/card'

interface CalendarEvent {
  id: string
  title: string
  startDate: string
  endDate: string | null
  type: string
}

interface UpcomingEventsProps {
  events: CalendarEvent[]
  loading?: boolean
}

const typeColors: Record<string, string> = {
  HOLIDAY: 'bg-rose-100 text-rose-700 dark:bg-rose-900 dark:text-rose-300',
  EXAM: 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300',
  MEETING: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  EVENT: 'bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300',
  OTHER: 'bg-muted text-muted-foreground',
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatDay(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { weekday: 'short' })
}

export function UpcomingEvents({ events, loading = false }: UpcomingEventsProps) {
  if (loading) {
    return (
      <Card className="p-5 space-y-4">
        <Skeleton className="h-5 w-36" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-12 w-12 rounded-lg" />
            <div className="flex-1 space-y-1">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-3 w-20" />
            </div>
          </div>
        ))}
      </Card>
    )
  }

  return (
    <Card className="p-5 space-y-4">
      <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
        <CalendarDays className="h-4 w-4 text-muted-foreground" />
        Upcoming Events
      </h3>

      {events.length === 0 ? (
        <p className="text-sm text-muted-foreground py-4 text-center">
          No upcoming events scheduled
        </p>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <div
              key={event.id}
              className="flex items-start gap-3 rounded-lg border border-border/50 p-3 transition-colors hover:bg-accent/50"
            >
              {/* Date badge */}
              <div className="flex flex-col items-center rounded-lg bg-primary/10 px-3 py-1.5 min-w-[3.5rem]">
                <span className="text-[10px] font-semibold text-primary uppercase">
                  {formatDay(event.startDate)}
                </span>
                <span className="text-sm font-bold text-primary leading-tight">
                  {formatDate(event.startDate)}
                </span>
              </div>

              {/* Event info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {event.title}
                </p>
                <span
                  className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${typeColors[event.type] || typeColors.OTHER}`}
                >
                  {event.type}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
