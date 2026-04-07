import { api } from '@/lib/api-client'

export const gradesService = {
    getAll: (params?: { studentId?: string; subjectId?: string; academicYearId?: string }) =>
        api.get<any>('/grades', { params: params as any }),
    getById: (id: string) => api.get<any>(`/grades/${id}`),
    create: (data: { score: number; maxScore?: number; weight?: number; category?: string; studentId: string; subjectId: string; academicYearId?: string }) =>
        api.post<any>('/grades', data),
    update: (id: string, data: any) => api.patch<any>(`/grades/${id}`, data),
    delete: (id: string) => api.delete<any>(`/grades/${id}`),
    getStudentSummary: (studentId: string) => api.get<any>(`/grades/student/${studentId}/summary`),
}
