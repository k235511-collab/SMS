import { api } from '@/lib/api-client'

export const calendarService = {
    getEvents: (params?: { startDate?: string; endDate?: string; type?: string }) =>
        api.get<any>('/calendar', { params: params as any }),
    getEvent: (id: string) => api.get<any>(`/calendar/${id}`),
    createEvent: (data: { title: string; startDate: string; endDate?: string; allDay?: boolean; type?: string; color?: string }) =>
        api.post<any>('/calendar', data),
    updateEvent: (id: string, data: any) => api.patch<any>(`/calendar/${id}`, data),
    deleteEvent: (id: string) => api.delete<any>(`/calendar/${id}`),
}
