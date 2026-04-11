import { api } from '@/lib/api-client'
import Cookies from 'js-cookie'
import env from '@/lib/env'

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
  regNo?: string
  balanceMin?: string
  balanceMax?: string
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

export interface StudentImportError {
  rowNumber: number
  field: string
  message: string
}

export interface StudentImportPreview {
  summary: {
    totalRows: number
    validRows: number
    invalidRows: number
  }
  validRows: Array<{
    rowNumber: number
    rollNumber: string
    firstName: string
    lastName: string
    className: string
    sectionName: string
    status: string
  }>
  errors: StudentImportError[]
}

export interface StudentImportCommitResult {
  summary: {
    totalRows: number
    validRows: number
    invalidRows: number
  }
  imported: number
  failed: number
  errors: StudentImportError[]
}

function buildDownloadHeaders(): Record<string, string> {
  const headers: Record<string, string> = {}

  const accessToken = Cookies.get(env.ACCESS_TOKEN_COOKIE)
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`
  }

  const schoolId = Cookies.get(env.SCHOOL_ID_COOKIE)
  if (schoolId) {
    headers['x-school-id'] = schoolId
  }

  const campusId = Cookies.get('sms_selected_campus_id')
  if (campusId) {
    headers['x-campus-id'] = campusId
  }

  return headers
}

async function downloadFile(endpoint: string, params?: GetStudentsParams): Promise<{ blob: Blob; fileName: string }> {
  const url = new URL(`${env.API_URL}${endpoint}`)
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') {
        url.searchParams.set(key, String(value))
      }
    })
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: buildDownloadHeaders(),
    cache: 'no-store',
  })

  if (!response.ok) {
    let message = `Request failed (${response.status})`
    try {
      const payload = await response.json()
      if (payload?.message) {
        message = Array.isArray(payload.message) ? payload.message.join(', ') : payload.message
      }
    } catch {
      // Keep fallback error message.
    }
    throw new Error(message)
  }

  const blob = await response.blob()
  const disposition = response.headers.get('content-disposition') || ''
  const fileNameMatch = disposition.match(/filename="?([^\";]+)"?/i)

  return {
    blob,
    fileName: fileNameMatch?.[1] || 'students.xlsx',
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

  downloadImportTemplate: () => downloadFile('/students/import/template'),

  previewImport: async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    const res = await api.post<StudentImportPreview>('/students/import/preview', formData)
    if (!res.success || !res.data) {
      throw new Error(res.message || 'Failed to preview student import')
    }
    return res.data
  },

  commitImport: async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    const res = await api.post<StudentImportCommitResult>('/students/import/commit', formData)
    if (!res.success || !res.data) {
      throw new Error(res.message || 'Failed to import students')
    }
    return res.data
  },

  exportExcel: (params?: GetStudentsParams) => downloadFile('/students/export', params),
}
