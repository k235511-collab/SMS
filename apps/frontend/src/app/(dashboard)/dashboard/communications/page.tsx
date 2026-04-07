'use client'

import { useEffect, useState, useCallback } from 'react'
import { ProtectedRoute } from '@/components/auth'
import { Button } from '@/components/ui/button'
import { Card, CardBody } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { communicationsService } from '@/services/communications.service'
import { MessageSquare, Mail, Phone, Clock } from 'lucide-react'
import { useSession } from '@/context/session-context'

interface LogEntry {
    id: string; channel: string; recipient: string; subject?: string
    message: string; status: string; sentAt: string
}

const channelIcons: Record<string, any> = {
    SMS_CHANNEL: Phone, EMAIL: Mail, WHATSAPP: MessageSquare,
}
const channelColors: Record<string, string> = {
    SMS_CHANNEL: 'bg-blue-100 text-blue-700', EMAIL: 'bg-green-100 text-green-700', WHATSAPP: 'bg-emerald-100 text-emerald-700',
}

export default function CommunicationsPage() {
    const { selectedCampus } = useSession()
    const [logs, setLogs] = useState<LogEntry[]>([])
    const [loading, setLoading] = useState(false)
    const [channel, setChannel] = useState<string>('')

    const fetchLogs = useCallback(async () => {
        setLoading(true)
        const res = await communicationsService.getLogs({ channel: channel || undefined })
        if (res.success && res.data) {
            const items = res.data.data || (Array.isArray(res.data) ? res.data : [])
            setLogs(items)
        }
        setLoading(false)
    }, [channel, selectedCampus])

    useEffect(() => { fetchLogs() }, [fetchLogs])

    return (
        <ProtectedRoute permission="communications:read">
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                            <MessageSquare className="h-6 w-6" /> Communications
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">Send messages and view communication history</p>
                    </div>
                </div>

                {/* Quick send cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                        <CardBody className="flex items-center gap-3 py-5">
                            <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                                <Phone className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                                <p className="font-semibold">Send SMS</p>
                                <p className="text-xs text-muted-foreground">Send text messages to parents/staff</p>
                            </div>
                        </CardBody>
                    </Card>
                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                        <CardBody className="flex items-center gap-3 py-5">
                            <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900/30">
                                <Mail className="h-6 w-6 text-green-600" />
                            </div>
                            <div>
                                <p className="font-semibold">Send Email</p>
                                <p className="text-xs text-muted-foreground">Send email notifications</p>
                            </div>
                        </CardBody>
                    </Card>
                    <Card className="hover:shadow-md transition-shadow cursor-pointer">
                        <CardBody className="flex items-center gap-3 py-5">
                            <div className="p-3 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                                <MessageSquare className="h-6 w-6 text-emerald-600" />
                            </div>
                            <div>
                                <p className="font-semibold">Send WhatsApp</p>
                                <p className="text-xs text-muted-foreground">WhatsApp business messages</p>
                            </div>
                        </CardBody>
                    </Card>
                </div>

                {/* Channel filter */}
                <div className="flex items-center gap-2">
                    <Button variant={!channel ? 'primary' : 'outline'} size="sm" onClick={() => setChannel('')}>All</Button>
                    <Button variant={channel === 'SMS_CHANNEL' ? 'primary' : 'outline'} size="sm" onClick={() => setChannel('SMS_CHANNEL')}>SMS</Button>
                    <Button variant={channel === 'EMAIL' ? 'primary' : 'outline'} size="sm" onClick={() => setChannel('EMAIL')}>Email</Button>
                    <Button variant={channel === 'WHATSAPP' ? 'primary' : 'outline'} size="sm" onClick={() => setChannel('WHATSAPP')}>WhatsApp</Button>
                </div>

                {/* Logs */}
                <div className="space-y-2">
                    <h3 className="text-lg font-semibold flex items-center gap-2"><Clock className="h-5 w-5" /> Recent Messages</h3>
                    {loading ? (
                        <p className="text-sm text-muted-foreground py-8 text-center">Loading...</p>
                    ) : logs.length === 0 ? (
                        <Card><CardBody className="py-8 text-center text-sm text-muted-foreground">No communication logs found.</CardBody></Card>
                    ) : (
                        logs.map(log => {
                            const Icon = channelIcons[log.channel] || MessageSquare
                            return (
                                <Card key={log.id}>
                                    <CardBody className="flex items-center justify-between py-3">
                                        <div className="flex items-center gap-3">
                                            <div className={`p-2 rounded-lg ${channelColors[log.channel] || 'bg-gray-100 text-gray-700'}`}>
                                                <Icon className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium">{log.recipient}</p>
                                                <p className="text-xs text-muted-foreground truncate max-w-[300px]">{log.subject || log.message}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant={log.status === 'SENT' ? 'default' : log.status === 'FAILED' ? 'destructive' : 'secondary'}>
                                                {log.status}
                                            </Badge>
                                            <span className="text-xs text-muted-foreground">{new Date(log.sentAt).toLocaleString()}</span>
                                        </div>
                                    </CardBody>
                                </Card>
                            )
                        })
                    )}
                </div>
            </div>
        </ProtectedRoute>
    )
}
