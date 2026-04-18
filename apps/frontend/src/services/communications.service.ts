import { api } from '@/lib/api-client'

export const communicationsService = {
  sendWhatsApp: (data: { to: string; message: string; templateId?: string }) =>
    api.post<any>('/communications/whatsapp', data),
  sendAnnouncement: (data: { title?: string; message: string; studentIds?: string[] }) =>
    api.post<any>('/communications/whatsapp/announcement', data),
  getWhatsAppConfig: () => api.get<any>('/communications/whatsapp/config'),
  saveWhatsAppConfig: (data: {
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
  }) => api.post<any>('/communications/whatsapp/config', data),
  getWhatsAppTriggers: () => api.get<any>('/communications/whatsapp/triggers'),
  saveWhatsAppTrigger: (data: {
    triggerType: 'ABSENT' | 'FEE_DEFAULTER' | 'ANNOUNCEMENT'
    isEnabled?: boolean
    templateName?: string
    cooldownHours?: number
    minOutstandingAmount?: number
    minOverdueDays?: number
    metadata?: Record<string, unknown>
  }) => api.post<any>('/communications/whatsapp/triggers', data),
  getAbsenteeRecipients: (params?: { date?: string }) =>
    api.get<any>('/communications/whatsapp/recipients/absentees', { params: params as any }),
  sendAbsenteeToSelected: (data: { studentIds: string[]; date?: string }) =>
    api.post<any>('/communications/whatsapp/send/absentees', data),
  getFeeDefaulterRecipients: (params?: {
    minOutstandingAmount?: number
    minOverdueDays?: number
  }) =>
    api.get<any>('/communications/whatsapp/recipients/fee-defaulters', { params: params as any }),
  sendFeeDefaulterToSelected: (data: {
    studentIds: string[]
    minOutstandingAmount?: number
    minOverdueDays?: number
  }) => api.post<any>('/communications/whatsapp/send/fee-defaulters', data),
  getLogs: (params?: { channel?: string; page?: number; pageSize?: number }) =>
    api.get<any>('/communications/logs', { params: params as any }),
}
