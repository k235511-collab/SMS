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
import { escapePrintHtml, multilineToPrintHtml, printFormalReport } from '@/lib/report-print'
import { FileText, GraduationCap, Loader2, Plus, Printer, Trash2, Users } from 'lucide-react'
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

type ClassReportResponse = {
  class?: {
    id: string
    name: string
    code?: string
  }
  scope?: 'CLASS' | 'SECTION'
  section?: {
    id: string
    name: string
  } | null
  totalStudents: number
  sectionBreakdown: Array<{
    id: string
    name: string
    totalStudents: number
  }>
  attendanceBreakdown: Array<{
    status: string
    count: number
  }>
  attendanceRate: number
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
    id: 'institutional',
    name: 'Institutional View',
    description: 'Executive summary first, then class and section distributions.',
    accentClass: 'border-primary-200 bg-primary-50/40',
  },
  {
    id: 'operations',
    name: 'Operations View',
    description: 'Attendance-heavy layout for daily class management follow-up.',
    accentClass: 'border-success-500/30 bg-success-50/20',
  },
  {
    id: 'compact',
    name: 'Compact Print View',
    description: 'Minimal spacing and visual weight for quick print handouts.',
    accentClass: 'border-border bg-card',
  },
]

const STATUS_LABELS: Record<string, string> = {
  PRESENT: 'Present',
  ABSENT: 'Absent',
  LATE: 'Late',
  EXCUSED: 'Excused',
  HALF_DAY: 'Half Day',
}

const STATUS_BAR_CLASSES: Record<string, string> = {
  PRESENT: 'bg-success-500/80',
  ABSENT: 'bg-destructive/80',
  LATE: 'bg-warning-500/80',
  EXCUSED: 'bg-primary-500/70',
  HALF_DAY: 'bg-secondary-500/80',
}

const STORAGE_KEY = 'class-report-builder.v1'

