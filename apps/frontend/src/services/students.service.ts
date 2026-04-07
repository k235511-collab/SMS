import { api } from '@/lib/api-client'

export interface Student {
  id: string
  rollNumber: string
  firstName: string
  lastName: string
  guardianName?: string
  guardianPhone?: string
  dateOfBirth?: string
  gender?: string
  status: string
  classId: string
  sectionId?: string
  class?: { id: string; name: string }
  section?: { id: string; name: string }
  user?: { email?: string; phone?: string }
  balance?: number
}

export interface GetStudentsParams {
  classId?: string
  sectionId?: string
  academicYearId?: string
  status?: string
  search?: string
  page?: number
  pageSize?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PaginatedStudents {
  data: Student[]
  meta: {
    total: number
    page: number
    pageSize: number
    totalPages: number
  }
}

export const studentsService = {
  getAll: (params?: GetStudentsParams) => {
    const query = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          query.set(key, String(value))
        }
      })
    }
    const qs = query.toString()
    return api.get<PaginatedStudents>(`/students${qs ? `?${qs}` : ''}`)
  },

  getById: (id: string) => api.get<Student>(`/students/${id}`),

  getStats: (params?: GetStudentsParams) => {
    const query = new URLSearchParams()
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== '') {
          query.set(key, String(value))
        }
      })
    }
    const qs = query.toString()
    return api.get<any>(`/students/stats${qs ? `?${qs}` : ''}`)
  },
}
