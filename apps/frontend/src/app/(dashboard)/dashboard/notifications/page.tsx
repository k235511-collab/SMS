'use client'

import { useEffect, useState, useCallback } from 'react'
import { ProtectedRoute } from '@/components/auth'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardBody } from '@/components/ui/card'
import { api } from '@/lib/api-client'
import { Bell, CheckCheck, Mail, MailOpen, Info, AlertTriangle, AlertCircle, Megaphone } from 'lucide-react'
import { toast } from 'sonner'

interface Notification {
  id: string
  title: string
  message: string
  type: string
  isRead: boolean
  createdAt: string
}

const typeIcons: Record<string, React.ReactNode> = {
  INFO: <Info className="h-4 w-4 text-blue-500" />,
  WARNING: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
  ALERT: <AlertCircle className="h-4 w-4 text-red-500" />,
  ANNOUNCEMENT: <Megaphone className="h-4 w-4 text-purple-500" />,
}

const typeColors: Record<string, string> = {
  INFO: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  WARNING: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  ALERT: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  ANNOUNCEMENT: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get<Notification[]>('/notifications/my')
      if (res.success && res.data) {
        setNotifications(Array.isArray(res.data) ? res.data : [])
      }
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const handleMarkRead = async (id: string) => {
    const res = await api.patch(`/notifications/${id}/read`, {})
    if (res.success) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      )
    }
  }

  const handleMarkAllRead = async () => {
    const res = await api.patch('/notifications/mark-all-read', {})
    if (res.success) {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
      toast.success('All notifications marked as read')
    }
  }

  const filtered = filter === 'unread' ? notifications.filter((n) => !n.isRead) : notifications
  const unreadCount = notifications.filter((n) => !n.isRead).length

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 7) return `${days}d ago`
    return d.toLocaleDateString()
  }

  return (
    <ProtectedRoute permission="notifications:read">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'All caught up!'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-border">
              <Button
                variant={filter === 'all' ? 'primary' : 'ghost'}
                size="sm"
                className="rounded-r-none"
                onClick={() => setFilter('all')}
              >
                All
              </Button>
              <Button
                variant={filter === 'unread' ? 'primary' : 'ghost'}
                size="sm"
                className="rounded-l-none"
                onClick={() => setFilter('unread')}
              >
                Unread {unreadCount > 0 && <Badge variant="destructive" className="ml-1 h-5 px-1.5">{unreadCount}</Badge>}
              </Button>
            </div>
            {unreadCount > 0 && (
              <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
                <CheckCheck className="mr-2 h-4 w-4" />
                Mark All Read
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardBody className="py-16 text-center">
              <Bell className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
              </p>
            </CardBody>
          </Card>
        ) : (
          <div className="space-y-2">
            {filtered.map((n) => (
              <Card
                key={n.id}
                className={`cursor-pointer transition-colors hover:bg-muted/30 ${!n.isRead ? 'border-primary/30 bg-primary/5' : ''}`}
                onClick={() => !n.isRead && handleMarkRead(n.id)}
              >
                <CardBody className="flex items-start gap-3 py-4">
                  <div className="mt-0.5">{typeIcons[n.type] || typeIcons.INFO}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-sm font-semibold text-foreground">{n.title}</span>
                      <Badge className={`text-xs ${typeColors[n.type] || typeColors.INFO}`}>
                        {n.type}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{n.message}</p>
                    <span className="text-xs text-muted-foreground mt-1 inline-block">{formatDate(n.createdAt)}</span>
                  </div>
                  <div className="mt-0.5">
                    {n.isRead ? (
                      <MailOpen className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Mail className="h-4 w-4 text-primary" />
                    )}
                  </div>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}
