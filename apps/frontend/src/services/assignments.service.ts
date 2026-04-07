import { api } from '@/lib/api-client'

export const assignmentsService = {
    getAll: (params?: { classId?: string; subjectId?: string; page?: number; pageSize?: number }) =>
        api.get<any>('/assignments', { params: params as any }),
    getById: (id: string) => api.get<any>(`/assignments/${id}`),
    create: (data: { title: string; description?: string; dueDate: string; totalMarks?: number; type?: string; classId: string; subjectId: string; teacherId?: string }) =>
        api.post<any>('/assignments', data),
    update: (id: string, data: any) => api.patch<any>(`/assignments/${id}`, data),
    delete: (id: string) => api.delete<any>(`/assignments/${id}`),
    submit: (data: { assignmentId: string; studentId: string; content?: string; fileUrl?: string }) =>
        api.post<any>('/assignments/submissions', data),
    grade: (id: string, data: { marks: number; grade?: string; feedback?: string }) =>
        api.patch<any>(`/assignments/submissions/${id}/grade`, data),
    getSubmissions: (assignmentId: string) => api.get<any>(`/assignments/${assignmentId}/submissions`),
}
