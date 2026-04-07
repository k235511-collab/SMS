import { api } from '@/lib/api-client'

export const communicationsService = {
    sendSms: (data: { recipient: string; message: string }) =>
        api.post<any>('/communications/sms', data),
    sendEmail: (data: { to: string; subject: string; body: string; isHtml?: boolean }) =>
        api.post<any>('/communications/email', data),
    sendWhatsApp: (data: { to: string; message: string; templateId?: string }) =>
        api.post<any>('/communications/whatsapp', data),
    getLogs: (params?: { channel?: string; page?: number; pageSize?: number }) =>
        api.get<any>('/communications/logs', { params: params as any }),
}
