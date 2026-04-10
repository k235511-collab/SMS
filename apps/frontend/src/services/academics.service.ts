import { api } from '@/lib/api-client'

export const academicsService = {
    getClasses: () => api.get<any>('/academics/classes?pageSize=200'),
    getSectionsByClass: (classId: string) => api.get<any>(`/academics/sections/class/${classId}`),
    getMyClasses: () => api.get<any>('/teachers/my-classes'), // Endpoint for logged-in teacher
    getSubjects: (classId?: string) => api.get<any>(`/academics/subjects?pageSize=200${classId ? `&classId=${encodeURIComponent(classId)}` : ''}`),
    getTeachers: () => api.get<any>('/teachers'), // Assuming teachers endpoint exists
}
