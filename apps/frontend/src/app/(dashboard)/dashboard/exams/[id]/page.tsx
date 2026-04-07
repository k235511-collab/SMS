'use client'

export const dynamic = 'force-dynamic'

import { useState, useCallback, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from '@/context/session-context'
import { ProtectedRoute, PermissionGate } from '@/components/auth'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { api } from '@/lib/api-client'
import { ArrowLeft, Pencil, UserPlus, Trash2, Save, Users, BarChart3, BookOpen, Clock, FileText } from 'lucide-react'
import { toast } from 'sonner'
import { PageLoader } from '@/components/ui/page-loader'
import { StudentSearch } from '@/components/student-search'
import { useAuth } from '@/context/auth-context'
import ExamPaperTab from '@/components/exams/ExamPaperTab'

interface Exam {
  id: string
  name: string
  type: string
  status: string
  startDate?: string
  endDate?: string
  totalMarks: number
  passingMarks: number
  duration?: number
  weightage?: number
  syllabus?: string
  class?: { id: string; name: string; code: string }
  section?: { id: string; name: string }
  subject?: { id: string; name: string; code: string }
  examTeachers?: ExamTeacher[]
  examResults?: ExamResult[]
}

interface ExamTeacher {
  id: string
  role: string
  teacher: { id: string; firstName: string; lastName: string; employeeId: string }
}

interface ExamResult {
  id: string
  marksObtained: number
  grade?: string
  isAbsent: boolean
  isPassed: boolean
  percentage: number
  student: { id: string; rollNumber: string; firstName: string; lastName: string }
}

interface Student {
  id: string
  rollNumber: string
  firstName: string
  lastName: string
  result: ExamResult | null
  hasResult: boolean
}

interface Teacher {
  id: string
  firstName: string
  lastName: string
  employeeId: string
}

interface Analytics {
  totalStudents: number
  passedStudents: number
  failedStudents: number
  absentStudents: number
  averageMarks: number
  highestMarks: number
  lowestMarks: number
  passRate: number
}

interface GradingScale {
  id: string
  name: string
  minPercent: number
  maxPercent: number
  gpa: number | null
}

const examStatuses = ['DRAFT', 'SCHEDULED', 'ONGOING', 'COMPLETED', 'CANCELLED']

const statusColors: Record<string, "secondary" | "default" | "success" | "destructive"> = {
  DRAFT: 'secondary',
  SCHEDULED: 'default',
  ONGOING: 'default',
  COMPLETED: 'success',
  CANCELLED: 'destructive',
}

export default function ExamDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { selectedCampus } = useSession()
  const { hasPermission, user } = useAuth()
  const examId = params.id as string

  const [exam, setExam] = useState<Exam | null>(null)
  const [students, setStudents] = useState<Student[]>([])
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [gradingScales, setGradingScales] = useState<GradingScale[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [statusDialogOpen, setStatusDialogOpen] = useState(false)
  const [teacherDialogOpen, setTeacherDialogOpen] = useState(false)
  const [newStatus, setNewStatus] = useState('')
  const [selectedTeacherId, setSelectedTeacherId] = useState('')
  const [selectedTeacherRole, setSelectedTeacherRole] = useState('INVIGILATOR')

  // Result editing state
  const [editedResults, setEditedResults] = useState<Record<string, { marksObtained: string; isAbsent: boolean; remarks: string }>>({})
  const [resultsSearch, setResultsSearch] = useState('')

  const fetchExam = useCallback(async () => {
    setLoading(true)
    const res = await api.get<Exam>(`/exams/${examId}`)
    if (res.success && res.data) {
      setExam(res.data)
      setNewStatus(res.data.status || 'DRAFT')
    }
    setLoading(false)
  }, [examId])

  const fetchStudents = useCallback(async () => {
    const res = await api.get<Student[]>(`/exams/${examId}/students`)
    if (res.success && res.data) {
      setStudents(res.data)
    }
  }, [examId])

  const fetchAnalytics = useCallback(async () => {
    const res = await api.get<Analytics>(`/exams/${examId}/analytics`)
    if (res.success && res.data) {
      setAnalytics(res.data)
    }
  }, [examId])

  const fetchTeachers = useCallback(async () => {
    const res = await api.get<{ data: Teacher[] }>('/teachers', { params: { pageSize: 100 } })
    if (res.success && res.data) {
      setTeachers(res.data.data || [])
    }
  }, [selectedCampus?.id])

  const fetchGradingScales = useCallback(async () => {
    const res = await api.get<GradingScale[]>('/exams/grading-scales')
    if (res.success && res.data) {
      setGradingScales(res.data)
    }
  }, [])

  // Filter out already assigned teachers
  const availableTeachers = useMemo(() => teachers.filter(
    t => !exam?.examTeachers?.some(et => et.teacher.id === t.id)
  ), [teachers, exam?.examTeachers])

  useEffect(() => {
    fetchExam()
    fetchStudents()
    fetchAnalytics()
    fetchTeachers()
    fetchGradingScales()
  }, [fetchExam, fetchStudents, fetchAnalytics, fetchTeachers, fetchGradingScales])

  const updateStatus = async () => {
    setSaving(true)
    const res = await api.patch(`/exams/${examId}/status`, { status: newStatus })
    if (res.success) {
      toast.success('Status updated')
      setStatusDialogOpen(false)
      fetchExam()
    } else {
      toast.error(res.message || 'Failed')
    }
    setSaving(false)
  }

  const assignTeacher = async () => {
    if (!selectedTeacherId) {
      toast.error('Please select a teacher')
      return
    }
    setSaving(true)
    const res = await api.post(`/exams/${examId}/teachers`, {
      teacherId: selectedTeacherId,
      role: selectedTeacherRole,
    })
    if (res.success) {
      toast.success('Teacher assigned')
      setTeacherDialogOpen(false)
      setSelectedTeacherId('')
      fetchExam()
    } else {
      toast.error(res.message || 'Failed')
    }
    setSaving(false)
  }

  const removeTeacher = async (teacherId: string) => {
    const res = await api.delete(`/exams/${examId}/teachers/${teacherId}`)
    if (res.success) {
      toast.success('Teacher removed')
      fetchExam()
    } else {
      toast.error(res.message || 'Failed')
    }
  }

  const saveResults = async () => {
    const resultsToSave = Object.entries(editedResults).map(([studentId, data]) => ({
      studentId,
      marksObtained: Number(data.marksObtained) || 0,
      isAbsent: data.isAbsent,
      remarks: data.remarks,
    }))

    if (resultsToSave.length === 0) {
      toast.error('No changes to save')
      return
    }

    setSaving(true)
    // Save each result individually
    for (const result of resultsToSave) {
      await api.post('/exams/results', {
        examId,
        subjectId: exam?.subject?.id,
        ...result,
      })
    }
    toast.success('Results saved')
    setEditedResults({})
    fetchStudents()
    fetchAnalytics()
    setSaving(false)
  }

  const updateEditedResult = useCallback((studentId: string, field: string, value: string | boolean) => {
    setEditedResults(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        marksObtained: prev[studentId]?.marksObtained ?? students.find(s => s.id === studentId)?.result?.marksObtained?.toString() ?? '0',
        isAbsent: prev[studentId]?.isAbsent ?? students.find(s => s.id === studentId)?.result?.isAbsent ?? false,
        remarks: prev[studentId]?.remarks ?? students.find(s => s.id === studentId)?.result?.grade ?? '',
        [field]: value,
      },
    }))
  }, [students])

  // Merge edited results into student data for stable table rendering and apply search
  const tableData = useMemo(() => {
    const query = resultsSearch.toLowerCase()
    return students
      .filter(s =>
        s.firstName.toLowerCase().includes(query) ||
        s.lastName.toLowerCase().includes(query) ||
        s.rollNumber.toLowerCase().includes(query)
      )
      .map(student => ({
        ...student,
        edited: editedResults[student.id],
      }))
  }, [students, editedResults, resultsSearch])

  const studentColumns = useMemo<ColumnDef<any, unknown>[]>(() => [
    { accessorKey: 'rollNumber', header: 'Roll No' },
    {
      accessorKey: 'firstName',
      header: 'Name',
      cell: ({ row }) => `${row.original.firstName} ${row.original.lastName}`,
    },
    {
      id: 'marksObtained',
      header: 'Marks',
      cell: ({ row }) => {
        const student = row.original
        const edited = student.edited
        const result = student.result
        return (
          <Input
            type="number"
            className="w-24"
            value={edited?.marksObtained ?? result?.marksObtained ?? ''}
            onChange={(e) => updateEditedResult(student.id, 'marksObtained', e.target.value)}
            disabled={edited?.isAbsent}
          />
        )
      },
    },
    {
      id: 'grade',
      header: 'Grade',
      cell: ({ row }) => {
        const student = row.original
        const isAbsent = student.edited?.isAbsent ?? student.result?.isAbsent ?? false

        if (isAbsent) return '—'

        const marksStr = student.edited?.marksObtained ?? student.result?.marksObtained?.toString()
        if (!marksStr || !exam?.totalMarks) return '—'

        const marks = Number(marksStr)
        const percentage = (marks / exam.totalMarks) * 100

        const matchedScale = gradingScales.find(
          scale => percentage >= scale.minPercent && percentage <= scale.maxPercent
        )

        const displayGrade = matchedScale?.name || '—'

        return displayGrade !== '—' ? <Badge variant="outline" className="font-bold">{displayGrade}</Badge> : '—'
      },
    },
    {
      id: 'isAbsent',
      header: 'Absent',
      cell: ({ row }) => {
        const student = row.original
        const isAbsent = student.edited?.isAbsent ?? student.result?.isAbsent ?? false
        return (
          <input
            type="checkbox"
            checked={isAbsent}
            onChange={(e) => updateEditedResult(student.id, 'isAbsent', e.target.checked)}
            className="h-4 w-4"
          />
        )
      },
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const student = row.original
        const result = student.result
        if (!result) return <Badge variant="secondary">No Result</Badge>
        if (result.isAbsent) return <Badge variant="outline">Absent</Badge>
        return (
          <Badge variant={result.isPassed ? 'default' : 'destructive'}>
            {result.isPassed ? 'Pass' : 'Fail'}
          </Badge>
        )
      },
    },
    {
      id: 'percentage',
      header: '%',
      cell: ({ row }) => {
        const result = row.original.result
        if (!result || result.isAbsent) return '—'
        return `${result.percentage?.toFixed(1)}%`
      },
    },
  ], [updateEditedResult])

  if (loading) {
    return (
      <ProtectedRoute permission="exams:read">
        <PageLoader message="Loading exam details..." />
      </ProtectedRoute>
    )
  }

  if (!exam) {
    return (
      <ProtectedRoute permission="exams:read">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Exam not found</div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute permission="exams:read">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.back()} aria-label="Go back">
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{exam.name}</h1>
              <p className="text-sm text-muted-foreground">
                {exam.class?.name} - {exam.section?.name} | {exam.subject?.name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={statusColors[exam.status] || 'secondary'} className="text-sm">
              {exam.status}
            </Badge>
            <PermissionGate permission="exams:update">
              <Button variant="outline" onClick={() => setStatusDialogOpen(true)}>
                <Pencil className="mr-2 h-4 w-4" /> Change Status
              </Button>
            </PermissionGate>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="teachers">Teachers</TabsTrigger>
            <TabsTrigger value="students">Students & Results</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
            <TabsTrigger value="paper" className="gap-1.5">
              <FileText size={14} /> Exam Paper
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Marks</CardTitle>
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardBody>
                  <div className="text-2xl font-bold">{exam.totalMarks}</div>
                  <p className="text-xs text-muted-foreground">Passing: {exam.passingMarks}</p>
                </CardBody>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Duration</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardBody>
                  <div className="text-2xl font-bold">{exam.duration || '—'} hrs</div>
                </CardBody>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Weightage</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardBody>
                  <div className="text-2xl font-bold">{exam.weightage || '—'}%</div>
                </CardBody>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Results Entered</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardBody>
                  <div className="text-2xl font-bold">
                    {students.filter(s => s.hasResult).length} / {students.length}
                  </div>
                </CardBody>
              </Card>
            </div>

            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Exam Details</CardTitle>
              </CardHeader>
              <CardBody className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <Label className="text-muted-foreground">Type</Label>
                  <p className="font-medium">{exam.type?.replace('_', ' ')}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Start Date</Label>
                  <p className="font-medium">{exam.startDate ? new Date(exam.startDate).toLocaleDateString() : '—'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">End Date</Label>
                  <p className="font-medium">{exam.endDate ? new Date(exam.endDate).toLocaleDateString() : '—'}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Subject</Label>
                  <p className="font-medium">{exam.subject?.name}</p>
                </div>
              </CardBody>
            </Card>

            {exam.syllabus && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle>Syllabus / Topics Covered</CardTitle>
                </CardHeader>
                <CardBody>
                  <p className="whitespace-pre-wrap">{exam.syllabus}</p>
                </CardBody>
              </Card>
            )}
          </TabsContent>

          {/* Teachers Tab */}
          <TabsContent value="teachers">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Assigned Teachers</CardTitle>
                <PermissionGate permission="exams:update">
                  <Button onClick={() => setTeacherDialogOpen(true)}>
                    <UserPlus className="mr-2 h-4 w-4" /> Assign Teacher
                  </Button>
                </PermissionGate>
              </CardHeader>
              <CardBody>
                {exam.examTeachers && exam.examTeachers.length > 0 ? (
                  <div className="space-y-2">
                    {exam.examTeachers.map((et) => (
                      <div key={et.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{et.teacher.firstName} {et.teacher.lastName}</p>
                          <p className="text-sm text-muted-foreground">{et.teacher.employeeId}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{et.role}</Badge>
                          <PermissionGate permission="exams:update">
                            <Button variant="ghost" size="icon" onClick={() => removeTeacher(et.teacher.id)} aria-label="Remove teacher">
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </PermissionGate>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-8">No teachers assigned yet</p>
                )}
              </CardBody>
            </Card>
          </TabsContent>

          {/* Students Tab */}
          <TabsContent value="students">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Student Results</CardTitle>
                <PermissionGate permission="exams:update">
                  <Button onClick={saveResults} disabled={saving || Object.keys(editedResults).length === 0}>
                    <Save className="mr-2 h-4 w-4" /> Save Changes
                  </Button>
                </PermissionGate>
              </CardHeader>
              <CardBody>
                <DataTable
                  columns={studentColumns}
                  data={tableData}
                  emptyMessage="No students found in this class-section"
                  toolbar={
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-full max-w-md">
                        <StudentSearch
                          placeholder="Search students in this class..."
                          defaultValue={resultsSearch}
                          mode="filter"
                          localStudents={students}
                          hideDropdown={true}
                          onQueryChange={setResultsSearch}
                          onSelect={(s) => {
                            if (s) {
                              setResultsSearch(s.firstName)
                            } else {
                              setResultsSearch('')
                            }
                          }}
                        />
                      </div>
                    </div>
                  }
                />
              </CardBody>
            </Card>
          </TabsContent>

          {/* Analytics Tab */}
          <TabsContent value="analytics">
            {analytics ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                  </CardHeader>
                  <CardBody>
                    <div className="text-2xl font-bold">{analytics.totalStudents}</div>
                  </CardBody>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Passed</CardTitle>
                  </CardHeader>
                  <CardBody>
                    <div className="text-2xl font-bold text-green-600">{analytics.passedStudents}</div>
                  </CardBody>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Failed</CardTitle>
                  </CardHeader>
                  <CardBody>
                    <div className="text-2xl font-bold text-red-600">{analytics.failedStudents}</div>
                  </CardBody>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Absent</CardTitle>
                  </CardHeader>
                  <CardBody>
                    <div className="text-2xl font-bold text-yellow-600">{analytics.absentStudents}</div>
                  </CardBody>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Pass Rate</CardTitle>
                  </CardHeader>
                  <CardBody>
                    <div className="text-2xl font-bold">{analytics.passRate.toFixed(1)}%</div>
                  </CardBody>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Average Marks</CardTitle>
                  </CardHeader>
                  <CardBody>
                    <div className="text-2xl font-bold">{analytics.averageMarks.toFixed(1)}</div>
                  </CardBody>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Highest Marks</CardTitle>
                  </CardHeader>
                  <CardBody>
                    <div className="text-2xl font-bold">{analytics.highestMarks}</div>
                  </CardBody>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium">Lowest Marks</CardTitle>
                  </CardHeader>
                  <CardBody>
                    <div className="text-2xl font-bold">{analytics.lowestMarks}</div>
                  </CardBody>
                </Card>
              </div>
            ) : (
              <p className="text-muted-foreground">No analytics available</p>
            )}
          </TabsContent>

          {/* Exam Paper Tab */}
          <TabsContent value="paper">
            <ExamPaperTab examId={examId} editable={hasPermission('exams:update')} defaultSchoolName={user?.schoolName} defaultSchoolLogo={user?.schoolLogo ?? undefined} />
          </TabsContent>
        </Tabs>

        {/* Status Dialog */}
        <Dialog open={statusDialogOpen} onOpenChange={setStatusDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Change Exam Status</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {examStatuses.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button onClick={updateStatus} disabled={saving}>{saving ? 'Saving...' : 'Update'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Assign Teacher Dialog */}
        <Dialog open={teacherDialogOpen} onOpenChange={setTeacherDialogOpen}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Assign Teacher</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Teacher</Label>
                <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId}>
                  <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
                  <SelectContent>
                    {availableTeachers.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.firstName} {t.lastName} ({t.employeeId})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Role</Label>
                <Select value={selectedTeacherRole} onValueChange={setSelectedTeacherRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INVIGILATOR">Invigilator</SelectItem>
                    <SelectItem value="SUPERVISOR">Supervisor</SelectItem>
                    <SelectItem value="EXAMINER">Examiner</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
              <Button onClick={assignTeacher} disabled={saving || !selectedTeacherId}>{saving ? 'Saving...' : 'Assign'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  )
}
