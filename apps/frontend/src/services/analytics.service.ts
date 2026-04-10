import { api } from '@/lib/api-client'

export const analyticsService = {
    getDashboardMetrics: () => api.get<any>('/analytics/dashboard'),
    getAttendanceTrend: (days?: number) => api.get<any>('/analytics/attendance-trend', { params: { days } }),
    getGradeDistribution: () => api.get<any>('/analytics/grade-distribution'),
    getFinanceSummary: () => api.get<any>('/analytics/finance-summary'),
}

export const reportsService = {
    getAvailableReports: () => api.get<any>('/reports'),
    generateStudentReport: (studentId: string) => api.get<any>(`/reports/student/${studentId}`),
    generateClassReport: (classId: string) => api.get<any>(`/reports/class/${classId}`),
    generateAttendanceReport: (sectionId: string, startDate: string, endDate: string) =>
        api.get<any>('/reports/attendance', { params: { sectionId, startDate, endDate } }),
    generateFinancialReport: (startDate?: string, endDate?: string) =>
        api.get<any>('/reports/financial', { params: { startDate, endDate } }),
    getStudentCardTemplates: () => api.get<any>('/reports/student-card-templates'),
    saveStudentCardTemplate: (templateKey: string, payload: { htmlContent: string; templateName?: string; description?: string }) =>
        api.put<any>(`/reports/student-card-templates/${templateKey}`, payload),
}

export const resourcesService = {
    getAll: (params?: { category?: string; subjectId?: string; search?: string }) =>
        api.get<any>('/resources', { params: params as any }),
    getById: (id: string) => api.get<any>(`/resources/${id}`),
    create: (data: { title: string; fileUrl: string; fileType?: string; category?: string }) =>
        api.post<any>('/resources', data),
    delete: (id: string) => api.delete<any>(`/resources/${id}`),
}
