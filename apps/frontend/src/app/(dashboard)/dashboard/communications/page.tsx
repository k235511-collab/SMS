'use client'

import { useEffect, useState, useCallback } from 'react'
import { ProtectedRoute } from '@/components/auth'
import { Button } from '@/components/ui/button'
import { Card, CardBody } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { communicationsService } from '@/services/communications.service'
import { MessageSquare, Clock } from 'lucide-react'
import { useSession } from '@/context/session-context'

interface LogEntry {
  id: string
  channel: string
  recipient: string
  subject?: string
  message: string
  status: string
  sentAt: string
}

type TriggerKey = 'ABSENT' | 'FEE_DEFAULTER' | 'ANNOUNCEMENT'
type TriggerConfig = {
  isEnabled: boolean
  templateName: string
  minOutstandingAmount?: number
  minOverdueDays?: number
}
type RecipientItem = {
  studentId: string
  fullName: string
  rollNumber?: string
  guardianPhone?: string | null
  className?: string | null
  sectionName?: string | null
  date?: string
  outstandingAmount?: number
  maxOverdueDays?: number
}

const DEFAULT_TRIGGERS = {
  ABSENT: { isEnabled: true, templateName: 'attendance_alert' },
  FEE_DEFAULTER: {
    isEnabled: true,
    templateName: 'fee_reminder',
    minOutstandingAmount: 0,
    minOverdueDays: 1,
  },
  ANNOUNCEMENT: { isEnabled: true, templateName: 'school_announcement' },
} satisfies Record<TriggerKey, TriggerConfig>

