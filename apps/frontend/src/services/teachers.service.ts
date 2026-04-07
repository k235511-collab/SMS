import { api } from '@/lib/api-client'

export const teachersService = {
    /** Get the current logged-in teacher's class assignments */
    getMyClasses: (academicYearId?: string) =>
        api.get<any>('/teachers/my-classes', { params: { academicYearId } }),

    /** Get the current logged-in teacher's full profile */
    getMyProfile: () => api.get<any>('/teachers/me'),

    /** Update the current logged-in teacher's profile (limited fields) */
    updateMyProfile: (data: {
        phone?: string
        address?: string
        photo?: string
        note?: string
        religion?: string
        bloodGroup?: string
    }) => api.patch<any>('/teachers/me', data),

    /** Admin: get all class assignments for a specific teacher */
    getClassAssignments: (teacherId: string, academicYearId?: string) =>
        api.get<any>(`/teachers/${teacherId}/class-assignments`, { params: { academicYearId } }),

    /** Admin: assign a class/section/subject to a teacher */
    assignClass: (teacherId: string, data: {
        classId: string
        sectionId?: string
        subjectId?: string
        academicYearId?: string
        isActive?: boolean
    }) => api.post<any>(`/teachers/${teacherId}/class-assignments`, data),

    /** Admin: remove a class assignment from a teacher */
    removeClassAssignment: (teacherId: string, assignmentId: string) =>
        api.delete<any>(`/teachers/${teacherId}/class-assignments/${assignmentId}`),

    /** Admin: sync teacher's teaching assignments for an academic year */
    syncClasses: (
        teacherId: string,
        academicYearId: string,
        assignments: Array<{ classId: string; sectionIds?: string[]; subjectIds?: string[]; academicYearId?: string }>,
    ) => api.patch<any>(`/teachers/${teacherId}/sync-classes`, { academicYearId, assignments }),
}
