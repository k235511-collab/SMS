'use client'

import { Fragment, useEffect, useMemo, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

interface ExamSummary {
  id: string
  name: string
  totalMarks: number
  passingMarks: number
  class?: { id: string; name: string }
  section?: { id: string; name: string }
  subject?: { id: string; name: string }
  academicYear?: { id: string; name: string }
}

interface StudentSummary {
  id: string
  rollNumber: string
  firstName: string
  lastName: string
}

interface ResultSummary {
  id: string
  marksObtained: number
  percentage: number | null
  grade: string | null
  isAbsent: boolean
  isPassed: boolean | null
  subject?: { id: string; name: string }
}

export interface ExamStudentResultRow {
  exam: ExamSummary
  student: StudentSummary
  result: ResultSummary | null
}

export interface StudentExamDetailRow {
  id: string
  exam: {
    id: string
    name: string
    totalMarks: number
    passingMarks: number
    startDate?: string | null
    endDate?: string | null
    status?: string
  }
  subject?: {
    id: string
    name: string
    code?: string
  }
  marksObtained: number
  percentage: number | null
  grade: string | null
  isAbsent: boolean
  isPassed: boolean | null
}

interface ExamStudentResultsTableProps {
  data: ExamStudentResultRow[]
  isLoading?: boolean
  loadStudentDetails: (studentId: string) => Promise<StudentExamDetailRow[]>
  detailsCacheKey?: string
}

function DetailStatusBadge({ row }: { row: StudentExamDetailRow }) {
  if (row.isAbsent) return <Badge variant="outline">Absent</Badge>
  if (row.isPassed === null) return <Badge variant="secondary">Pending</Badge>
  return <Badge variant={row.isPassed ? 'success' : 'destructive'}>{row.isPassed ? 'Pass' : 'Fail'}</Badge>
}

export function ExamStudentResultsTable({
  data,
  isLoading = false,
  loadStudentDetails,
  detailsCacheKey = 'default',
}: ExamStudentResultsTableProps) {
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null)
  const [detailsByStudent, setDetailsByStudent] = useState<Record<string, StudentExamDetailRow[]>>({})
  const [loadingByStudent, setLoadingByStudent] = useState<Record<string, boolean>>({})

  useEffect(() => {
    setExpandedStudentId(null)
    setDetailsByStudent({})
    setLoadingByStudent({})
  }, [detailsCacheKey])

  const getScopedStudentKey = (studentId: string) => `${detailsCacheKey}::${studentId}`

  const groupedRows = useMemo(() => {
    const map = new Map<string, {
      student: StudentSummary
      className: string
      sectionName: string
      resultCount: number
    }>()

    for (const row of data) {
      const existing = map.get(row.student.id)
      if (existing) {
        existing.resultCount += row.result ? 1 : 0
      } else {
        map.set(row.student.id, {
          student: row.student,
          className: row.exam.class?.name || '—',
          sectionName: row.exam.section?.name || '—',
          resultCount: row.result ? 1 : 0,
        })
      }
    }

    return Array.from(map.values())
  }, [data])

  const toggleExpand = async (studentId: string) => {
    if (expandedStudentId === studentId) {
      setExpandedStudentId(null)
      return
    }

    setExpandedStudentId(studentId)
    const scopedKey = getScopedStudentKey(studentId)
    if (detailsByStudent[scopedKey]) return

    setLoadingByStudent((prev) => ({ ...prev, [scopedKey]: true }))
    try {
      const details = await loadStudentDetails(studentId)
      setDetailsByStudent((prev) => ({ ...prev, [scopedKey]: details }))
    } finally {
      setLoadingByStudent((prev) => ({ ...prev, [scopedKey]: false }))
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4 rounded-md border border-border bg-card p-4">
        <div className="flex gap-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-full" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (!groupedRows.length) {
    return (
      <div className="flex h-24 items-center justify-center rounded-md border border-border bg-card text-sm text-muted-foreground">
        No student results found for selected filters.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-md border border-border bg-background">
      <div className="overflow-x-auto">
        <table className="w-full caption-bottom text-sm">
          <thead className="[&_tr]:border-b">
            <tr className="border-b border-border bg-muted/30">
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Student</th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Roll #</th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Class</th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Section</th>
              <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">Results</th>
              <th className="h-12 w-14 px-4 text-right align-middle font-medium text-muted-foreground">&nbsp;</th>
            </tr>
          </thead>
          <tbody className="[&_tr:last-child]:border-0">
            {groupedRows.map((item) => {
              const studentId = item.student.id
              const scopedKey = getScopedStudentKey(studentId)
              const isExpanded = expandedStudentId === studentId
              const details = detailsByStudent[scopedKey] || []
              const isRowLoading = !!loadingByStudent[scopedKey]

              return (
                <Fragment key={studentId}>
                  <tr className="border-b border-border transition-colors hover:bg-muted/30">
                    <td className="px-4 py-3 align-middle font-semibold text-foreground">
                      {item.student.firstName} {item.student.lastName}
                    </td>
                    <td className="px-4 py-3 align-middle text-muted-foreground tabular-nums">{item.student.rollNumber}</td>
                    <td className="px-4 py-3 align-middle text-foreground">{item.className}</td>
                    <td className="px-4 py-3 align-middle text-foreground">{item.sectionName}</td>
                    <td className="px-4 py-3 align-middle">
                      <Badge variant="outline">{item.resultCount} record{item.resultCount === 1 ? '' : 's'}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right align-middle">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => toggleExpand(studentId)}
                        aria-label={isExpanded ? 'Collapse student details' : 'Expand student details'}
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </td>
                  </tr>

                  {isExpanded && (
                    <tr className="border-b border-border bg-muted/25">
                      <td colSpan={6} className="px-4 py-4">
                        {isRowLoading ? (
                          <div className="space-y-3 p-2 rounded-md border border-border bg-background">
                            {[1, 2].map(i => (
                              <Skeleton key={i} className="h-12 w-full" />
                            ))}
                          </div>
                        ) : details.length === 0 ? (
                          <div className="rounded-md border border-border bg-background px-4 py-6 text-center text-sm text-muted-foreground">
                            No exam records found for this student.
                          </div>
                        ) : (
                          <div className="rounded-lg border border-border bg-background p-3 sm:p-4">
                            <div className="mb-3 hidden grid-cols-6 gap-3 px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground md:grid">
                              <span>Subject</span>
                              <span>Exam</span>
                              <span>Marks</span>
                              <span>Percentage</span>
                              <span>Grade</span>
                              <span>Status</span>
                            </div>

                            <div className="space-y-2">
                              {details.map((row) => (
                                <div
                                  key={row.id}
                                  className="rounded-md border border-border bg-muted/15 px-3 py-3"
                                >
                                  <div className="grid gap-3 md:grid-cols-6 md:items-center">
                                    <div className="text-sm">
                                      <div className="text-xs text-muted-foreground md:hidden">Subject</div>
                                      <div className="font-medium text-foreground">{row.subject?.name || '—'}</div>
                                    </div>

                                    <div className="text-sm">
                                      <div className="text-xs text-muted-foreground md:hidden">Exam</div>
                                      <div className="text-foreground">{row.exam.name}</div>
                                    </div>

                                    <div className="text-sm">
                                      <div className="text-xs text-muted-foreground md:hidden">Marks</div>
                                      <div className="tabular-nums text-foreground">
                                        {row.isAbsent ? '—' : `${row.marksObtained} / ${row.exam.totalMarks}`}
                                      </div>
                                    </div>

                                    <div className="text-sm">
                                      <div className="text-xs text-muted-foreground md:hidden">Percentage</div>
                                      <div className="tabular-nums text-foreground">
                                        {row.isAbsent || row.percentage === null ? '—' : `${row.percentage.toFixed(1)}%`}
                                      </div>
                                    </div>

                                    <div className="text-sm">
                                      <div className="text-xs text-muted-foreground md:hidden">Grade</div>
                                      <div className="text-foreground">{row.grade || '—'}</div>
                                    </div>

                                    <div className="text-sm">
                                      <div className="text-xs text-muted-foreground md:hidden">Status</div>
                                      <DetailStatusBadge row={row} />
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
