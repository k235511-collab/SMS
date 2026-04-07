'use client'

import { useEffect, useState, useCallback } from 'react'
import { ProtectedRoute } from '@/components/auth'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardBody } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { calendarService } from '@/services/calendar.service'
import { AddEventDialog } from '@/components/forms/add-event-dialog'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Trash2, Clock, CalendarCheck } from 'lucide-react'
import { useSession } from '@/context/session-context'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

interface CalEvent {
    id: string; title: string; description?: string; startDate: string; endDate?: string
    allDay?: boolean; type?: string; color?: string; isPublic?: boolean
}

const typeColors: Record<string, string> = {
    GENERAL: 'bg-blue-500', HOLIDAY: 'bg-green-500', EXAM: 'bg-red-500',
    MEETING: 'bg-purple-500', ACTIVITY: 'bg-orange-500', DEADLINE: 'bg-pink-500',
}

export default function CalendarPage() {
    const { selectedCampus } = useSession()
    const [events, setEvents] = useState<CalEvent[]>([])
    const [activeTab, setActiveTab] = useState('upcoming')
    const [currentMonth, setCurrentMonth] = useState(new Date())
    const [loading, setLoading] = useState(true)
    const [eventToDelete, setEventToDelete] = useState<string | null>(null)

    const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
    const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)

    const fetchEvents = useCallback(async () => {
        setLoading(true)
        try {
            const res = await calendarService.getEvents({
                startDate: new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 6).toISOString(),
                endDate: new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 6).toISOString(),
            })
            if (res.success && Array.isArray(res.data)) {
                // Ensure every event has a valid ID to prevent duplicate key errors
                const validEvents = res.data.filter(e => {
                    const hasId = e && e.id && e.id.trim() !== ''
                    if (!hasId) console.warn('DEBUG: Found event with empty or missing ID:', e)
                    return hasId
                })
                setEvents(validEvents)
            }
        } finally {
            setLoading(false)
        }
    }, [currentMonth, selectedCampus])

    useEffect(() => { fetchEvents() }, [fetchEvents])

    const handleDelete = async () => {
        if (!eventToDelete) return
        try {
            const res = await calendarService.deleteEvent(eventToDelete)
            if (res.success) {
                toast.success('Event deleted successfully')
                fetchEvents()
            } else {
                toast.error(res.message || 'Failed to delete event')
            }
        } catch (error) {
            toast.error('An error occurred while deleting the event')
        } finally {
            setEventToDelete(null)
        }
    }

    const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))
    const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))

    // Generate calendar grid
    const firstDay = startOfMonth.getDay()
    const daysInMonth = endOfMonth.getDate()
    const weeks: (number | null)[][] = []
    let week: (number | null)[] = Array(firstDay).fill(null)
    for (let d = 1; d <= daysInMonth; d++) {
        week.push(d)
        if (week.length === 7) { weeks.push(week); week = [] }
    }
    if (week.length > 0) { while (week.length < 7) week.push(null); weeks.push(week) }

    const getEventsForDay = (day: number) => events.filter(e => {
        const eventDate = new Date(e.startDate)
        return eventDate.getDate() === day && 
               eventDate.getMonth() === currentMonth.getMonth() && 
               eventDate.getFullYear() === currentMonth.getFullYear()
    })

    const fmt = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' })

    const now = new Date()
    const upcomingEvents = events.filter(e => new Date(e.startDate) >= now).sort((a,b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    const pastEvents = events.filter(e => new Date(e.startDate) < now).sort((a,b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime())

    return (
        <ProtectedRoute permission="calendar:read">
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                            <CalendarIcon className="h-6 w-6 text-primary" /> Calendar
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">Manage school events and academic schedules</p>
                    </div>
                    <AddEventDialog onSuccess={fetchEvents} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Calendar View */}
                    <Card className="lg:col-span-2 border-none shadow-xl bg-card/50 backdrop-blur-sm">
                        <CardBody className="p-6">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-4">
                                    <h2 className="text-xl font-bold">{fmt.format(currentMonth)}</h2>
                                    <div className="flex bg-muted/50 rounded-lg p-1">
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevMonth} aria-label="Previous month"><ChevronLeft className="h-4 w-4" /></Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextMonth} aria-label="Next month"><ChevronRight className="h-4 w-4" /></Button>
                                    </div>
                                </div>
                                <Button variant="outline" size="sm" onClick={() => setCurrentMonth(new Date())}>Today</Button>
                            </div>

                            <div className="grid grid-cols-7 gap-3 mb-4">
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                                    <div key={d} className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">{d}</div>
                                ))}
                            </div>

                            <div className="grid grid-cols-7 gap-3">
                                {weeks.flat().map((day, i) => {
                                    const dayEvents = day ? getEventsForDay(day) : []
                                    const isToday = day && new Date().getDate() === day && new Date().getMonth() === currentMonth.getMonth() && new Date().getFullYear() === currentMonth.getFullYear()
                                    
                                    return (
                                        <div key={i} className={`relative min-h-[100px] rounded-xl border p-2 transition-all duration-200 ${!day ? 'bg-muted/5 border-transparent opacity-40' : 'bg-card border-border hover:border-primary/50 hover:shadow-md'} ${isToday ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}>
                                            {day && (
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className={`text-sm font-bold ${isToday ? 'text-primary' : 'text-foreground'}`}>{day}</span>
                                                    {isToday && <div className="w-1.5 h-1.5 rounded-full bg-primary" />}
                                                </div>
                                            )}
                                            <div className="space-y-1 overflow-hidden">
                                                {dayEvents.slice(0, 3).map(e => (
                                                    <div key={`grid-event-${e.id}`} className={`group relative text-[9px] px-2 py-1 rounded-md font-medium truncate text-white ${typeColors[e.type || 'GENERAL'] || typeColors.GENERAL} hover:brightness-110 cursor-pointer transition-all`}>
                                                        {e.title}
                                                    </div>
                                                ))}
                                                {dayEvents.length > 3 && (
                                                    <p className="text-[9px] font-semibold text-muted-foreground pl-1">+{dayEvents.length - 3} more</p>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </CardBody>
                    </Card>

                    {/* Events List View */}
                    <div className="space-y-6">
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className="grid w-full grid-cols-2 p-1 bg-muted/50 rounded-xl mb-6">
                                <TabsTrigger value="upcoming" className="rounded-lg gap-2">
                                    <CalendarCheck className="h-4 w-4" /> Upcoming
                                </TabsTrigger>
                                <TabsTrigger value="past" className="rounded-lg gap-2">
                                    <Clock className="h-4 w-4" /> Past
                                </TabsTrigger>
                            </TabsList>

                            <AnimatePresence mode="wait">
                                <motion.div 
                                    key={activeTab}
                                    initial={{ opacity: 0, y: 10 }} 
                                    animate={{ opacity: 1, y: 0 }} 
                                    exit={{ opacity: 0, y: -10 }} 
                                    className="space-y-4"
                                >
                                    {activeTab === 'upcoming' ? (
                                        upcomingEvents.length > 0 ? upcomingEvents.map(e => (
                                            <EventCard key={`list-event-${e.id}`} event={e} onDelete={() => setEventToDelete(e.id)} />
                                        )) : (
                                            <EmptyState message="No upcoming events" />
                                        )
                                    ) : (
                                        pastEvents.length > 0 ? pastEvents.map(e => (
                                            <EventCard key={`list-event-${e.id}`} event={e} onDelete={() => setEventToDelete(e.id)} />
                                        )) : (
                                            <EmptyState message="No past events found" />
                                        )
                                    )}
                                </motion.div>
                            </AnimatePresence>
                        </Tabs>
                    </div>
                </div>

                {/* Deletion Confirmation Dialog */}
                <AlertDialog open={!!eventToDelete} onOpenChange={() => setEventToDelete(null)}>
                    <AlertDialogContent className="rounded-2xl border-none shadow-2xl">
                        <AlertDialogHeader>
                            <AlertDialogTitle className="text-xl font-bold">Delete Event</AlertDialogTitle>
                            <AlertDialogDescription className="text-muted-foreground">
                                Are you sure you want to delete this event? This action cannot be undone.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter className="gap-2">
                            <AlertDialogCancel className="rounded-xl border-muted">Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete} className="rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground">Delete Event</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </ProtectedRoute>
    )
}

function EventCard({ event, onDelete }: { event: CalEvent; onDelete: () => void }) {
    return (
        <Card className="group border-none shadow-md hover:shadow-xl transition-all duration-300 bg-card/40 backdrop-blur-sm overflow-hidden">
            <CardBody className="p-4">
                <div className="flex items-start justify-between">
                    <div className="flex gap-4">
                        <div className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 shadow-[0_0_10px_rgba(0,0,0,0.1)] ${typeColors[event.type || 'GENERAL'] || typeColors.GENERAL}`} />
                        <div className="space-y-1">
                            <h4 className="text-sm font-bold text-foreground group-hover:text-primary transition-colors">{event.title}</h4>
                            {event.description && <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{event.description}</p>}
                            <div className="flex items-center gap-3 pt-1">
                                <span className="text-[10px] font-semibold text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-md">
                                    {new Date(event.startDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                </span>
                                <Badge variant="secondary" className="text-[9px] uppercase tracking-wider font-bold">
                                    {event.type || 'GENERAL'}
                                </Badge>
                            </div>
                        </div>
                    </div>
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-200"
                        onClick={(e) => { e.stopPropagation(); onDelete(); }}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                </div>
            </CardBody>
        </Card>
    )
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="flex flex-col items-center justify-center p-8 text-center rounded-2xl border-2 border-dashed border-muted bg-muted/5">
            <CalendarIcon className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">{message}</p>
        </div>
    )
}