export default function CommunicationsPage() {
  const { selectedCampus } = useSession()
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [savingConfig, setSavingConfig] = useState(false)
  const [sendingAnnouncement, setSendingAnnouncement] = useState(false)
  const [sendingSelected, setSendingSelected] = useState(false)
  const [loadingRecipients, setLoadingRecipients] = useState(false)
  const [config, setConfig] = useState({
    providerMode: 'CENTRAL_WABA' as 'CENTRAL_WABA' | 'OWN_WABA',
    businessAccountId: '',
    appId: '',
    phoneNumberId: '',
    whatsappNumber: '',
    displayName: '',
    accessToken: '',
    webhookVerifyToken: '',
    isVerified: false,
    isActive: false,
  })
  const [announcement, setAnnouncement] = useState({ title: '', message: '' })
  const [triggers, setTriggers] = useState<Record<TriggerKey, TriggerConfig>>({
    ...DEFAULT_TRIGGERS,
  })
  const [statusMessage, setStatusMessage] = useState<string>('')
  const [selectedTrigger, setSelectedTrigger] = useState<TriggerKey>('ABSENT')
  const [recipientDate, setRecipientDate] = useState<string>(new Date().toISOString().slice(0, 10))
  const [recipients, setRecipients] = useState<RecipientItem[]>([])
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    const res = await communicationsService.getLogs({ channel: 'WHATSAPP' })
    if (res.success && res.data) {
      const items = res.data.data || (Array.isArray(res.data) ? res.data : [])
      setLogs(items)
    }
    setLoading(false)
  }, [selectedCampus])

  const fetchSetup = useCallback(async () => {
    const [cfgRes, triggerRes] = await Promise.all([
      communicationsService.getWhatsAppConfig(),
      communicationsService.getWhatsAppTriggers(),
    ])
    if (cfgRes.success && cfgRes.data) {
      setConfig((prev) => ({ ...prev, ...cfgRes.data }))
    }
    if (triggerRes.success && Array.isArray(triggerRes.data)) {
      const next: Record<TriggerKey, TriggerConfig> = { ...DEFAULT_TRIGGERS }
      for (const rule of triggerRes.data) {
        const key = rule.triggerType as TriggerKey
        if (!next[key]) continue
        next[key] = {
          ...next[key],
          isEnabled: !!rule.isEnabled,
          templateName: rule.templateName || next[key].templateName,
          minOutstandingAmount:
            rule.minOutstandingAmount ?? next.FEE_DEFAULTER.minOutstandingAmount ?? 0,
          minOverdueDays: rule.minOverdueDays ?? next.FEE_DEFAULTER.minOverdueDays ?? 1,
        }
      }
      setTriggers(next)
    }
  }, [])

  const saveConfig = useCallback(async () => {
    setSavingConfig(true)
    setStatusMessage('')
    const res = await communicationsService.saveWhatsAppConfig(config)
    setSavingConfig(false)
    if (res.success) {
      setStatusMessage('WhatsApp campus configuration saved.')
      fetchSetup()
      return
    }
    setStatusMessage(res.message || 'Failed to save WhatsApp config.')
  }, [config, fetchSetup])

  const saveTrigger = useCallback(
    async (triggerType: TriggerKey) => {
      const payload = {
        triggerType,
        isEnabled: triggers[triggerType].isEnabled,
        templateName: triggers[triggerType].templateName,
        minOutstandingAmount:
          triggerType === 'FEE_DEFAULTER' ? triggers.FEE_DEFAULTER.minOutstandingAmount : undefined,
        minOverdueDays:
          triggerType === 'FEE_DEFAULTER' ? triggers.FEE_DEFAULTER.minOverdueDays : undefined,
      }
      const res = await communicationsService.saveWhatsAppTrigger(payload)
      setStatusMessage(res.success ? `${triggerType} trigger saved.` : 'Failed to save trigger.')
    },
    [triggers],
  )

  const sendAnnouncement = useCallback(async () => {
    if (!announcement.message.trim()) return
    setSendingAnnouncement(true)
    const res = await communicationsService.sendAnnouncement(announcement)
    setSendingAnnouncement(false)
    if (res.success) {
      setAnnouncement({ title: '', message: '' })
      setStatusMessage('Announcement sent on WhatsApp.')
      fetchLogs()
      return
    }
    setStatusMessage(res.message || 'Failed to send announcement.')
  }, [announcement, fetchLogs])

  const fetchRecipients = useCallback(async () => {
    setLoadingRecipients(true)
    setSelectedStudentIds([])
    if (selectedTrigger === 'ABSENT') {
      const res = await communicationsService.getAbsenteeRecipients({ date: recipientDate })
      if (res.success) setRecipients(Array.isArray(res.data) ? res.data : [])
      else setRecipients([])
      setLoadingRecipients(false)
      return
    }
    if (selectedTrigger === 'FEE_DEFAULTER') {
      const res = await communicationsService.getFeeDefaulterRecipients({
        minOutstandingAmount: triggers.FEE_DEFAULTER.minOutstandingAmount ?? 0,
        minOverdueDays: triggers.FEE_DEFAULTER.minOverdueDays ?? 0,
      })
      if (res.success) setRecipients(Array.isArray(res.data) ? res.data : [])
      else setRecipients([])
      setLoadingRecipients(false)
      return
    }
    setRecipients([])
    setLoadingRecipients(false)
  }, [
    recipientDate,
    selectedTrigger,
    triggers.FEE_DEFAULTER.minOutstandingAmount,
    triggers.FEE_DEFAULTER.minOverdueDays,
  ])

  const toggleSelected = useCallback((studentId: string, checked: boolean) => {
    if (checked) {
      setSelectedStudentIds((prev) => Array.from(new Set([...prev, studentId])))
      return
    }
    setSelectedStudentIds((prev) => prev.filter((id) => id !== studentId))
  }, [])

  const sendToSelected = useCallback(async () => {
    if (!selectedStudentIds.length) return
    setSendingSelected(true)
    if (selectedTrigger === 'ABSENT') {
      const res = await communicationsService.sendAbsenteeToSelected({
        studentIds: selectedStudentIds,
        date: recipientDate,
      })
      setStatusMessage(
        res.success
          ? `Sent to ${selectedStudentIds.length} selected absentees.`
          : res.message || 'Failed to send to selected absentees.',
      )
      setSendingSelected(false)
      fetchLogs()
      return
    }
    if (selectedTrigger === 'FEE_DEFAULTER') {
      const res = await communicationsService.sendFeeDefaulterToSelected({
        studentIds: selectedStudentIds,
        minOutstandingAmount: triggers.FEE_DEFAULTER.minOutstandingAmount,
        minOverdueDays: triggers.FEE_DEFAULTER.minOverdueDays,
      })
      setStatusMessage(
        res.success
          ? `Sent to ${selectedStudentIds.length} selected fee defaulters.`
          : res.message || 'Failed to send to selected fee defaulters.',
      )
      setSendingSelected(false)
      fetchLogs()
      return
    }
    setSendingSelected(false)
  }, [
    fetchLogs,
    recipientDate,
    selectedStudentIds,
    selectedTrigger,
    triggers.FEE_DEFAULTER.minOutstandingAmount,
    triggers.FEE_DEFAULTER.minOverdueDays,
  ])

  useEffect(() => {
    fetchLogs()
    fetchSetup()
  }, [fetchLogs, fetchSetup])

  useEffect(() => {
    fetchRecipients()
  }, [fetchRecipients])

  return (
    <ProtectedRoute permission="communications:read">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <MessageSquare className="h-6 w-6" /> Communications
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Send messages and view communication history
            </p>
          </div>
        </div>

        <Card>
          <CardBody className="space-y-4 py-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold">WhatsApp Setup (Campus Scoped)</p>
                <p className="text-xs text-muted-foreground">
                  Each campus connects its own Meta account details
                </p>
              </div>
              <Badge variant={config.isActive ? 'default' : 'secondary'}>
                {config.isActive ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                className="border rounded px-3 py-2 text-sm"
                placeholder="Display name"
                value={config.displayName || ''}
                onChange={(e) => setConfig({ ...config, displayName: e.target.value })}
              />
              <input
                className="border rounded px-3 py-2 text-sm"
                placeholder="WhatsApp number"
                value={config.whatsappNumber || ''}
                onChange={(e) => setConfig({ ...config, whatsappNumber: e.target.value })}
              />
              <input
                className="border rounded px-3 py-2 text-sm"
                placeholder="Phone number ID"
                value={config.phoneNumberId || ''}
                onChange={(e) => setConfig({ ...config, phoneNumberId: e.target.value })}
              />
              <input
                className="border rounded px-3 py-2 text-sm"
                placeholder="Business account ID"
                value={config.businessAccountId || ''}
                onChange={(e) => setConfig({ ...config, businessAccountId: e.target.value })}
              />
              <input
                className="border rounded px-3 py-2 text-sm"
                placeholder="App ID"
                value={config.appId || ''}
                onChange={(e) => setConfig({ ...config, appId: e.target.value })}
              />
              <input
                className="border rounded px-3 py-2 text-sm"
                placeholder="Webhook verify token"
                value={config.webhookVerifyToken || ''}
                onChange={(e) => setConfig({ ...config, webhookVerifyToken: e.target.value })}
              />
              <input
                className="border rounded px-3 py-2 text-sm md:col-span-2"
                placeholder="Access token"
                value={config.accessToken || ''}
                onChange={(e) => setConfig({ ...config, accessToken: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.isVerified}
                  onChange={(e) => setConfig({ ...config, isVerified: e.target.checked })}
                />{' '}
                Verified
              </label>
              <label className="text-sm flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.isActive}
                  onChange={(e) => setConfig({ ...config, isActive: e.target.checked })}
                />{' '}
                Active
              </label>
              <Button size="sm" onClick={saveConfig} disabled={savingConfig}>
                {savingConfig ? 'Saving...' : 'Save Config'}
              </Button>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="space-y-4 py-5">
            <p className="font-semibold">Trigger Setup</p>
            <div className="flex flex-wrap gap-2">
              {(['ABSENT', 'FEE_DEFAULTER', 'ANNOUNCEMENT'] as const).map((key) => (
                <Button
                  key={key}
                  size="sm"
                  variant={selectedTrigger === key ? 'primary' : 'outline'}
                  onClick={() => {
                    setSelectedTrigger(key)
                    setSelectedStudentIds([])
                  }}
                >
                  {key.replace('_', ' ')}
                </Button>
              ))}
            </div>

            <div className="border rounded p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold">
                  {selectedTrigger === 'ABSENT'
                    ? 'Absent Trigger Setup'
                    : selectedTrigger === 'FEE_DEFAULTER'
                      ? 'Fee Defaulter Trigger Setup'
                      : 'Announcement Trigger Setup'}
                </p>
                <label className="text-sm flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={triggers[selectedTrigger].isEnabled}
                    onChange={(e) =>
                      setTriggers({
                        ...triggers,
                        [selectedTrigger]: {
                          ...triggers[selectedTrigger],
                          isEnabled: e.target.checked,
                        },
                      })
                    }
                  />
                  Enabled
                </label>
              </div>

              <input
                className="border rounded px-2 py-1 text-xs w-full"
                placeholder="Template name"
                value={triggers[selectedTrigger].templateName}
                onChange={(e) =>
                  setTriggers({
                    ...triggers,
                    [selectedTrigger]: {
                      ...triggers[selectedTrigger],
                      templateName: e.target.value,
                    },
                  })
                }
              />

              {selectedTrigger === 'FEE_DEFAULTER' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <input
                    className="border rounded px-2 py-1 text-xs w-full"
                    placeholder="Min overdue days"
                    type="number"
                    value={triggers.FEE_DEFAULTER.minOverdueDays ?? 1}
                    onChange={(e) =>
                      setTriggers({
                        ...triggers,
                        FEE_DEFAULTER: {
                          ...triggers.FEE_DEFAULTER,
                          minOverdueDays: Number(e.target.value || 0),
                        },
                      })
                    }
                  />
                  <input
                    className="border rounded px-2 py-1 text-xs w-full"
                    placeholder="Min outstanding amount"
                    type="number"
                    value={triggers.FEE_DEFAULTER.minOutstandingAmount ?? 0}
                    onChange={(e) =>
                      setTriggers({
                        ...triggers,
                        FEE_DEFAULTER: {
                          ...triggers.FEE_DEFAULTER,
                          minOutstandingAmount: Number(e.target.value || 0),
                        },
                      })
                    }
                  />
                </div>
              )}

              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={() => saveTrigger(selectedTrigger)}>
                  Save
                </Button>
                {(selectedTrigger === 'ABSENT' || selectedTrigger === 'FEE_DEFAULTER') && (
                  <Button size="sm" variant="outline" onClick={fetchRecipients}>
                    View Users
                  </Button>
                )}
              </div>

              {selectedTrigger === 'ANNOUNCEMENT' && (
                <div className="border rounded p-3 space-y-3">
                  <p className="text-sm font-semibold">Announcement Broadcast (WhatsApp)</p>
                  <input
                    className="border rounded px-3 py-2 text-sm w-full"
                    placeholder="Optional title"
                    value={announcement.title}
                    onChange={(e) => setAnnouncement({ ...announcement, title: e.target.value })}
                  />
                  <textarea
                    className="border rounded px-3 py-2 text-sm w-full min-h-[100px]"
                    placeholder="Announcement message"
                    value={announcement.message}
                    onChange={(e) => setAnnouncement({ ...announcement, message: e.target.value })}
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={sendAnnouncement}
                      disabled={sendingAnnouncement || !announcement.message.trim()}
                    >
                      {sendingAnnouncement ? 'Sending...' : 'Send Announcement'}
                    </Button>
                    {statusMessage && (
                      <span className="text-xs text-muted-foreground">{statusMessage}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardBody>
        </Card>

        {(selectedTrigger === 'ABSENT' || selectedTrigger === 'FEE_DEFAULTER') && (
          <Card>
            <CardBody className="space-y-4 py-5">
              <div className="flex flex-wrap items-center gap-2 justify-between">
                <p className="font-semibold">
                  {selectedTrigger === 'ABSENT' ? 'Absentees List' : 'Fee Defaulter List'}
                </p>
                <div className="flex items-center gap-2">
                  {selectedTrigger === 'ABSENT' && (
                    <input
                      type="date"
                      className="border rounded px-2 py-1 text-sm"
                      value={recipientDate}
                      onChange={(e) => setRecipientDate(e.target.value)}
                    />
                  )}
                  <Button size="sm" variant="outline" onClick={fetchRecipients}>
                    Refresh List
                  </Button>
                </div>
              </div>

              {loadingRecipients ? (
                <p className="text-sm text-muted-foreground">Loading recipients...</p>
              ) : recipients.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No users found for this trigger filter.
                </p>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <label className="text-sm flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={
                          selectedStudentIds.length > 0 &&
                          selectedStudentIds.length === recipients.length
                        }
                        onChange={(e) =>
                          setSelectedStudentIds(
                            e.target.checked ? recipients.map((r) => r.studentId) : [],
                          )
                        }
                      />
                      Select all
                    </label>
                    <span className="text-xs text-muted-foreground">
                      {selectedStudentIds.length} selected
                    </span>
                  </div>
                  <div className="border rounded overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-muted/40">
                        <tr>
                          <th className="text-left p-2">Select</th>
                          <th className="text-left p-2">Student</th>
                          <th className="text-left p-2">Class/Section</th>
                          <th className="text-left p-2">Guardian Phone</th>
                          {selectedTrigger === 'ABSENT' ? (
                            <th className="text-left p-2">Date</th>
                          ) : (
                            <>
                              <th className="text-left p-2">Outstanding</th>
                              <th className="text-left p-2">Overdue Days</th>
                            </>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {recipients.map((item) => (
                          <tr key={item.studentId} className="border-t">
                            <td className="p-2">
                              <input
                                type="checkbox"
                                checked={selectedStudentIds.includes(item.studentId)}
                                onChange={(e) => toggleSelected(item.studentId, e.target.checked)}
                              />
                            </td>
                            <td className="p-2">
                              {item.fullName} {item.rollNumber ? `(${item.rollNumber})` : ''}
                            </td>
                            <td className="p-2">
                              {item.className || 'N/A'}
                              {item.sectionName ? ` / ${item.sectionName}` : ''}
                            </td>
                            <td className="p-2">{item.guardianPhone || 'N/A'}</td>
                            {selectedTrigger === 'ABSENT' ? (
                              <td className="p-2">
                                {item.date ? new Date(item.date).toLocaleDateString() : '-'}
                              </td>
                            ) : (
                              <>
                                <td className="p-2">PKR {item.outstandingAmount ?? 0}</td>
                                <td className="p-2">{item.maxOverdueDays ?? 0}</td>
                              </>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      onClick={sendToSelected}
                      disabled={sendingSelected || selectedStudentIds.length === 0}
                    >
                      {sendingSelected ? 'Sending...' : 'Send to Selected'}
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      Only selected users will receive messages.
                    </span>
                  </div>
                </>
              )}
            </CardBody>
          </Card>
        )}

        <div className="flex items-center gap-2">
          <Badge variant="outline">WhatsApp only</Badge>
          <span className="text-xs text-muted-foreground">
            SMS and Email channels are disabled.
          </span>
        </div>

        {/* Logs */}
        <div className="space-y-2">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5" /> Recent Messages
          </h3>
          {loading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Loading...</p>
          ) : logs.length === 0 ? (
            <Card>
              <CardBody className="py-8 text-center text-sm text-muted-foreground">
                No communication logs found.
              </CardBody>
            </Card>
          ) : (
            logs.map((log) => {
              return (
                <Card key={log.id}>
                  <CardBody className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                        <MessageSquare className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{log.recipient}</p>
                        <p className="text-xs text-muted-foreground truncate max-w-[300px]">
                          {log.subject || log.message}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          log.status === 'SENT'
                            ? 'default'
                            : log.status === 'FAILED'
                              ? 'destructive'
                              : 'secondary'
                        }
                      >
                        {log.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(log.sentAt).toLocaleString()}
                      </span>
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
