import { TriggerConfig, TriggerKey, TriggerTabConfig } from './types'

export const TRIGGER_TAB_CONFIG: TriggerTabConfig[] = [
  {
    key: 'ABSENT',
    label: 'Absent Students',
    description: 'Send absence updates to guardians for today.',
    templateHint: 'attendance_alert',
    patternLabel: 'Message text',
    patternHelperText:
      'Keep it simple. Optional placeholders: [Student Name], [Class Section], [Date], [Campus Name], [School Name].',
    defaultTemplateName: 'attendance_alert',
    defaultMessagePattern: 'Student was marked absent today.',
  },
  {
    key: 'FEE_DEFAULTER',
    label: 'Fee Reminder',
    description: 'Send reminders to guardians with overdue fee balances.',
    templateHint: 'fee_reminder',
    patternLabel: 'Message text',
    patternHelperText:
      'Keep it simple. Optional placeholders: [Student Name], [Class Section], [Amount], [Overdue Days], [Campus Name], [School Name].',
    defaultTemplateName: 'fee_reminder',
    defaultMessagePattern: 'Fee payment is overdue. Please clear dues.',
  },
  {
    key: 'ANNOUNCEMENT',
    label: 'Announcement',
    description: 'Send one announcement to selected guardians.',
    templateHint: 'school_announcement',
    patternLabel: 'Message text',
    patternHelperText:
      'Keep it simple. Optional placeholders: [Title], [Message], [Student Name], [Class Section], [Campus Name], [School Name].',
    defaultTemplateName: 'school_announcement',
    defaultMessagePattern: 'School announcement.',
  },
]

const triggerDefaults = TRIGGER_TAB_CONFIG.reduce(
  (acc, item) => {
    acc[item.key] = {
      isEnabled: true,
      templateName: item.defaultTemplateName,
      messagePattern: item.defaultMessagePattern,
      minOutstandingAmount: item.key === 'FEE_DEFAULTER' ? 0 : undefined,
      minOverdueDays: item.key === 'FEE_DEFAULTER' ? 1 : undefined,
    }
    return acc
  },
  {} as Record<TriggerKey, TriggerConfig>,
)

export const DEFAULT_TRIGGERS = triggerDefaults

export const COMMUNICATIONS_COPY = {
  pageTitle: 'Communications',
  pageSubtitle: 'Send WhatsApp updates and track delivery history',
  setupTitle: 'WhatsApp settings',
  setupSubtitle: 'Use the settings icon to manage account details for this campus.',
  triggerTitle: 'Chat',
  triggerSubtitle: 'Choose who should receive each message type.',
  recipientsTitle: 'Recipient list',
  recipientsSubtitle: 'Pick exactly who should receive the message.',
  logsTitle: 'Recent messages',
  statusActive: 'Active',
  statusInactive: 'Inactive',
  sendSelected: 'Send to selected',
  refreshList: 'Refresh list',
  selectAll: 'Select all',
  selectedCount: 'selected',
}

export const SETTINGS_FIELD_LABELS = {
  displayName: 'Sender name',
  whatsappNumber: 'Sender WhatsApp number',
  phoneNumberId: 'Message channel ID',
  businessAccountId: 'Business profile ID',
  appId: 'Integration app ID',
  webhookVerifyToken: 'Verification token',
  accessToken: 'Access token',
}