export default function ClassReportPage() {
  const { selectedYear } = useSession()

  const [classes, setClasses] = useState<ClassOption[]>([])
  const [sections, setSections] = useState<SectionOption[]>([])
  const [selectedClassId, setSelectedClassId] = useState('')
  const [selectedSectionId, setSelectedSectionId] = useState('')

  const [templateId, setTemplateId] = useState('institutional')
  const [customSections, setCustomSections] = useState<CustomSection[]>([
    { id: 'class-teacher-note', title: 'Class Teacher Note', content: '' },
  ])

  const [loadingClasses, setLoadingClasses] = useState(false)
  const [loadingSections, setLoadingSections] = useState(false)
  const [loadingReport, setLoadingReport] = useState(false)
  const [reportData, setReportData] = useState<ClassReportResponse | null>(null)

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
    setReportData(null)
  }, [selectedClassId, selectedSectionId])

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

  const attendanceTotalRecords = useMemo(
    () => reportData?.attendanceBreakdown.reduce((sum, item) => sum + item.count, 0) || 0,
    [reportData],
  )

  const attendanceMaxCount = useMemo(() => {
    if (!reportData?.attendanceBreakdown.length) return 1
    return Math.max(...reportData.attendanceBreakdown.map((item) => item.count), 1)
  }, [reportData])

  const selectedClass = useMemo(
    () => classes.find((item) => item.id === selectedClassId) || null,
    [classes, selectedClassId],
  )

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
    if (!selectedClassId) {
      toast.error('Please select a class first')
      return
    }

    if (!selectedSectionId) {
      toast.error('Please select a section first')
      return
    }

    setLoadingReport(true)
    try {
      const res = await reportsService.generateClassReport(selectedClassId, selectedSectionId)
      if (!res.success || !res.data) {
        toast.error(res.message || 'Unable to generate class report')
        return
      }

      setReportData(res.data as ClassReportResponse)
      toast.success('Section-wise class report loaded')
    } finally {
      setLoadingReport(false)
    }
  }

  const handlePrintReport = () => {
    if (!reportData) {
      toast.error('Generate the report first to print')
      return
    }

    const className = reportData.class?.name || selectedClass?.name || 'Selected Class'
    const sectionName = reportData.section?.name || sections.find((item) => item.id === selectedSectionId)?.name || '-'
    const generatedAt = new Date(reportData.generatedAt).toLocaleString()

    const attendanceTableHtml = reportData.attendanceBreakdown.length
      ? `<table class="report-table">
          <thead>
            <tr>
              <th>Status</th>
              <th>Count</th>
            </tr>
          </thead>
          <tbody>
            ${reportData.attendanceBreakdown
              .map((item) => `<tr>
                <td>${escapePrintHtml(STATUS_LABELS[item.status] || item.status)}</td>
                <td>${escapePrintHtml(item.count)}</td>
              </tr>`)
              .join('')}
          </tbody>
        </table>`
      : '<div class="empty">No attendance records available for this section.</div>'

    const sectionSnapshotHtml = reportData.sectionBreakdown.length
      ? `<table class="report-table">
          <thead>
            <tr>
              <th>Section</th>
              <th>Students</th>
            </tr>
          </thead>
          <tbody>
            ${reportData.sectionBreakdown
              .map((row) => `<tr>
                <td>${escapePrintHtml(row.name)}</td>
                <td>${escapePrintHtml(row.totalStudents)}</td>
              </tr>`)
              .join('')}
          </tbody>
        </table>`
      : '<div class="empty">No section snapshot data found.</div>'

    const notesHtml = customSections
      .map((section) => `<article class="note-block">
          <h4 class="note-title">${escapePrintHtml(section.title || 'Custom Section')}</h4>
          <p class="note-content">${multilineToPrintHtml(section.content || 'No content provided.')}</p>
        </article>`)
      .join('')

    const printed = printFormalReport({
      title: 'Class Report',
      subtitle: `${selectedYear?.name || 'Academic Year'} | Template: ${activeTemplate.name}`,
      contentHtml: `
        <section class="section">
          <div class="kpi-grid">
            <div class="kpi-card">
              <p class="kpi-label">Class</p>
              <p class="kpi-value">${escapePrintHtml(className)}</p>
            </div>
            <div class="kpi-card">
              <p class="kpi-label">Section</p>
              <p class="kpi-value">${escapePrintHtml(sectionName)}</p>
            </div>
            <div class="kpi-card">
              <p class="kpi-label">Students</p>
              <p class="kpi-value">${escapePrintHtml(reportData.totalStudents)}</p>
            </div>
            <div class="kpi-card">
              <p class="kpi-label">Attendance Rate</p>
              <p class="kpi-value">${escapePrintHtml(reportData.attendanceRate)}%</p>
            </div>
          </div>
        </section>

        <section class="section">
          <h2 class="section-title">Attendance Breakdown</h2>
          ${attendanceTableHtml}
        </section>

        <section class="section">
          <h2 class="section-title">Section Snapshot</h2>
          ${sectionSnapshotHtml}
        </section>

        <section class="section">
          <h2 class="section-title">Custom Notes</h2>
          ${notesHtml || '<div class="empty">No custom notes added.</div>'}
        </section>

        <div class="footer-meta">Generated on ${escapePrintHtml(generatedAt)}</div>
      `,
    })

    if (!printed) {
      toast.error('Please allow popups to print report')
    }
  }

  return (
    <ProtectedRoute permission="reports:read">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Class Report</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Build section-wise class reports with attendance insights from live records.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline">{selectedYear?.name || 'Academic Year'}</Badge>
            <Button variant="outline" onClick={handlePrintReport} disabled={!reportData}>
              <Printer className="mr-2 h-4 w-4" /> Print / Save PDF
            </Button>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Class Selection</CardTitle>
                <CardDescription>Select class and generate report snapshot from live records.</CardDescription>
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
                    disabled={!selectedClassId || loadingSections || sections.length === 0}
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

                <Button className="w-full" onClick={generateReport} disabled={!selectedClassId || !selectedSectionId || loadingReport}>
                  {loadingReport ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileText className="mr-2 h-4 w-4" />}
                  Generate Section Report
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Template and Notes</CardTitle>
                <CardDescription>Choose report style and keep editable notes for print output.</CardDescription>
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
                Generate a section-wise class report to preview attendance and student totals.
              </CardContent>
            ) : (
              <div className="space-y-6 p-6">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b pb-4">
                  <div>
                    <h2 className="text-xl font-semibold text-foreground">
                      {reportData.class?.name || selectedClass?.name || 'Selected Class'}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Section: {reportData.section?.name || sections.find((item) => item.id === selectedSectionId)?.name || '-'}
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Code: {reportData.class?.code || selectedClass?.code || '-'}
                    </p>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {activeTemplate.name}
                  </Badge>
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border bg-background p-3 text-center">
                    <p className="text-xs text-muted-foreground">Students in Section</p>
                    <p className="text-lg font-semibold">{reportData.totalStudents}</p>
                  </div>
                  <div className="rounded-lg border bg-background p-3 text-center">
                    <p className="text-xs text-muted-foreground">Attendance Records</p>
                    <p className="text-lg font-semibold">{attendanceTotalRecords}</p>
                  </div>
                  <div className="rounded-lg border bg-background p-3 text-center">
                    <p className="text-xs text-muted-foreground">Attendance Rate</p>
                    <p className="text-lg font-semibold">{reportData.attendanceRate}%</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-base font-semibold text-foreground">Attendance Breakdown</h3>
                  {reportData.attendanceBreakdown.length === 0 ? (
                    <div className="rounded-lg border bg-background p-4 text-sm text-muted-foreground">
                      No attendance records available for this class yet.
                    </div>
                  ) : (
                    <div className="space-y-2 rounded-lg border bg-background p-4">
                      {reportData.attendanceBreakdown.map((item) => (
                        <div key={item.status} className="space-y-1">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-foreground">{STATUS_LABELS[item.status] || item.status}</span>
                            <span className="text-muted-foreground">{item.count}</span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-muted/60">
                            <div
                              className={`h-full ${STATUS_BAR_CLASSES[item.status] || 'bg-primary/70'}`}
                              style={{ width: `${(item.count / attendanceMaxCount) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-3">
                  <h3 className="text-base font-semibold text-foreground">Section Snapshot</h3>
                  {reportData.sectionBreakdown.length === 0 ? (
                    <div className="rounded-lg border bg-background p-4 text-sm text-muted-foreground">
                      No active section data found for this selection.
                    </div>
                  ) : (
                    <div className="overflow-x-auto rounded-lg border bg-background">
                      <table className="min-w-full text-sm">
                        <thead className="bg-muted/50">
                          <tr>
                            <th className="px-3 py-2 text-left font-medium">Section</th>
                            <th className="px-3 py-2 text-left font-medium">Students</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.sectionBreakdown.map((row) => (
                            <tr key={row.id} className="border-t">
                              <td className="px-3 py-2">{row.name}</td>
                              <td className="px-3 py-2">{row.totalStudents}</td>
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
              <Users className="h-4 w-4" /> Report Context
            </CardTitle>
          </CardHeader>
          <CardContent>
            {reportData ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Class</p>
                  <p className="font-medium">{reportData.class?.name || '-'}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Code</p>
                  <p className="font-medium">{reportData.class?.code || '-'}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Sections</p>
                  <p className="font-medium">{reportData.sectionBreakdown.length}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Section</p>
                  <p className="font-medium">{reportData.section?.name || '-'}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Template</p>
                  <p className="font-medium">{activeTemplate.name}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Select class and section, then generate the report to see contextual details.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  )
}
