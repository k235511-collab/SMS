import { api } from '@/lib/api-client'

export type TriggerType = 'ABSENT' | 'FEE_DEFAULTER' | 'ANNOUNCEMENT'

export interface WhatsAppConfigPayload {
  providerMode?: 'CENTRAL_WABA' | 'OWN_WABA'
  businessAccountId?: string
  appId?: string
  phoneNumberId?: string
  whatsappNumber?: string
  displayName?: string
  accessToken?: string
  webhookVerifyToken?: string
  isVerified?: boolean
  isActive?: boolean
}

export interface WhatsAppTriggerPayload {
  triggerType: TriggerType
  isEnabled?: boolean
  templateName?: string
  cooldownHours?: number
  minOutstandingAmount?: number
  minOverdueDays?: number
  metadata?: Record<string, unknown>
}

export interface RecipientCandidate {
  studentId: string
  fullName: string
  rollNumber?: string | null
  studentPhone?: string | null
  studentPhoneNormalized?: string | null
  phoneValid?: boolean
  phoneValidationReason?: string | null
  className?: string | null
  sectionName?: string | null
  date?: string
  outstandingAmount?: number
  maxOverdueDays?: number
}

export const communicationsService = {
  sendWhatsApp: (data: { to: string; message: string; templateId?: string }) =>
    api.post<any>('/communications/whatsapp', data),
  sendAnnouncement: (data: { title?: string; message: string; studentIds?: string[] }) =>
    api.post<any>('/communications/whatsapp/announcement', data),
  getAnnouncementRecipients: () =>
    api.get<RecipientCandidate[]>('/communications/whatsapp/recipients/announcements'),
  getWhatsAppConfig: () => api.get<any>('/communications/whatsapp/config'),
  saveWhatsAppConfig: (data: WhatsAppConfigPayload) =>
    api.post<any>('/communications/whatsapp/config', data),
  getWhatsAppTriggers: () => api.get<any>('/communications/whatsapp/triggers'),
  saveWhatsAppTrigger: (data: WhatsAppTriggerPayload) =>
    api.post<any>('/communications/whatsapp/triggers', data),
  getAbsenteeRecipients: (params?: { date?: string }) =>
    api.get<RecipientCandidate[]>('/communications/whatsapp/recipients/absentees', {
      params: params as any,
    }),
  sendAbsenteeToSelected: (data: { studentIds: string[]; date?: string }) =>
    api.post<any>('/communications/whatsapp/send/absentees', data),
  getFeeDefaulterRecipients: (params?: {
    minOutstandingAmount?: number
    minOverdueDays?: number
  }) =>
    api.get<RecipientCandidate[]>('/communications/whatsapp/recipients/fee-defaulters', {
      params: params as any,
    }),
  sendFeeDefaulterToSelected: (data: {
    studentIds: string[]
    minOutstandingAmount?: number
    minOverdueDays?: number
  }) => api.post<any>('/communications/whatsapp/send/fee-defaulters', data),
  getLogs: (params?: { channel?: string; page?: number; pageSize?: number }) =>
    api.get<any>('/communications/logs', { params: params as any }),
}
