'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { MessageSquare, Clock, Settings } from 'lucide-react'
import { ProtectedRoute } from '@/components/auth'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardBody } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  COMMUNICATIONS_COPY,
  DEFAULT_TRIGGERS,
  RecipientItem,
  RecipientSelectionTable,
  SendConfirmationDialog,
  SettingsIncompleteDialog,
  TriggerConfig,
  TriggerKey,
  TriggerSetupPanel,
  WhatsAppSettingsDialog,
  WhatsAppSettingsFormValue,
  validatePakistaniPhone,
} from '@/components/communications'
import { useAuth } from '@/context/auth-context'
import { useSession } from '@/context/session-context'
import { communicationsService } from '@/services/communications.service'

interface LogEntry {
  id: string
  channel: string
  recipient: string
  subject?: string
  message: string
  status: string
  sentAt: string
}

const initialConfig: WhatsAppSettingsFormValue = {
  providerMode: 'CENTRAL_WABA',
  businessAccountId: '',
  appId: '',
  phoneNumberId: '',
  whatsappNumber: '',
  displayName: '',
  accessToken: '',
  webhookVerifyToken: '',
  isVerified: false,
  isActive: false,
}

function getLocalDateInputValue(date: Date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function cloneDefaultTriggers(): Record<TriggerKey, TriggerConfig> {
  return {
    ABSENT: { ...DEFAULT_TRIGGERS.ABSENT },
    FEE_DEFAULTER: { ...DEFAULT_TRIGGERS.FEE_DEFAULTER },
    ANNOUNCEMENT: { ...DEFAULT_TRIGGERS.ANNOUNCEMENT },
  }
}

function getMissingWhatsAppSettings(config: WhatsAppSettingsFormValue): string[] {
  const missing: string[] = []

  if (!config.displayName.trim()) missing.push('Sender name')
  if (!config.whatsappNumber.trim()) missing.push('Sender WhatsApp number')
  if (!config.phoneNumberId.trim()) missing.push('Phone number ID')
  if (!config.accessToken.trim()) missing.push('Access token')
  if (!config.isVerified) missing.push('Verified status')
  if (!config.isActive) missing.push('Active status')

  return missing
}

function normalizeMessagePatternForUx(triggerType: TriggerKey, pattern: string) {
  const trimmed = pattern.trim()
  if (!trimmed) return DEFAULT_TRIGGERS[triggerType].messagePattern

  const hasKnownAutoToken = /\[\s*(student name|class section|date|campus name|school name|amount|overdue days|title|message)\s*\]|\{\{\s*(studentname|firstname|lastname|classwithsection|classname|sectionname|date|title|message|amount|overduedays|schoolname|campusname)\s*\}\}/i.test(
    trimmed,
  )

  if (hasKnownAutoToken) {
    return DEFAULT_TRIGGERS[triggerType].messagePattern
  }

  return trimmed
}

export default function CommunicationsPage() {
  const { selectedCampus } = useSession()
  const { user } = useAuth()
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [loadingLogs, setLoadingLogs] = useState(false)
  const [savingConfig, setSavingConfig] = useState(false)
  const [sendingSelected, setSendingSelected] = useState(false)
  const [loadingRecipients, setLoadingRecipients] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [settingsErrorOpen, setSettingsErrorOpen] = useState(false)

  const [config, setConfig] = useState<WhatsAppSettingsFormValue>(initialConfig)
  const [triggers, setTriggers] = useState<Record<TriggerKey, TriggerConfig>>(
    cloneDefaultTriggers,
  )
  const [statusMessage, setStatusMessage] = useState('')
  const [selectedTrigger, setSelectedTrigger] = useState<TriggerKey>('ABSENT')
  const [activeMainTab, setActiveMainTab] = useState<'send' | 'recent'>('send')
  const [recipientDate, setRecipientDate] = useState(getLocalDateInputValue)
  const [recipients, setRecipients] = useState<RecipientItem[]>([])
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([])

  const selectedRecipients = useMemo(
    () => recipients.filter((item) => selectedStudentIds.includes(item.studentId)),
    [recipients, selectedStudentIds],
  )

  const validSelectedStudentIds = useMemo(
    () =>
      selectedRecipients
        .filter((item) => {
          if (typeof item.phoneValid === 'boolean') return item.phoneValid
          return validatePakistaniPhone(item.studentPhone).isValid
        })
        .map((item) => item.studentId),
    [selectedRecipients],
  )

  const missingSettingsForSend = useMemo(() => getMissingWhatsAppSettings(config), [config])

  const fetchLogs = useCallback(async () => {
    setLoadingLogs(true)
    const response = await communicationsService.getLogs({ channel: 'WHATSAPP' })
    if (response.success && response.data) {
      const items = response.data.data || (Array.isArray(response.data) ? response.data : [])
      setLogs(items)
    }
    setLoadingLogs(false)
  }, [selectedCampus])

  const fetchSetup = useCallback(async () => {
    const [configResponse, triggerResponse] = await Promise.all([
      communicationsService.getWhatsAppConfig(),
      communicationsService.getWhatsAppTriggers(),
    ])

    if (configResponse.success && configResponse.data) {
      setConfig((prev) => ({ ...prev, ...configResponse.data }))
    }

    if (triggerResponse.success && Array.isArray(triggerResponse.data)) {
      const next = cloneDefaultTriggers()
      for (const rule of triggerResponse.data) {
        const key = rule.triggerType as TriggerKey
        if (!next[key]) continue

        const metadata =
          rule.metadata && typeof rule.metadata === 'object'
            ? (rule.metadata as Record<string, unknown>)
            : {}
        const rawMessagePattern =
          typeof metadata.messagePattern === 'string' && metadata.messagePattern.trim().length > 0
            ? metadata.messagePattern
            : next[key].messagePattern
        const messagePattern = normalizeMessagePatternForUx(key, rawMessagePattern)

        next[key] = {
          ...next[key],
          isEnabled: !!rule.isEnabled,
          templateName: rule.templateName || next[key].templateName,
          messagePattern,
          minOutstandingAmount:
            rule.minOutstandingAmount ?? next.FEE_DEFAULTER.minOutstandingAmount ?? 0,
          minOverdueDays: rule.minOverdueDays ?? next.FEE_DEFAULTER.minOverdueDays ?? 1,
        }
      }
      setTriggers(next)
    }
  }, [])

  const fetchRecipients = useCallback(async () => {
    setLoadingRecipients(true)
    setSelectedStudentIds([])

    if (selectedTrigger === 'ABSENT') {
      const today = getLocalDateInputValue()
      setRecipientDate((prev) => (prev === today ? prev : today))
      const response = await communicationsService.getAbsenteeRecipients({ date: today })
      setRecipients(response.success && Array.isArray(response.data) ? response.data : [])
      setLoadingRecipients(false)
      return
    }

    if (selectedTrigger === 'FEE_DEFAULTER') {
      const response = await communicationsService.getFeeDefaulterRecipients({
        minOutstandingAmount: triggers.FEE_DEFAULTER.minOutstandingAmount ?? 0,
        minOverdueDays: triggers.FEE_DEFAULTER.minOverdueDays ?? 0,
      })
      setRecipients(response.success && Array.isArray(response.data) ? response.data : [])
      setLoadingRecipients(false)
      return
    }

    const response = await communicationsService.getAnnouncementRecipients()
    setRecipients(response.success && Array.isArray(response.data) ? response.data : [])
    setLoadingRecipients(false)
  }, [selectedTrigger, triggers.FEE_DEFAULTER])

  const saveConfig = useCallback(async () => {
    const phoneCheck = validatePakistaniPhone(config.whatsappNumber)
    if (config.whatsappNumber && !phoneCheck.isValid) {
      setStatusMessage(phoneCheck.reason || 'Please enter a valid WhatsApp number before saving.')
      return
    }

    setSavingConfig(true)
    setStatusMessage('')

    const payload = {
      ...config,
      whatsappNumber: phoneCheck.normalized || config.whatsappNumber,
    }

    const response = await communicationsService.saveWhatsAppConfig(payload)
    setSavingConfig(false)

    if (response.success) {
      setStatusMessage('WhatsApp settings saved successfully.')
      setSettingsOpen(false)
      fetchSetup()
      return
    }

    setStatusMessage(response.message || 'Unable to save WhatsApp settings.')
  }, [config, fetchSetup])

  const saveTrigger = useCallback(
    async (triggerType: TriggerKey) => {
      const trigger = triggers[triggerType]
      const response = await communicationsService.saveWhatsAppTrigger({
        triggerType,
        isEnabled: trigger.isEnabled,
        templateName: trigger.templateName,
        minOutstandingAmount:
          triggerType === 'FEE_DEFAULTER' ? trigger.minOutstandingAmount : undefined,
        minOverdueDays: triggerType === 'FEE_DEFAULTER' ? trigger.minOverdueDays : undefined,
        metadata: {
          messagePattern: trigger.messagePattern,
        },
      })

      setStatusMessage(
        response.success
          ? `${triggerType.replace('_', ' ')} settings saved.`
          : response.message || 'Failed to save trigger settings.',
      )
    },
    [triggers],
  )

  const onToggleSelected = useCallback((studentId: string, checked: boolean) => {
    if (checked) {
      setSelectedStudentIds((prev) => Array.from(new Set([...prev, studentId])))
      return
    }
    setSelectedStudentIds((prev) => prev.filter((id) => id !== studentId))
  }, [])

  const onToggleMany = useCallback((studentIds: string[], checked: boolean) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev)

      for (const studentId of studentIds) {
        if (checked) {
          next.add(studentId)
          continue
        }

        next.delete(studentId)
      }

      return Array.from(next)
    })
  }, [])

  const validateSettingsBeforeSend = useCallback(() => {
    if (missingSettingsForSend.length === 0) return true

    setSettingsErrorOpen(true)
    return false
  }, [missingSettingsForSend.length])

  const openSendConfirmation = useCallback(() => {
    if (!validateSettingsBeforeSend()) {
      return
    }

    if (selectedStudentIds.length === 0) {
      setStatusMessage('Please select at least one student.')
      return
    }

    if (
      selectedTrigger === 'ANNOUNCEMENT' &&
      !triggers.ANNOUNCEMENT.messagePattern.trim()
    ) {
      setStatusMessage('Write your announcement message before sending.')
      return
    }

    setConfirmOpen(true)
  }, [
    selectedStudentIds.length,
    selectedTrigger,
    triggers.ANNOUNCEMENT.messagePattern,
    validateSettingsBeforeSend,
  ])

  const sendToSelected = useCallback(async () => {
    if (!validateSettingsBeforeSend()) {
      return
    }

    if (validSelectedStudentIds.length === 0) {
      setStatusMessage('No valid recipient numbers found in the selected list.')
      return
    }

    setSendingSelected(true)

    if (selectedTrigger === 'ABSENT') {
      const today = getLocalDateInputValue()
      setRecipientDate((prev) => (prev === today ? prev : today))
      const response = await communicationsService.sendAbsenteeToSelected({
        studentIds: validSelectedStudentIds,
        date: today,
      })
      setSendingSelected(false)
      setConfirmOpen(false)
      setStatusMessage(
        response.success
          ? `Absent updates sent to ${validSelectedStudentIds.length} selected recipient(s).`
          : response.message || 'Could not send absent updates.',
      )
      fetchLogs()
      fetchRecipients()
      return
    }

    if (selectedTrigger === 'FEE_DEFAULTER') {
      const response = await communicationsService.sendFeeDefaulterToSelected({
        studentIds: validSelectedStudentIds,
        minOutstandingAmount: triggers.FEE_DEFAULTER.minOutstandingAmount,
        minOverdueDays: triggers.FEE_DEFAULTER.minOverdueDays,
      })
      setSendingSelected(false)
      setConfirmOpen(false)
      setStatusMessage(
        response.success
          ? `Fee reminders sent to ${validSelectedStudentIds.length} selected recipient(s).`
          : response.message || 'Could not send fee reminders.',
      )
      fetchLogs()
      fetchRecipients()
      return
    }

    const response = await communicationsService.sendAnnouncement({
      message: triggers.ANNOUNCEMENT.messagePattern,
      studentIds: validSelectedStudentIds,
    })
    setSendingSelected(false)
    setConfirmOpen(false)

    if (response.success) {
      setStatusMessage(`Announcement sent to ${validSelectedStudentIds.length} recipient(s).`)
      fetchLogs()
      fetchRecipients()
      return
    }

    setStatusMessage(response.message || 'Could not send announcement.')
  }, [
    fetchLogs,
    fetchRecipients,
    selectedTrigger,
    triggers.ANNOUNCEMENT.messagePattern,
    triggers.FEE_DEFAULTER.minOutstandingAmount,
    triggers.FEE_DEFAULTER.minOverdueDays,
    validateSettingsBeforeSend,
    validSelectedStudentIds,
  ])

  useEffect(() => {
    fetchLogs()
    fetchSetup()
  }, [fetchLogs, fetchSetup])

  useEffect(() => {
    fetchRecipients()
  }, [fetchRecipients])

  useEffect(() => {
    if (activeMainTab === 'recent') {
      fetchLogs()
    }
  }, [activeMainTab, fetchLogs])

  return (
    <ProtectedRoute permission="communications:read">
      <div className="space-y-6 rounded-2xl border border-primary-100/70 bg-gradient-to-br from-primary-50/60 via-background to-background p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold text-foreground">
              <MessageSquare className="h-6 w-6" />
              {COMMUNICATIONS_COPY.pageTitle}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{COMMUNICATIONS_COPY.pageSubtitle}</p>
          </div>
        </div>

        <Tabs value={activeMainTab} onValueChange={(value) => setActiveMainTab(value as 'send' | 'recent')}>
          <TabsList className="border border-primary-100/70 bg-primary-50/70">
            <TabsTrigger
              value="send"
              className="data-[state=active]:bg-primary-600 data-[state=active]:text-primary-foreground"
            >
              Send messages
            </TabsTrigger>
            <TabsTrigger
              value="recent"
              className="data-[state=active]:bg-primary-600 data-[state=active]:text-primary-foreground"
            >
              Recent messages
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {activeMainTab === 'send' ? (
        <>
        <Card className="border-primary-100/80 shadow-sm">
          <CardBody className="space-y-4 py-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-semibold">{COMMUNICATIONS_COPY.setupTitle}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={config.isActive ? 'success' : 'secondary'}>
                  {config.isActive ? COMMUNICATIONS_COPY.statusActive : COMMUNICATIONS_COPY.statusInactive}
                </Badge>
                <Button size="icon" variant="primary" onClick={() => setSettingsOpen(true)}>
                  <Settings className="h-4 w-4" />
                  <span className="sr-only">Open WhatsApp settings</span>
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-2 text-sm md:grid-cols-2">
              <div className="rounded-md border border-primary-100/70 bg-background p-3">
                <p className="text-xs text-muted-foreground">Display name</p>
                <p className="font-medium">{config.displayName || 'Not set'}</p>
              </div>
              <div className="rounded-md border border-primary-100/70 bg-background p-3">
                <p className="text-xs text-muted-foreground">WhatsApp number</p>
                <p className="font-medium">{config.whatsappNumber || 'Not set'}</p>
              </div>
            </div>
          </CardBody>
        </Card>

        <Card className="border-primary-100/80 shadow-sm">
          <CardBody className="space-y-4 py-5">
            <div>
              <p className="font-semibold">{COMMUNICATIONS_COPY.triggerTitle}</p>
            </div>
            <TriggerSetupPanel
              selectedTrigger={selectedTrigger}
              triggers={triggers}
              onSelectedTriggerChange={(trigger) => {
                setSelectedTrigger(trigger)
                setSelectedStudentIds([])
                if (trigger === 'ABSENT') {
                  setRecipientDate(getLocalDateInputValue())
                }
              }}
              onTriggerChange={(trigger, next) =>
                setTriggers((prev) => ({
                  ...prev,
                  [trigger]: next,
                }))
              }
              onSaveTrigger={saveTrigger}
              previewRecipient={selectedRecipients[0] || recipients[0] || null}
              previewCampusName={selectedCampus?.name}
              previewSchoolName={user?.schoolName}
              previewDate={recipientDate}
            />
          </CardBody>
        </Card>

        <Card className="border-primary-100/80 shadow-sm">
          <CardBody className="space-y-4 py-5">
            <RecipientSelectionTable
              trigger={selectedTrigger}
              recipients={recipients}
              selectedStudentIds={selectedStudentIds}
              loading={loadingRecipients}
              recipientDate={recipientDate}
              onRefresh={fetchRecipients}
              onToggleSelected={onToggleSelected}
              onToggleMany={onToggleMany}
            />

            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                onClick={openSendConfirmation}
                disabled={
                  selectedStudentIds.length === 0 ||
                  sendingSelected
                }
              >
                {COMMUNICATIONS_COPY.sendSelected}
              </Button>
              <span className="text-xs text-muted-foreground">
                Invalid numbers are skipped automatically after validation.
              </span>
            </div>
          </CardBody>
        </Card>

        {statusMessage ? (
          <p className="rounded-md border border-primary-100 bg-primary-50/70 px-3 py-2 text-sm text-primary-800">
            {statusMessage}
          </p>
        ) : null}
        </>
        ) : null}

        {activeMainTab === 'recent' ? (
        <div className="space-y-2">
          <h3 className="flex items-center gap-2 text-lg font-semibold">
            <Clock className="h-5 w-5" />
            {COMMUNICATIONS_COPY.logsTitle}
          </h3>
          {loadingLogs ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Loading...</p>
          ) : logs.length === 0 ? (
            <Card>
              <CardBody className="py-8 text-center text-sm text-muted-foreground">
                No communication logs found.
              </CardBody>
            </Card>
          ) : (
            logs.map((log) => (
              <Card key={log.id} className="border-primary-100/70">
                <CardBody className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-lg bg-primary-100 p-2 text-primary-700">
                      <MessageSquare className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{log.recipient}</p>
                      <p className="max-w-[360px] truncate text-xs text-muted-foreground">
                        {log.subject || log.message}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        log.status === 'SENT'
                          ? 'success'
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
            ))
          )}
        </div>
        ) : null}

        <WhatsAppSettingsDialog
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          value={config}
          onChange={setConfig}
          onSave={saveConfig}
          isSaving={savingConfig}
        />

        <SendConfirmationDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          trigger={selectedTrigger}
          recipients={selectedRecipients}
          isSending={sendingSelected}
          onConfirm={sendToSelected}
        />

        <SettingsIncompleteDialog
          open={settingsErrorOpen}
          onOpenChange={setSettingsErrorOpen}
          missingFields={missingSettingsForSend}
          onOpenSettings={() => {
            setSettingsErrorOpen(false)
            setSettingsOpen(true)
          }}
        />
      </div>
    </ProtectedRoute>
  )
}
