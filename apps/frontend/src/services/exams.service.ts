import { api, ApiResponse } from '@/lib/api-client'

export interface Exam {
  id: string
  name: string
  type: string
  status: string
  totalMarks: number
  passingMarks: number
  startDate?: string
  endDate?: string
  duration?: number
  weightage?: number
  syllabus?: string
  classId: string
  sectionId: string
  subjectId: string
  academicYearId?: string
  class: { id: string; name: string; code?: string }
  section: { id: string; name: string }
  subject: { id: string; name: string; code?: string }
  academicYear?: { id: string; name: string; isCurrent: boolean }
  _count?: { examResults: number; examTeachers: number }
  examTeachers?: { teacher: { id: string; firstName: string; lastName: string } }[]
  examResults?: ExamResult[]
}

export interface ExamResult {
  id: string
  studentId: string
  examId: string
  subjectId: string
  marksObtained: number
  percentage: number | null
  grade: string | null
  isAbsent: boolean
  isPassed: boolean
  remarks?: string
  student?: { id: string; rollNumber: string; firstName: string; lastName: string }
  subject?: { id: string; name: string; code?: string }
}

export interface ExamStudent {
  id: string
  rollNumber: string
  firstName: string
  lastName: string
  result: ExamResult | null
  hasResult: boolean
}

export interface RecordResultPayload {
  examId: string
  subjectId: string
  studentId: string
  marksObtained: number
  grade?: string
  remarks?: string
  isAbsent?: boolean
}

export interface BulkRecordResultPayload {
  examId: string
  subjectId: string
  results: {
    studentId: string
    marksObtained: number
    grade?: string
    remarks?: string
    isAbsent?: boolean
  }[]
}

export interface CreateExamPayload {
  name: string
  type: string
  classId: string
  sectionId: string
  subjectId: string
  academicYearId: string
  teacherId?: string
  startDate?: string
  endDate?: string
  duration?: number
  totalMarks?: number
  passingMarks?: number
  weightage?: number
  syllabus?: string
  status?: string
}

export const examsService = {
  /** Create a new exam */
  create(data: CreateExamPayload): Promise<ApiResponse<Exam>> {
    return api.post('/exams', data)
  },

  /** List exams (teacher-scoped) */
  getAll(params?: {
    classId?: string
    subjectId?: string
    academicYearId?: string
    search?: string
    page?: number
    pageSize?: number
  }): Promise<ApiResponse<{ data: Exam[]; total: number; page: number; pageSize: number; totalPages: number }>> {
    return api.get('/exams', { params })
  },

  /** Get exam by ID with results */
  getById(id: string): Promise<ApiResponse<Exam>> {
    return api.get(`/exams/${id}`)
  },

  /** Update an exam */
  update(id: string, data: Partial<CreateExamPayload>): Promise<ApiResponse<Exam>> {
    return api.patch(`/exams/${id}`, data)
  },

  /** Update exam status */
  updateStatus(id: string, status: string): Promise<ApiResponse<Exam>> {
    return api.patch(`/exams/${id}/status`, { status })
  },

  /** Delete an exam */
  delete(id: string): Promise<ApiResponse<{ success: boolean }>> {
    return api.delete(`/exams/${id}`)
  },

  /** Get students with result status for an exam */
  getStudents(examId: string): Promise<ApiResponse<ExamStudent[]>> {
    return api.get(`/exams/${examId}/students`)
  },

  /** Get exam analytics */
  getAnalytics(examId: string): Promise<ApiResponse<{
    totalStudents: number
    passedStudents: number
    failedStudents: number
    absentStudents: number
    averageMarks: number
    highestMarks: number
    lowestMarks: number
    passRate: number
  }>> {
    return api.get(`/exams/${examId}/analytics`)
  },

  /** Check if current user can edit results */
  canEditResults(examId: string): Promise<ApiResponse<boolean>> {
    return api.get(`/exams/${examId}/can-edit`)
  },

  /** Record a single result */
  recordResult(data: RecordResultPayload): Promise<ApiResponse<ExamResult>> {
    return api.post('/exams/results', data)
  },

  /** Record results in bulk */
  bulkRecordResults(data: BulkRecordResultPayload): Promise<ApiResponse<{ recorded: number }>> {
    return api.post('/exams/results/bulk', data)
  },

  /** Get results for an exam */
  getResults(examId: string): Promise<ApiResponse<ExamResult[]>> {
    return api.get(`/exams/results/${examId}`)
  },

  /** Get grading scales */
  getGradingScales(): Promise<ApiResponse<{ id: string; name: string; minPercent: number; maxPercent: number; gpa?: number }[]>> {
    return api.get('/exams/grading-scales')
  },
}
