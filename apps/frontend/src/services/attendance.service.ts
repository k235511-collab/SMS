import { api, ApiResponse } from '@/lib/api-client'

export interface AttendanceRecord {
  studentId: string
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED' | 'HALF_DAY' | 'UNMARKED'
  remarks?: string
}

export interface MarkAttendancePayload {
  date: string
  classId?: string
  sectionId?: string
  records: AttendanceRecord[]
}

export interface AttendanceEntry {
  id: string
  date: string
  status: string
  remarks?: string
  student: { id: string; rollNumber: string; firstName: string; lastName: string }
  section?: { id: string; name: string; class: { name: string } }
}

export interface AttendanceReportStudent {
  student: { id: string; rollNumber: string; firstName: string; lastName: string }
  records: { date: string; status: string; remarks?: string }[]
  summary: { present: number; absent: number; late: number; excused: number; halfDay: number; total: number }
}

export const attendanceService = {
  /** Mark attendance for multiple students */
  mark(data: MarkAttendancePayload): Promise<ApiResponse<{ marked: number; date: string }>> {
    return api.post('/attendance', data)
  },

  /** List attendance records (teacher-scoped) */
  getAll(params?: {
    sectionId?: string
    studentId?: string
    startDate?: string
    endDate?: string
    page?: number
    pageSize?: number
  }): Promise<ApiResponse<{ data: AttendanceEntry[]; total: number; page: number; pageSize: number; totalPages: number }>> {
    return api.get('/attendance', { params })
  },

  /** Get attendance for a specific student */
  getByStudent(studentId: string, startDate?: string, endDate?: string): Promise<ApiResponse<AttendanceEntry[]>> {
    return api.get(`/attendance/student/${studentId}`, { params: { startDate, endDate } })
  },

  /** Get attendance report for a section */
  getReport(sectionId: string, startDate: string, endDate: string): Promise<ApiResponse<AttendanceReportStudent[]>> {
    return api.get('/attendance/report', { params: { sectionId, startDate, endDate } })
  },
}
