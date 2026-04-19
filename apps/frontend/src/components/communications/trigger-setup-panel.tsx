'use client'

import { useEffect, useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { RecipientItem, TriggerConfig, TriggerKey } from './types'
import { TRIGGER_TAB_CONFIG } from './constants'

const AUTO_DETAIL_FIELDS_BY_TRIGGER: Record<TriggerKey, string[]> = {
  ABSENT: ['Student name', 'Class and section', 'Date', 'Campus name', 'School name'],
  FEE_DEFAULTER: [
    'Student name',
    'Class and section',
    'Outstanding amount',
    'Overdue days',
    'Campus name',
    'School name',
  ],
  ANNOUNCEMENT: ['Student name', 'Class and section', 'Campus name', 'School name'],
}

const PREVIEW_DEFAULT_MESSAGE_BY_TRIGGER: Record<TriggerKey, string> = {
  ABSENT: 'Student was marked absent today.',
  FEE_DEFAULTER: 'Fee payment is overdue. Please clear dues.',
  ANNOUNCEMENT: 'School announcement.',
}

function formatPreviewDate(input?: string | Date) {
  if (!input) return new Date().toLocaleDateString()
  const parsed = input instanceof Date ? input : new Date(input)
  if (Number.isNaN(parsed.getTime())) return new Date().toLocaleDateString()
  return parsed.toLocaleDateString()
}

function renderPreviewPrincipalMessage(
  trigger: TriggerKey,
  messagePattern: string,
  values: Record<string, string | number>,
) {
  const compactPattern = (messagePattern || '').trim()
  if (!compactPattern) return PREVIEW_DEFAULT_MESSAGE_BY_TRIGGER[trigger]
  if (trigger === 'ANNOUNCEMENT') return compactPattern

  const tokenAliases: Record<string, string> = {
    student: 'studentName',
    studentname: 'studentName',
    firstname: 'firstName',
    lastname: 'lastName',
    class: 'classWithSection',
    classwithsection: 'classWithSection',
    classsection: 'classWithSection',
    classname: 'className',
    section: 'sectionName',
    sectionname: 'sectionName',
    date: 'date',
    amount: 'amount',
    overduedays: 'overdueDays',
    school: 'schoolName',
    schoolname: 'schoolName',
    campus: 'campusName',
    campusname: 'campusName',
  }

  const readValueByToken = (token: string) => {
    const normalized = token.toLowerCase().replace(/[^a-z0-9]/g, '')
    const resolvedToken = tokenAliases[normalized] || token
    const value = values[resolvedToken]
    if (value === undefined || value === null) return null
    return String(value)
  }

  const renderedLegacy = compactPattern.replace(
    /{{\s*([a-zA-Z0-9_]+)\s*}}/g,
    (_match, token: string) => {
      const value = readValueByToken(token)
      return value ?? ''
    },
  )

  const renderedFriendly = renderedLegacy.replace(
    /\[\s*([^\[\]]+?)\s*\]/g,
    (match, token: string) => {
      const value = readValueByToken(token)
      return value ?? match
    },
  )

  const compactRendered = renderedFriendly.replace(/\s+/g, ' ').trim()
  return compactRendered || PREVIEW_DEFAULT_MESSAGE_BY_TRIGGER[trigger]
}

function buildPreviewMessage(
  trigger: TriggerKey,
  principalMessage: string,
  recipient: RecipientItem | null | undefined,
  campusName?: string,
  schoolName?: string,
  previewDate?: string,
) {
  const studentName = recipient?.fullName?.trim() || 'Muhammad Ali'
  const [firstName, ...restNameParts] = studentName.split(' ')
  const classWithSection = [recipient?.className, recipient?.sectionName]
    .filter((value) => !!value)
    .join(' / ') || 'Class 5 / A'
  const previewCampusName = campusName?.trim() || 'Main Campus'
  const previewSchoolName = schoolName?.trim() || 'School'
  const formattedDate = formatPreviewDate(previewDate || recipient?.date)
  const outstandingAmount = recipient?.outstandingAmount ?? 5000
  const overdueDays = recipient?.maxOverdueDays ?? 7

  const renderedPrincipal = renderPreviewPrincipalMessage(trigger, principalMessage, {
    studentName,
    firstName: firstName || studentName,
    lastName: restNameParts.join(' '),
    classWithSection,
    className: recipient?.className || 'Class',
    sectionName: recipient?.sectionName || 'Section',
    date: formattedDate,
    amount: outstandingAmount,
    overdueDays,
    schoolName: previewSchoolName,
    campusName: previewCampusName,
  })

  const detailsByTrigger: Record<TriggerKey, Array<{ label: string; value: string }>> = {
    ABSENT: [
      { label: 'Student', value: studentName },
      { label: 'Class/Section', value: classWithSection },
      { label: 'Date', value: formattedDate },
      { label: 'Campus', value: previewCampusName },
      { label: 'School', value: previewSchoolName },
    ],
    FEE_DEFAULTER: [
      { label: 'Student', value: studentName },
      { label: 'Class/Section', value: classWithSection },
      { label: 'Outstanding', value: `PKR ${outstandingAmount}` },
      { label: 'Overdue', value: `${overdueDays} day(s)` },
      { label: 'Campus', value: previewCampusName },
      { label: 'School', value: previewSchoolName },
    ],
    ANNOUNCEMENT: [
      { label: 'Student', value: studentName },
      { label: 'Class/Section', value: classWithSection },
      { label: 'Campus', value: previewCampusName },
      { label: 'School', value: previewSchoolName },
    ],
  }

  const autoDetails = detailsByTrigger[trigger].map((item) => `${item.label}: ${item.value}`).join('\n')
  return `${renderedPrincipal}\n\nAuto details:\n${autoDetails}`
}

interface TriggerSetupPanelProps {
  selectedTrigger: TriggerKey
  triggers: Record<TriggerKey, TriggerConfig>
  onSelectedTriggerChange: (trigger: TriggerKey) => void
  onTriggerChange: (trigger: TriggerKey, next: TriggerConfig) => void
  onSaveTrigger: (trigger: TriggerKey) => void
  previewRecipient?: RecipientItem | null
  previewCampusName?: string
  previewSchoolName?: string
  previewDate?: string
}

export function TriggerSetupPanel({
  selectedTrigger,
  triggers,
  onSelectedTriggerChange,
  onTriggerChange,
  onSaveTrigger,
  previewRecipient,
  previewCampusName,
  previewSchoolName,
  previewDate,
}: TriggerSetupPanelProps) {
  const currentTab = TRIGGER_TAB_CONFIG.find((item) => item.key === selectedTrigger)
  const triggerState = triggers[selectedTrigger]
  const autoFields = AUTO_DETAIL_FIELDS_BY_TRIGGER[selectedTrigger]
  const [showPreview, setShowPreview] = useState(false)

  const previewMessage = useMemo(
    () =>
      buildPreviewMessage(
        selectedTrigger,
        triggerState?.messagePattern || '',
        previewRecipient,
        previewCampusName,
        previewSchoolName,
        previewDate,
      ),
    [
      selectedTrigger,
      triggerState?.messagePattern,
      previewRecipient,
      previewCampusName,
      previewSchoolName,
      previewDate,
    ],
  )

  useEffect(() => {
    setShowPreview(false)
  }, [selectedTrigger])

  if (!currentTab || !triggerState) return null

  return (
    <div className="space-y-4">
      <Tabs value={selectedTrigger} onValueChange={(value) => onSelectedTriggerChange(value as TriggerKey)}>
        <TabsList className="w-full justify-start border border-primary-100/70 bg-primary-50/70">
          {TRIGGER_TAB_CONFIG.map((item) => (
            <TabsTrigger
              key={item.key}
              value={item.key}
              className="data-[state=active]:bg-primary-600 data-[state=active]:text-primary-foreground"
            >
              {item.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="space-y-4 rounded-lg border border-primary-100 bg-background p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="font-semibold">{currentTab.label}</p>
          </div>
          <Label className="flex items-center gap-2 rounded-md border border-primary-100 bg-primary-50/70 px-2.5 py-1.5 font-normal">
            <Checkbox
              checked={triggerState.isEnabled}
              onCheckedChange={(checked) =>
                onTriggerChange(selectedTrigger, { ...triggerState, isEnabled: !!checked })
              }
            />
            Enabled
          </Label>
        </div>

        <div className="space-y-2">
          <Label>Part 1: Principal message (editable)</Label>
          <Textarea
            className="min-h-[110px]"
            placeholder="Type the message principal wants to send."
            value={triggerState.messagePattern}
            onChange={(event) =>
              onTriggerChange(selectedTrigger, {
                ...triggerState,
                messagePattern: event.target.value,
              })
            }
          />
        </div>

        <div className="space-y-2 rounded-md border border-primary-100 bg-primary-50/70 p-3">
          <p className="text-sm font-medium text-primary-800">Part 2: Auto details (system added)</p>
          <p className="text-xs text-muted-foreground">
            Principal cannot break this section. It is added automatically in every message.
          </p>
          <div className="flex flex-wrap gap-2">
            {autoFields.map((field) => (
              <span
                key={field}
                className="rounded-full border border-primary-200 bg-background px-2.5 py-1 text-xs text-primary-800"
              >
                {field}
              </span>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={() => setShowPreview((value) => !value)}>
            {showPreview ? 'Hide preview' : 'Preview message'}
            <ChevronDown
              className={cn(
                'h-4 w-4 transition-transform duration-300 ease-out',
                showPreview ? 'rotate-180' : 'rotate-0',
              )}
            />
          </Button>
          <Button size="sm" variant="primary" onClick={() => onSaveTrigger(selectedTrigger)}>
            Save trigger settings
          </Button>
        </div>

        <div
          className={cn(
            'grid transition-all duration-300 ease-out',
            showPreview ? 'grid-rows-[1fr] opacity-100' : 'pointer-events-none grid-rows-[0fr] opacity-0',
          )}
        >
          <div className="overflow-hidden">
            <div className="space-y-2 rounded-md border border-primary-100 bg-background p-3">
              <p className="text-sm font-medium text-primary-800">Message preview</p>
              <pre className="whitespace-pre-wrap text-sm leading-6 text-foreground">{previewMessage}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
