'use client'

import { useEffect, useMemo, useState } from 'react'
import { ProtectedRoute } from '@/components/auth'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { reportsService } from '@/services/analytics.service'
import { academicsService } from '@/services/academics.service'
import { useSession } from '@/context/session-context'
import { CalendarRange, ClipboardCheck, FileText, Loader2, Plus, Printer, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

type ClassOption = {
  id: string
  name: string
  code?: string
}

type SectionOption = {
  id: string
  name: string
}

type AttendanceReportResponse = {
  section: {
    id: string
    name: string
    class?: {
      id: string
      name: string
      code?: string
    }
  }
  range: {
    startDate: string
    endDate: string
  }
  overview: {
    totalStudents: number
    totalRecords: number
    present: number
    absent: number
    late: number
    excused: number
    halfDay: number
    attendanceRate: number
  }
  students: Array<{
    student: {
      id: string
      rollNumber: string
      firstName: string
      lastName: string
    }
    summary: {
      present: number
      absent: number
      late: number
      excused: number
      halfDay: number
      total: number
    }
    attendanceRate: number
  }>
  generatedAt: string
}

type TemplateOption = {
  id: string
  name: string
  description: string
  accentClass: string
}

type CustomSection = {
  id: string
  title: string
  content: string
}

const TEMPLATE_OPTIONS: TemplateOption[] = [
  {
    id: 'daily-ops',
    name: 'Daily Operations',
    description: 'Highlights students needing intervention based on attendance rate.',
    accentClass: 'border-primary-200 bg-primary-50/40',
  },
  {
    id: 'parent-meeting',
    name: 'Parent Meeting Brief',
    description: 'Balanced summary for communication with parents and guardians.',
    accentClass: 'border-success-500/30 bg-success-50/20',
  },
  {
    id: 'audit-ready',
    name: 'Audit Ready',
    description: 'Compact table-first format for records and compliance discussions.',
    accentClass: 'border-border bg-card',
  },
]

const STORAGE_KEY = 'attendance-report-builder.v1'

export default function AttendanceReportPage() {
  const { selectedYear } = useSession()

  const today = useMemo(() => new Date(), [])
  const defaultEndDate = useMemo(() => today.toISOString().slice(0, 10), [today])
  const defaultStartDate = useMemo(
    () => new Date(today.getTime() - (29 * 24 * 60 * 60 * 1000)).toISOString().slice(0, 10),
    [today],
  )

  const [classes, setClasses] = useState<ClassOption[]>([])
  const [sections, setSections] = useState<SectionOption[]>([])
  const [selectedClassId, setSelectedClassId] = useState('')
  const [selectedSectionId, setSelectedSectionId] = useState('')
  const [startDate, setStartDate] = useState(defaultStartDate)
  const [endDate, setEndDate] = useState(defaultEndDate)

  const [templateId, setTemplateId] = useState('daily-ops')
  const [customSections, setCustomSections] = useState<CustomSection[]>([
    { id: 'attendance-coordinator-note', title: 'Attendance Coordinator Note', content: '' },
  ])

  const [loadingClasses, setLoadingClasses] = useState(false)
  const [loadingSections, setLoadingSections] = useState(false)
  const [loadingReport, setLoadingReport] = useState(false)
  const [reportData, setReportData] = useState<AttendanceReportResponse | null>(null)

  useEffect(() => {
    const loadClasses = async () => {
      setLoadingClasses(true)
      try {
        const res = await academicsService.getClasses()
        if (!res.success || !res.data) {
          toast.error(res.message || 'Unable to load classes')
          return
        }

        const list = Array.isArray(res.data) ? res.data : (res.data?.data || [])
        const options: ClassOption[] = list.map((item: any) => ({
          id: item.id,
          name: item.name,
          code: item.code,
        }))

        setClasses(options)
      } finally {
        setLoadingClasses(false)
      }
    }

    loadClasses()
  }, [])

  useEffect(() => {
    if (!selectedClassId && classes.length > 0) {
      setSelectedClassId(classes[0].id)
    }
  }, [classes, selectedClassId])

  useEffect(() => {
    if (!selectedClassId) {
      setSections([])
      setSelectedSectionId('')
      return
    }

    const loadSections = async () => {
      setLoadingSections(true)
      try {
        const res = await academicsService.getSectionsByClass(selectedClassId)
        if (!res.success || !res.data) {
          setSections([])
          setSelectedSectionId('')
          toast.error(res.message || 'Unable to load sections')
          return
        }

        const list = Array.isArray(res.data) ? res.data : (res.data?.data || [])
        const options: SectionOption[] = list.map((item: any) => ({
          id: item.id,
          name: item.name,
        }))

        setSections(options)
        setSelectedSectionId((prev) => {
          if (prev && options.some((item) => item.id === prev)) return prev
          return options[0]?.id || ''
        })
      } finally {
        setLoadingSections(false)
      }
    }

    loadSections()
  }, [selectedClassId])

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return

      const parsed = JSON.parse(raw)
      if (parsed?.templateId && TEMPLATE_OPTIONS.some((item) => item.id === parsed.templateId)) {
        setTemplateId(parsed.templateId)
      }

      if (Array.isArray(parsed?.customSections)) {
        setCustomSections(
          parsed.customSections
            .slice(0, 8)
            .map((item: any, index: number) => ({
              id: item?.id || `custom-${index + 1}`,
              title: item?.title || 'Custom Section',
              content: item?.content || '',
            })),
        )
      }
    } catch {
      // Ignore invalid local draft config.
    }
  }, [])

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        templateId,
        customSections,
      }),
    )
  }, [templateId, customSections])

  const activeTemplate = useMemo(
    () => TEMPLATE_OPTIONS.find((item) => item.id === templateId) || TEMPLATE_OPTIONS[0],
    [templateId],
  )

  const attendanceRows = useMemo(() => {
    if (!reportData) return []
    return [...reportData.students].sort((a, b) => a.attendanceRate - b.attendanceRate)
  }, [reportData])

  const statusBars = useMemo(() => {
    if (!reportData) return []

    const rows = [
      { key: 'present', label: 'Present', count: reportData.overview.present, barClass: 'bg-success-500/80' },
      { key: 'absent', label: 'Absent', count: reportData.overview.absent, barClass: 'bg-destructive/80' },
      { key: 'late', label: 'Late', count: reportData.overview.late, barClass: 'bg-warning-500/80' },
      { key: 'excused', label: 'Excused', count: reportData.overview.excused, barClass: 'bg-primary-500/80' },
      { key: 'halfDay', label: 'Half Day', count: reportData.overview.halfDay, barClass: 'bg-secondary-500/80' },
    ]

    const max = Math.max(...rows.map((row) => row.count), 1)
    return rows.map((row) => ({ ...row, width: (row.count / max) * 100 }))
  }, [reportData])

  const addCustomSection = () => {
    setCustomSections((prev) => [
      ...prev,
      {
        id: `custom-${Date.now()}`,
        title: 'Custom Section',
        content: '',
      },
    ])
  }

  const updateCustomSection = (id: string, patch: Partial<CustomSection>) => {
    setCustomSections((prev) =>
      prev.map((section) => (section.id === id ? { ...section, ...patch } : section)),
    )
  }

  const removeCustomSection = (id: string) => {
    setCustomSections((prev) => prev.filter((section) => section.id !== id))
  }

  const generateReport = async () => {
    if (!selectedSectionId) {
      toast.error('Please select a section first')
      return
    }

    if (!startDate || !endDate || startDate > endDate) {
      toast.error('Please choose a valid date range')
      return
    }

    setLoadingReport(true)
    try {
      const res = await reportsService.generateAttendanceReport(selectedSectionId, startDate, endDate)
      if (!res.success || !res.data) {
        toast.error(res.message || 'Unable to generate attendance report')
        return
      }

      setReportData(res.data as AttendanceReportResponse)
      toast.success('Attendance report loaded')
    } finally {
      setLoadingReport(false)
    }
  }

  return (
    <ProtectedRoute permission="reports:read">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Attendance Report</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Build section-wise attendance reports with date range filters and intervention notes.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{selectedYear?.name || 'Academic Year'}</Badge>
            <Button variant="outline" onClick={() => window.print()} disabled={!reportData}>
              <Printer className="mr-2 h-4 w-4" /> Print / Save PDF
            </Button>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Filters</CardTitle>
                <CardDescription>Choose class, section, and date range before generating report.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label>Class</Label>
                  <Select value={selectedClassId} onValueChange={setSelectedClassId} disabled={loadingClasses || classes.length === 0}>
                    <SelectTrigger>
                      <SelectValue placeholder={loadingClasses ? 'Loading classes...' : 'Select class'} />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}{item.code ? ` (${item.code})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Section</Label>
                  <Select
                    value={selectedSectionId}
                    onValueChange={setSelectedSectionId}
                    disabled={loadingSections || sections.length === 0}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={loadingSections ? 'Loading sections...' : 'Select section'} />
                    </SelectTrigger>
                    <SelectContent>
                      {sections.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Start Date</Label>
                    <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>End Date</Label>
                    <Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
                  </div>
                </div>

                <Button
                  className="w-full"
                  onClick={generateReport}
                  disabled={!selectedSectionId || !startDate || !endDate || loadingReport}
                >
                  {loadingReport ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                  Generate Attendance Report
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Template and Notes</CardTitle>
                <CardDescription>Customize attendance report presentation and optional notes.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Template</Label>
                  <Select value={templateId} onValueChange={setTemplateId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select template" />
                    </SelectTrigger>
                    <SelectContent>
                      {TEMPLATE_OPTIONS.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">{activeTemplate.description}</p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Custom Sections</Label>
                    <Button variant="outline" size="sm" onClick={addCustomSection}>
                      <Plus className="mr-1 h-3.5 w-3.5" /> Add
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {customSections.map((section) => (
                      <div key={section.id} className="space-y-2 rounded-lg border p-3">
                        <div className="flex items-center gap-2">
                          <Input
                            value={section.title}
                            onChange={(event) => updateCustomSection(section.id, { title: event.target.value })}
                            placeholder="Section title"
                          />
                          <Button variant="ghost" size="icon" onClick={() => removeCustomSection(section.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <Textarea
                          value={section.content}
                          onChange={(event) => updateCustomSection(section.id, { content: event.target.value })}
                          placeholder="Section content"
                          rows={3}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className={activeTemplate.accentClass}>
            {!reportData ? (
              <CardContent className="p-10 text-center text-muted-foreground">
                Generate a report to preview attendance metrics and student-wise breakdown.
              </CardContent>
            ) : (
              <div className="space-y-6 p-6">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">
                      {reportData.section.class?.name || 'Class'} - {reportData.section.name}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Code: {reportData.section.class?.code || '-'}
                    </p>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {activeTemplate.name}
                  </Badge>
                </div>

                <div className="grid gap-3 sm:grid-cols-4">
                  <div className="rounded-lg border bg-background p-3 text-center">
                    <p className="text-xs text-muted-foreground">Students</p>
                    <p className="text-lg font-semibold">{reportData.overview.totalStudents}</p>
                  </div>
                  <div className="rounded-lg border bg-background p-3 text-center">
                    <p className="text-xs text-muted-foreground">Records</p>
                    <p className="text-lg font-semibold">{reportData.overview.totalRecords}</p>
                  </div>
                  <div className="rounded-lg border bg-background p-3 text-center">
                    <p className="text-xs text-muted-foreground">Attendance Rate</p>
                    <p className="text-lg font-semibold">{reportData.overview.attendanceRate}%</p>
                  </div>
                  <div className="rounded-lg border bg-background p-3 text-center">
                    <p className="text-xs text-muted-foreground">Range</p>
                    <p className="text-sm font-semibold">
                      {new Date(reportData.range.startDate).toLocaleDateString()} - {new Date(reportData.range.endDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-base font-semibold text-foreground">Status Distribution</h3>
                  <div className="space-y-2 rounded-lg border bg-background p-4">
                    {statusBars.map((row) => (
                      <div key={row.key} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-medium text-foreground">{row.label}</span>
                          <span className="text-muted-foreground">{row.count}</span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-muted/60">
                          <div className={`h-full ${row.barClass}`} style={{ width: `${row.width}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-base font-semibold text-foreground">Student Attendance Table</h3>
                  {attendanceRows.length === 0 ? (
                    <div className="rounded-lg border bg-background p-4 text-sm text-muted-foreground">
                      No attendance records available for selected range.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border bg-background">
                      <table className="min-w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium">Roll #</th>
                            <th className="px-3 py-2 text-left font-medium">Student</th>
                            <th className="px-3 py-2 text-left font-medium">Present</th>
                            <th className="px-3 py-2 text-left font-medium">Absent</th>
                            <th className="px-3 py-2 text-left font-medium">Late</th>
                            <th className="px-3 py-2 text-left font-medium">Rate</th>
                          </tr>
                        </thead>
                        <tbody>
                          {attendanceRows.map((row) => (
                            <tr key={row.student.id} className="border-t">
                              <td className="px-3 py-2">{row.student.rollNumber}</td>
                              <td className="px-3 py-2">{row.student.firstName} {row.student.lastName}</td>
                              <td className="px-3 py-2">{row.summary.present}</td>
                              <td className="px-3 py-2">{row.summary.absent}</td>
                              <td className="px-3 py-2">{row.summary.late}</td>
                              <td className="px-3 py-2">{row.attendanceRate}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  {customSections.map((section) => (
                    <div key={section.id} className="rounded-lg border bg-background p-4">
                      <h4 className="font-medium text-foreground">{section.title || 'Custom Section'}</h4>
                      <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">
                        {section.content || 'No content provided.'}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="text-xs text-muted-foreground">
                  Generated on {new Date(reportData.generatedAt).toLocaleString()}.
                </div>
              </div>
            )}
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarRange className="h-4 w-4" /> Reporting Window
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Selected Class</p>
                <p className="font-medium">{classes.find((item) => item.id === selectedClassId)?.name || '-'}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Selected Section</p>
                <p className="font-medium">{sections.find((item) => item.id === selectedSectionId)?.name || '-'}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">From</p>
                <p className="font-medium">{startDate || '-'}</p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground">To</p>
                <p className="font-medium">{endDate || '-'}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  )
}
