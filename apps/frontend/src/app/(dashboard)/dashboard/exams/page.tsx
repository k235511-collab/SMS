'use client'

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { useSession } from '@/context/session-context'
import { ProtectedRoute, PermissionGate } from '@/components/auth'
import { DataTable, type ColumnDef, SortableHeader } from '@/components/ui/data-table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { SelectEmptyItem, SelectLoadingItem } from '@/components/ui/select-state-items'
import { Textarea } from '@/components/ui/textarea'
import { api } from '@/lib/api-client'
import { Plus, Search, MoreHorizontal, Pencil, Eye, Trash2, Filter } from 'lucide-react'
import { toast } from 'sonner'
import { CampusBadge } from '@/components/campus-badge'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import { teachersService } from '@/services/teachers.service'
import type { AcademicYear } from '@/lib/types'
import { ExamResultsFiltersBar } from '@/components/exams/exam-results-filters-bar'
import { ExamStudentResultsTable, type ExamStudentResultRow, type StudentExamDetailRow } from '@/components/exams/exam-student-results-table'

interface Class {
  id: string
  name: string
  code: string
}

interface Section {
  id: string
  name: string
  classId: string
}

interface Subject {
  id: string
  name: string
  code: string
  classId?: string
}

interface Teacher {
  id: string
  firstName: string
  lastName: string
  employeeId: string
}

interface Exam {
  id: string
  name: string
  type: string
  status: string
  startDate?: string
  endDate?: string
  totalMarks?: number
  passingMarks?: number
  duration?: number
  weightage?: number
  isActive: boolean
  class?: { id: string; name: string; code: string }
  section?: { id: string; name: string }
  subject?: { id: string; name: string; code: string }
  academicYear?: { id: string; name: string; isCurrent?: boolean }
  createdAt: string
}

interface PaginatedResponse { data: Exam[]; meta: { total: number; page: number; pageSize: number; totalPages: number } }

const examTypes = ['QUIZ', 'MID_TERM', 'FINAL', 'ASSIGNMENT', 'PRACTICAL', 'CUSTOM']
const examStatuses = ['DRAFT', 'SCHEDULED', 'ONGOING', 'COMPLETED', 'CANCELLED']
const ALL_SECTIONS_VALUE = '__ALL_SECTIONS__'

const statusColors: Record<string, 'secondary' | 'default' | 'success' | 'destructive'> = {
  DRAFT: 'secondary',
  SCHEDULED: 'default',
  ONGOING: 'default',
  COMPLETED: 'success',
  CANCELLED: 'destructive',
}

