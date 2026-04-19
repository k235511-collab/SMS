export type TriggerKey = 'ABSENT' | 'FEE_DEFAULTER' | 'ANNOUNCEMENT'

export interface TriggerConfig {
  isEnabled: boolean
  templateName: string
  messagePattern: string
  minOutstandingAmount?: number
  minOverdueDays?: number
}

export interface RecipientItem {
  studentId: string
  fullName: string
  rollNumber?: string | null
  studentPhone?: string | null
  studentPhoneNormalized?: string | null
  phoneValid?: boolean
  phoneValidationReason?: string | null
  className?: string | null
  sectionName?: string | null
  date?: string | Date
  outstandingAmount?: number
  maxOverdueDays?: number
}

export interface TriggerTabConfig {
  key: TriggerKey
  label: string
  description: string
  templateHint: string
  patternLabel: string
  patternHelperText: string
  defaultTemplateName: string
  defaultMessagePattern: string
}