export default function ExamsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const isTeacher = !!user?.teacherId
  const { selectedCampus, selectedYear, academicYears, isLoading: isSessionLoading } = useSession()
  const [exams, setExams] = useState<Exam[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Exam | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  // Filter state
  const [filterClass, setFilterClass] = useState('')
  const [filterSubject, setFilterSubject] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  // Form state
  const [form, setForm] = useState({
    name: '',
    type: 'QUIZ',
    customTypeName: '',
    academicYearId: '',
    classId: '',
    sectionId: '',
    subjectId: '',
    teacherId: '',
    startDate: '',
    endDate: '',
    duration: '',
    totalMarks: '100',
    passingMarks: '40',
    weightage: '',
    syllabus: '',
    status: 'DRAFT',
  })

  // Dropdown data
  const [classes, setClasses] = useState<Class[]>([])
  const [modalSections, setModalSections] = useState<Section[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [teachers, setTeachers] = useState<Teacher[]>([])
  // Teacher assignments (used to scope dropdowns when isTeacher)
  const [teacherAssignments, setTeacherAssignments] = useState<any[]>([])
  const [dropdownDataLoading, setDropdownDataLoading] = useState(true)
  const [modalSectionsLoading, setModalSectionsLoading] = useState(false)
  const [subjectsLoading, setSubjectsLoading] = useState(false)
  const [resultsSectionsLoading, setResultsSectionsLoading] = useState(false)

  const [resultsRows, setResultsRows] = useState<ExamStudentResultRow[]>([])
  const [resultsLoading, setResultsLoading] = useState(false)
  const [resultsSearch, setResultsSearch] = useState('')
  const [resultsClassId, setResultsClassId] = useState('')
  const [resultsSectionId, setResultsSectionId] = useState('')
  const [resultsSections, setResultsSections] = useState<Section[]>([])
  const examsRequestRef = useRef(0)
  const studentResultsRequestRef = useRef(0)

  const uniqueResultsSections = useMemo(() => {
    const seen = new Set<string>()
    const unique: Section[] = []

    for (const section of resultsSections) {
      const key = section.name.trim().toLowerCase()
      if (seen.has(key)) continue
      seen.add(key)
      unique.push(section)
    }

    return unique
  }, [resultsSections])

  // Fetch dropdown data
  useEffect(() => {
    const fetchDropdownData = async () => {
      setDropdownDataLoading(true)
      try {
        if (isTeacher) {
          // Teacher: scope dropdowns to their assigned classes/subjects
          const assignmentsRes = await teachersService.getMyClasses(selectedYear?.id)
          if (assignmentsRes.success && assignmentsRes.data) {
            const assignments = Array.isArray(assignmentsRes.data) ? assignmentsRes.data : (assignmentsRes.data as any).data || []
            setTeacherAssignments(assignments)

            // Extract unique classes
            const classMap = new Map<string, Class>()
            for (const a of assignments) {
              if (a.class) classMap.set(a.class.id, { id: a.class.id, name: a.class.name, code: a.class.code || '' })
            }
            setClasses(Array.from(classMap.values()))

            // Extract unique subjects
            const subjectMap = new Map<string, Subject>()
            for (const a of assignments) {
              if (a.subject) subjectMap.set(a.subject.id, { id: a.subject.id, name: a.subject.name, code: a.subject.code || '' })
            }
            setSubjects(Array.from(subjectMap.values()))
          }
          // Teachers don't need the teachers dropdown
          setTeachers([])
        } else {
          // Admin: fetch all data
          const [classesRes, subjectsRes, teachersRes] = await Promise.all([
            api.get<Class[]>('/academics/classes', { params: { pageSize: 100 } }),
            api.get<Subject[]>('/academics/subjects', { params: { pageSize: 100 } }),
            api.get<Teacher[]>('/teachers', { params: { pageSize: 100 } }),
          ])

        // Handle classes response - could be array or {data: array}
        if (classesRes.success && classesRes.data) {
          const classesData = Array.isArray(classesRes.data) ? classesRes.data : (classesRes.data as any).data || []
          setClasses(classesData)
        }

        // Handle subjects response
        if (subjectsRes.success && subjectsRes.data) {
          const subjectsData = Array.isArray(subjectsRes.data) ? subjectsRes.data : (subjectsRes.data as any).data || []
          setSubjects(subjectsData)
        }

        // Handle teachers response
        if (teachersRes.success && teachersRes.data) {
          const teachersData = Array.isArray(teachersRes.data) ? teachersRes.data : (teachersRes.data as any).data || []
          setTeachers(teachersData)
        }
        }
      } catch (error) {
        console.error('Failed to fetch dropdown data:', error)
      } finally {
        setDropdownDataLoading(false)
      }
    }
    fetchDropdownData()
  }, [selectedCampus?.id, selectedYear?.id, isTeacher])

  // Fetch sections when class changes in exam modal
  useEffect(() => {
    const fetchModalSections = async () => {
      if (!form.classId) {
        setModalSections([])
        setModalSectionsLoading(false)
        return
      }

      setModalSectionsLoading(true)

      if (isTeacher) {
        // Teacher: filter sections from their assignments for the selected class
        const classAssignments = teacherAssignments.filter((a: any) => a.class?.id === form.classId)
        // If any assignment has sectionId=null, teacher has access to ALL sections (class teacher)
        const hasFullClassAccess = classAssignments.some((a: any) => !a.sectionId)
        if (hasFullClassAccess) {
          // Fetch all sections from API
          const res = await api.get<Section[]>(`/academics/sections/class/${form.classId}`)
          if (res.success && res.data) {
            const sectionsData = Array.isArray(res.data) ? res.data : (res.data as any).data || []
            setModalSections(sectionsData)
          } else {
            setModalSections([])
          }
          return
        }
        const filtered = classAssignments
          .filter((a: any) => a.section)
          .map((a: any) => ({ id: a.section.id, name: a.section.name, classId: form.classId }))
        // Deduplicate
        const seen = new Set<string>()
        const unique: Section[] = []
        for (const s of filtered) {
          if (!seen.has(s.id)) { seen.add(s.id); unique.push(s) }
        }
        setModalSections(unique)
        setModalSectionsLoading(false)
        return
      }

      const res = await api.get<Section[]>(`/academics/sections/class/${form.classId}`)
      if (res.success && res.data) {
        const sectionsData = Array.isArray(res.data) ? res.data : (res.data as any).data || []
        setModalSections(sectionsData)
      } else {
        setModalSections([])
      }

      setModalSectionsLoading(false)
    }

    fetchModalSections()
  }, [form.classId, isTeacher, teacherAssignments])

  // Fetch sections for student results filter
  useEffect(() => {
    const fetchResultsSections = async () => {
      setResultsSectionsLoading(true)
      try {
        if (isTeacher) {
          if (!resultsClassId) {
            setResultsSections([])
            return
          }

          const classAssignments = teacherAssignments.filter((a: any) => a.class?.id === resultsClassId)
          const hasFullClassAccess = classAssignments.some((a: any) => !a.sectionId)

          if (hasFullClassAccess) {
            const res = await api.get<any>(`/academics/sections/class/${resultsClassId}`)
            if (res.success && res.data) {
              const sectionData = Array.isArray(res.data) ? res.data : (res.data as any).data || []
              setResultsSections(sectionData)
            } else {
              setResultsSections([])
            }
            return
          }

          const explicitSections = classAssignments
            .filter((a: any) => a.section)
            .map((a: any) => ({ id: a.section.id, name: a.section.name, classId: resultsClassId }))
          const seen = new Set<string>()
          const uniqueSections: Section[] = []
          for (const section of explicitSections) {
            if (!seen.has(section.id)) {
              seen.add(section.id)
              uniqueSections.push(section)
            }
          }
          setResultsSections(uniqueSections)
          return
        }

        const endpoint = resultsClassId
          ? `/academics/sections/class/${resultsClassId}`
          : '/academics/sections'

        const res = await api.get<any>(endpoint, { params: resultsClassId ? undefined : { pageSize: 200 } })
        if (res.success && res.data) {
          const sectionData = Array.isArray(res.data) ? res.data : (res.data as any).data || []
          setResultsSections(sectionData)
        } else {
          setResultsSections([])
        }
      } finally {
        setResultsSectionsLoading(false)
      }
    }

    fetchResultsSections()
  }, [resultsClassId, selectedCampus?.id, isTeacher, teacherAssignments])

  // Fetch subjects when class changes
  useEffect(() => {
    const fetchSubjects = async () => {
      if (!form.classId) {
        setSubjects([])
        setSubjectsLoading(false)
        return
      }

      setSubjectsLoading(true)
      try {
        if (isTeacher) {
          // Teacher: filter subjects from assignments for the selected class
          const classAssignments = teacherAssignments.filter((a: any) => a.class?.id === form.classId)
          // If any assignment has subjectId=null, teacher has access to ALL subjects (class teacher)
          const hasFullSubjectAccess = classAssignments.some((a: any) => !a.subjectId)
          if (hasFullSubjectAccess) {
            // Fetch all subjects for this class from API
            const res = await api.get<Subject[]>('/academics/subjects', { params: { classId: form.classId, pageSize: 100 } })
            if (res.success && res.data) {
              const subjectsData = Array.isArray(res.data) ? res.data : (res.data as any).data || []
              setSubjects(subjectsData)
            } else {
              setSubjects([])
            }
            return
          }
          const filtered = classAssignments
            .filter((a: any) => a.subject)
            .map((a: any) => ({ id: a.subject.id, name: a.subject.name, code: a.subject.code || '' }))
          const seen = new Set<string>()
          const unique: Subject[] = []
          for (const s of filtered) {
            if (!seen.has(s.id)) { seen.add(s.id); unique.push(s) }
          }
          setSubjects(unique)
          return
        }
        const res = await api.get<Subject[]>('/academics/subjects', { params: { classId: form.classId, pageSize: 100 } })
        if (res.success && res.data) {
          const subjectsData = Array.isArray(res.data) ? res.data : (res.data as any).data || []
          setSubjects(subjectsData)
        } else {
          setSubjects([])
        }
      } finally {
        setSubjectsLoading(false)
      }
    }
    fetchSubjects()
  }, [form.classId, isTeacher, teacherAssignments])

  // Fetch exams with filters
  const fetchExams = useCallback(async () => {
    if (isSessionLoading) {
      return
    }

    const requestId = ++examsRequestRef.current
    setLoading(true)
    try {
      const params: any = {
        page,
        pageSize: 20,
        search: search || undefined,
        classId: filterClass !== 'all' && filterClass ? filterClass : undefined,
        subjectId: filterSubject !== 'all' && filterSubject ? filterSubject : undefined,
        status: filterStatus !== 'all' && filterStatus ? filterStatus : undefined,
        academicYearId: selectedYear?.id || undefined,
      }
      const res = await api.get<PaginatedResponse>('/exams', { params })

      if (requestId !== examsRequestRef.current) {
        return
      }

      if (res.success && res.data) {
        setExams(res.data.data || [])
        setTotal(res.data.meta?.total || 0)
      } else {
        setExams([])
        setTotal(0)
      }
    } catch {
      if (requestId === examsRequestRef.current) {
        setExams([])
        setTotal(0)
      }
    } finally {
      if (requestId === examsRequestRef.current) {
        setLoading(false)
      }
    }
  }, [page, search, filterClass, filterSubject, filterStatus, selectedCampus?.id, selectedYear?.id, isSessionLoading])

  const fetchStudentResults = useCallback(async () => {
    if (isSessionLoading) {
      return
    }

    const requestId = ++studentResultsRequestRef.current
    setResultsLoading(true)
    try {
      const params: any = {
        page: 1,
        pageSize: 200,
        search: resultsSearch || undefined,
        classId: resultsClassId || undefined,
        sectionId: resultsSectionId || undefined,
        academicYearId: selectedYear?.id || undefined,
      }

      const res = await api.get<{ data: ExamStudentResultRow[] }>('/exams/student-results', { params })

      if (requestId !== studentResultsRequestRef.current) {
        return
      }

      if (res.success && res.data) {
        const rows = Array.isArray(res.data) ? res.data : (res.data as any).data || []
        setResultsRows(rows)
      } else {
        setResultsRows([])
      }
    } catch {
      if (requestId === studentResultsRequestRef.current) {
        setResultsRows([])
      }
    } finally {
      if (requestId === studentResultsRequestRef.current) {
        setResultsLoading(false)
      }
    }
  }, [resultsSearch, resultsClassId, resultsSectionId, selectedYear?.id, isSessionLoading])

  const detailsCacheKey = useMemo(() => {
    const yearKey = selectedYear?.id || 'no-year'
    const campusKey = selectedCampus?.id || 'no-campus'
    const classKey = resultsClassId || 'all-classes'
    const sectionKey = resultsSectionId || 'all-sections'
    return [yearKey, campusKey, classKey, sectionKey].join('::')
  }, [selectedYear?.id, selectedCampus?.id, resultsClassId, resultsSectionId])

  const loadStudentAllExamResults = useCallback(async (studentId: string): Promise<StudentExamDetailRow[]> => {
    if (!selectedYear?.id) {
      return []
    }

    const res = await api.get<StudentExamDetailRow[]>(`/exams/student-results/${studentId}`, {
      params: {
        academicYearId: selectedYear?.id || undefined,
        classId: resultsClassId || undefined,
        sectionId: resultsSectionId || undefined,
      },
    })
    if (res.success && res.data) {
      return Array.isArray(res.data) ? res.data : []
    }
    return []
  }, [selectedYear?.id, resultsClassId, resultsSectionId])

  useEffect(() => {
    fetchExams()
  }, [fetchExams])

  useEffect(() => {
    fetchStudentResults()
  }, [fetchStudentResults])

  const openCreate = () => {
    setEditing(null)
    setForm({
      name: '', type: 'QUIZ', customTypeName: '', academicYearId: selectedYear?.id || '', classId: '', sectionId: '', subjectId: '', teacherId: '',
      startDate: '', endDate: '', duration: '', totalMarks: '100', passingMarks: '40',
      weightage: '', syllabus: '', status: 'DRAFT',
    })
    setDialogOpen(true)
  }

  const openEdit = (exam: Exam) => {
    setEditing(exam)
    setForm({
      name: exam.name,
      type: exam.type,
      customTypeName: '',
      academicYearId: exam.academicYear?.id || selectedYear?.id || '',
      classId: exam.class?.id || '',
      sectionId: exam.section?.id || '',
      subjectId: exam.subject?.id || '',
      teacherId: '',
      startDate: exam.startDate?.slice(0, 10) || '',
      endDate: exam.endDate?.slice(0, 10) || '',
      duration: exam.duration?.toString() || '',
      totalMarks: exam.totalMarks?.toString() || '100',
      passingMarks: exam.passingMarks?.toString() || '40',
      weightage: exam.weightage?.toString() || '',
      syllabus: '',
      status: exam.status || 'DRAFT',
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.name || !form.academicYearId || !form.classId || !form.sectionId || !form.subjectId) {
      toast.error('Please fill in all required fields')
      return
    }

    if (form.type === 'CUSTOM' && !form.customTypeName) {
      toast.error('Please enter a custom type name')
      return
    }

    setSaving(true)
    try {
      const body: Record<string, unknown> = {
        name: form.name,
        type: form.type === 'CUSTOM' && form.customTypeName ? form.customTypeName.toUpperCase().replace(/ /g, '_') : form.type,
        academicYearId: form.academicYearId,
        classId: form.classId,
        sectionId: form.sectionId,
        subjectId: form.subjectId,
        teacherId: isTeacher ? user?.teacherId : (form.teacherId || undefined),
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        duration: form.duration ? Number(form.duration) : undefined,
        totalMarks: Number(form.totalMarks) || 100,
        passingMarks: Number(form.passingMarks) || 40,
        weightage: form.weightage ? Number(form.weightage) : undefined,
        syllabus: form.syllabus || undefined,
        status: form.status,
      }

      if (!editing && form.sectionId === ALL_SECTIONS_VALUE) {
        const sectionsRes = await api.get<Section[]>(`/academics/sections/class/${form.classId}`)
        const classSections = sectionsRes.success && sectionsRes.data
          ? (Array.isArray(sectionsRes.data) ? sectionsRes.data : (sectionsRes.data as any).data || [])
          : []

        if (!classSections.length) {
          toast.error('No sections found for selected class')
          return
        }

        const createResults = await Promise.all(
          classSections.map((section) => api.post('/exams', { ...body, sectionId: section.id })),
        )

        const successCount = createResults.filter((result) => result.success).length
        if (successCount === classSections.length) {
          toast.success(`Created ${successCount} exams for all sections`)
          setDialogOpen(false)
          fetchExams()
        } else if (successCount > 0) {
          toast.success(`Created ${successCount} exams. Some sections failed.`)
          setDialogOpen(false)
          fetchExams()
        } else {
          toast.error(createResults[0]?.message || 'Failed to create exams for sections')
        }
        return
      }

      const res = editing
        ? await api.patch(`/exams/${editing.id}`, body)
        : await api.post('/exams', body)
      if (res.success) {
        toast.success(editing ? 'Exam updated' : 'Exam created')
        setDialogOpen(false)
        fetchExams()
      } else {
        toast.error(res.message || 'Failed')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleting) return
    try {
      const res = await api.delete(`/exams/${deleting}`)
      if (res.success) {
        toast.success('Exam deleted successfully')
        setDeleteConfirmOpen(false)
        setDeleting(null)
        fetchExams()
      } else {
        toast.error(res.message || 'Failed to delete exam')
      }
    } catch (error) {
      toast.error('An error occurred while deleting the exam')
    }
  }

  const columns: ColumnDef<Exam, unknown>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => <SortableHeader column={column}>Name</SortableHeader>,
      cell: ({ row }) => (
        <button
          className="text-primary hover:underline font-medium"
          onClick={() => router.push(`/dashboard/exams/${row.original.id}`)}
        >
          {row.original.name}
        </button>
      ),
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => <Badge variant={"outline" as const}>{(row.original.type || '').replace('_', ' ')}</Badge>,
    },
    {
      accessorKey: 'class',
      header: 'Class',
      cell: ({ row }) => row.original.class?.name || '—',
    },
    {
      accessorKey: 'section',
      header: 'Section',
      cell: ({ row }) => row.original.section?.name || '—',
    },
    {
      accessorKey: 'subject',
      header: 'Subject',
      cell: ({ row }) => row.original.subject?.name || '—',
    },
    {
      accessorKey: 'academicYear',
      header: 'Academic Year',
      cell: ({ row }) => row.original.academicYear?.name || '—',
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={statusColors[row.original.status] || 'secondary'}>
          {row.original.status || 'DRAFT'}
        </Badge>
      ),
    },
    {
      accessorKey: 'startDate',
      header: 'Start Date',
      cell: ({ row }) => row.original.startDate ? new Date(row.original.startDate).toLocaleDateString() : '—',
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <PermissionGate permission="exams:update">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/exams/${row.original.id}`) }}>
                <Eye className="mr-2 h-4 w-4" />View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEdit(row.original) }}>
                <Pencil className="mr-2 h-4 w-4" />Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={(e) => {
                  e.stopPropagation()
                  setDeleting(row.original.id)
                  setDeleteConfirmOpen(true)
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" />Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </PermissionGate>
      ),
    },
  ]

  return (
    <ProtectedRoute permission="exams:read">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Exams</h1>
            <p className="mt-1 text-sm text-muted-foreground">Manage examinations and results ({total} total)</p>
          </div>
          <PermissionGate permission="exams:create">
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />Create Exam
            </Button>
          </PermissionGate>
        </div>
        <Tabs defaultValue="exams" className="space-y-4">
          <TabsList>
            <TabsTrigger value="exams">Exams</TabsTrigger>
            <TabsTrigger value="student-results">Student Results</TabsTrigger>
          </TabsList>

          <TabsContent value="exams">
            <DataTable
              columns={columns}
              data={exams}
              onRowClick={(exam: Exam) => router.push(`/dashboard/exams/${exam.id}`)}
              isLoading={loading}
              emptyMessage="No exams found."
              toolbar={
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
                  <div className="relative max-w-sm flex-1">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      placeholder="Search exams..."
                      value={search}
                      onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                      className="pl-9"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-muted-foreground" />
                    <Select
                      value={filterClass || 'all'}
                      onValueChange={(v) => {
                        setFilterClass(v === 'all' ? '' : v)
                        setPage(1)
                      }}
                      disabled={dropdownDataLoading}
                    >
                      <SelectTrigger className="w-full sm:w-44">
                        <SelectValue placeholder="All Classes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Classes</SelectItem>
                        {dropdownDataLoading ? (
                          <SelectLoadingItem label="Loading classes..." />
                        ) : classes.length > 0 ? (
                          classes.map((c) => (
                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                          ))
                        ) : (
                          <SelectEmptyItem label="No classes available" />
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              }
            />
          </TabsContent>

          <TabsContent value="student-results" className="space-y-4">
            <ExamResultsFiltersBar
              search={resultsSearch}
              onSearchChange={setResultsSearch}
              classId={resultsClassId}
              onClassChange={(value) => {
                setResultsClassId(value)
                setResultsSectionId('')
              }}
              sectionId={resultsSectionId}
              onSectionChange={setResultsSectionId}
              classes={classes.map((item) => ({ id: item.id, name: item.name }))}
              sections={uniqueResultsSections.map((item) => ({ id: item.id, name: item.name }))}
              classesLoading={dropdownDataLoading}
              sectionsLoading={resultsSectionsLoading}
              onReset={() => {
                setResultsSearch('')
                setResultsClassId('')
                setResultsSectionId('')
              }}
            />

            <ExamStudentResultsTable
              data={resultsRows}
              isLoading={resultsLoading}
              loadStudentDetails={loadStudentAllExamResults}
              detailsCacheKey={detailsCacheKey}
            />
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
          </DialogHeader>
          <p className="py-4 text-sm text-muted-foreground">
            Are you sure you want to delete this exam? This action cannot be undone and will delete all associated results and teacher assignments.
          </p>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button variant="destructive" onClick={handleDelete}>
              Delete Exam
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Exam' : 'Create Exam'}</DialogTitle>
          </DialogHeader>
          {!editing && <CampusBadge />}
          <div className="grid gap-4 py-4">
            {(dropdownDataLoading || modalSectionsLoading || subjectsLoading) && (
              <div className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                <Spinner size="sm" />
                <span>
                  {dropdownDataLoading
                    ? 'Loading exam options...'
                    : modalSectionsLoading
                      ? 'Loading sections...'
                      : 'Loading subjects...'}
                </span>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Exam Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Midterm 2026"
                />
              </div>
              <div className="grid gap-2">
                <Label>Type *</Label>
                <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
                  <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    {examTypes.map((t) => (
                      <SelectItem key={t} value={t}>{t === 'CUSTOM' ? 'Custom Exam' : t.replace('_', ' ')}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {form.type === 'CUSTOM' && (
              <div className="grid gap-2">
                <Label>Custom Type Name *</Label>
                <Input
                  value={form.customTypeName}
                  onChange={(e) => setForm({ ...form, customTypeName: e.target.value })}
                  placeholder="e.g. Oral Test, Presentation, Project"
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="grid gap-2">
                <Label>Academic Year *</Label>
                <Select value={form.academicYearId} onValueChange={(v) => setForm({ ...form, academicYearId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select year" /></SelectTrigger>
                  <SelectContent>
                    {academicYears.map((year: AcademicYear) => (
                      <SelectItem key={year.id} value={year.id}>{year.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Class *</Label>
                <Select
                  value={form.classId}
                  onValueChange={(v) => setForm({ ...form, classId: v, sectionId: '', subjectId: '' })}
                  disabled={dropdownDataLoading}
                >
                  <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                  <SelectContent>
                    {dropdownDataLoading ? (
                      <SelectLoadingItem label="Loading classes..." />
                    ) : classes.length > 0 ? (
                      classes.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))
                    ) : (
                      <SelectEmptyItem label="No classes available" />
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Section *</Label>
                <Select
                  value={form.sectionId}
                  onValueChange={(v) => setForm({ ...form, sectionId: v })}
                  disabled={!form.classId || modalSectionsLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={modalSectionsLoading ? 'Loading sections...' : 'Select section'} />
                  </SelectTrigger>
                  <SelectContent>
                    {!editing && form.classId && !isTeacher && (
                      <SelectItem value={ALL_SECTIONS_VALUE}>All Sections</SelectItem>
                    )}
                    {!form.classId ? (
                      <SelectEmptyItem label="Select a class first" />
                    ) : modalSectionsLoading ? (
                      <SelectLoadingItem label="Loading sections..." />
                    ) : modalSections.length > 0 ? (
                      modalSections.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))
                    ) : (
                      <SelectEmptyItem label="No sections available" />
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Subject *</Label>
                <Select
                  value={form.subjectId}
                  onValueChange={(v) => setForm({ ...form, subjectId: v })}
                  disabled={!form.classId || subjectsLoading}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={subjectsLoading ? 'Loading subjects...' : 'Select subject'} />
                  </SelectTrigger>
                  <SelectContent>
                    {!form.classId ? (
                      <SelectEmptyItem label="Select a class first" />
                    ) : subjectsLoading ? (
                      <SelectLoadingItem label="Loading subjects..." />
                    ) : subjects.length > 0 ? (
                      subjects.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))
                    ) : (
                      <SelectEmptyItem label="No subjects available" />
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {!isTeacher && (
              <div className="grid gap-2">
                <Label>Teacher (Invigilator)</Label>
                <Select value={form.teacherId} onValueChange={(v) => setForm({ ...form, teacherId: v })} disabled={dropdownDataLoading}>
                  <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
                  <SelectContent>
                    {dropdownDataLoading ? (
                      <SelectLoadingItem label="Loading teachers..." />
                    ) : teachers.length > 0 ? (
                      teachers.map((t) => (
                        <SelectItem key={t.id} value={t.id}>{t.firstName} {t.lastName} ({t.employeeId})</SelectItem>
                      ))
                    ) : (
                      <SelectEmptyItem label="No teachers available" />
                    )}
                  </SelectContent>
                </Select>
              </div>
              )}
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {examStatuses.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Start Date</Label>
                <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>End Date</Label>
                <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="grid gap-2">
                <Label>Total Marks</Label>
                <Input type="number" value={form.totalMarks} onChange={(e) => setForm({ ...form, totalMarks: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Passing Marks</Label>
                <Input type="number" value={form.passingMarks} onChange={(e) => setForm({ ...form, passingMarks: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Duration (hrs)</Label>
                <Input type="number" step="0.5" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Weightage (%)</Label>
                <Input type="number" value={form.weightage} onChange={(e) => setForm({ ...form, weightage: e.target.value })} />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Syllabus / Topics Covered</Label>
              <Textarea
                value={form.syllabus}
                onChange={(e) => setForm({ ...form, syllabus: e.target.value })}
                placeholder="e.g. Chapters 1-5, All topics from Unit 1"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleSave} isLoading={saving} disabled={!form.name || !form.academicYearId || !form.classId || !form.sectionId || !form.subjectId}>
              {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProtectedRoute>
  )
}


