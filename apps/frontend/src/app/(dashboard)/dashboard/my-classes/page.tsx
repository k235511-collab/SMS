'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { teachersService } from '@/services/teachers.service'
import { useAuth } from '@/context/auth-context'
import { Users, BookOpen, GraduationCap, ClipboardCheck, ShieldCheck, Layers } from 'lucide-react'
import Link from 'next/link'
import { useMemo } from 'react'

interface ClassAssignment {
  id: string
  classId: string
  class: { id: string; name: string; code?: string; _count?: { students: number } }
  section?: { id: string; name: string }
  subject?: { id: string; name: string }
  academicYear?: { id: string; name: string; isCurrent?: boolean }
  isActive: boolean
}

export default function MyClassesPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [assignments, setAssignments] = useState<ClassAssignment[]>([])
  const [loading, setLoading] = useState(true)
  const assignmentCount = assignments.length

  const uniqueClassSectionCount = useMemo(() => {
    const keys = new Set(
      assignments.map((assignment) => `${assignment.classId}:${assignment.section?.id ?? 'all'}`),
    )
    return keys.size
  }, [assignments])

  const classTeacherCards = useMemo(() => {
    const rows = assignments.filter((assignment) => !assignment.subject)
    const map = new Map<
      string,
      {
        key: string
        classId: string
        className: string
        sectionId: string | null
        sectionName: string | null
        studentCount: number
        yearName: string | null
      }
    >()

    for (const row of rows) {
      const sectionId = row.section?.id ?? null
      const key = `${row.classId}:${sectionId ?? 'all'}`
      if (!map.has(key)) {
        map.set(key, {
          key,
          classId: row.classId,
          className: row.class?.name ?? 'Class',
          sectionId,
          sectionName: row.section?.name ?? null,
          studentCount: row.class?._count?.students ?? 0,
          yearName: row.academicYear?.name ?? null,
        })
      }
    }

    return Array.from(map.values())
  }, [assignments])

  const subjectTeacherCards = useMemo(() => {
    const rows = assignments.filter((assignment) => !!assignment.subject)
    const map = new Map<
      string,
      {
        key: string
        classId: string
        className: string
        sectionId: string | null
        sectionName: string | null
        studentCount: number
        yearName: string | null
        subjects: Array<{ id: string; name: string }>
      }
    >()

    for (const row of rows) {
      const sectionId = row.section?.id ?? null
      const key = `${row.classId}:${sectionId ?? 'all'}`
      if (!map.has(key)) {
        map.set(key, {
          key,
          classId: row.classId,
          className: row.class?.name ?? 'Class',
          sectionId,
          sectionName: row.section?.name ?? null,
          studentCount: row.class?._count?.students ?? 0,
          yearName: row.academicYear?.name ?? null,
          subjects: [],
        })
      }

      const card = map.get(key)!
      if (row.subject && !card.subjects.some((subject) => subject.id === row.subject!.id)) {
        card.subjects.push({ id: row.subject.id, name: row.subject.name })
      }
    }

    return Array.from(map.values())
  }, [assignments])

  const subjectLoadCount = useMemo(
    () => subjectTeacherCards.reduce((total, card) => total + card.subjects.length, 0),
    [subjectTeacherCards],
  )

  // Redirect non-teachers
  useEffect(() => {
    if (user && !user.teacherId) {
      router.replace('/dashboard')
    }
  }, [user, router])

  useEffect(() => {
    if (!user?.teacherId) return
    teachersService.getMyClasses().then((classRes) => {
      if (classRes.success && classRes.data) {
        setAssignments(Array.isArray(classRes.data) ? classRes.data : [])
      }
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [user?.teacherId])

  if (!user?.teacherId) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">My Classes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {assignmentCount} assignment{assignmentCount !== 1 ? 's' : ''} across {uniqueClassSectionCount} class-section load{uniqueClassSectionCount !== 1 ? 's' : ''} this academic year.
          </p>
        </div>
        <Badge variant="secondary" className="text-sm">
          {assignmentCount} Assignment{assignmentCount !== 1 ? 's' : ''}
        </Badge>
      </div>

      {!loading && assignments.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          <Card className="border-primary-200/70 bg-primary-50/40">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-primary-700">Class Teacher Sections</p>
                <p className="mt-1 text-2xl font-semibold text-primary-900">{classTeacherCards.length}</p>
              </div>
              <ShieldCheck className="h-5 w-5 text-primary-600" />
            </CardContent>
          </Card>
          <Card className="border-success-500/30 bg-success-50/30">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-success-700">Subject Loads</p>
                <p className="mt-1 text-2xl font-semibold text-success-900">{subjectLoadCount}</p>
              </div>
              <BookOpen className="h-5 w-5 text-success-700" />
            </CardContent>
          </Card>
          <Card className="border-border bg-card">
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Class-Section Blocks</p>
                <p className="mt-1 text-2xl font-semibold text-foreground">{uniqueClassSectionCount}</p>
              </div>
              <Layers className="h-5 w-5 text-muted-foreground" />
            </CardContent>
          </Card>
        </div>
      )}

      {loading && (
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2, 3, 4].map(i => (
            <Card key={i}>
              <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
              <CardContent><Skeleton className="h-20 w-full" /></CardContent>
            </Card>
          ))}
        </div>
      )}

      {!loading && assignments.length === 0 && (
        <div className="text-center py-16 text-muted-foreground">
          <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-30" />
          <p className="text-lg font-medium">No classes assigned yet</p>
          <p className="text-sm mt-1">Contact your school administrator to get class assignments.</p>
        </div>
      )}

      {!loading && assignments.length > 0 && (
        <div className="space-y-8">
          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Class Teacher Responsibilities</h2>
                <p className="text-sm text-muted-foreground">Sections where you manage attendance and full class outcomes.</p>
              </div>
              <Badge className="bg-primary-100 text-primary-700 border-primary-200">
                {classTeacherCards.length} Section{classTeacherCards.length !== 1 ? 's' : ''}
              </Badge>
            </div>

            {classTeacherCards.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex items-center gap-3 py-6 text-sm text-muted-foreground">
                  <ShieldCheck className="h-4 w-4" />
                  No class-teacher sections assigned for this year.
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {classTeacherCards.map((card) => (
                  <Card key={card.key} className="border-primary-200/70 bg-primary-50/20">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <CardTitle className="text-base">
                            {card.className}{card.sectionName ? ` - ${card.sectionName}` : ''}
                          </CardTitle>
                          {card.yearName && (
                            <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                              <GraduationCap className="h-3.5 w-3.5" />
                              {card.yearName}
                            </div>
                          )}
                        </div>
                        <Badge className="bg-primary-100 text-primary-700 border-primary-200 text-[10px] font-semibold">
                          <ShieldCheck className="mr-1 h-3 w-3" />Class Teacher
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>{card.studentCount} students</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <ClipboardCheck className="h-4 w-4" />
                        <span>Attendance and class-level academic oversight</span>
                      </div>
                      <Button size="sm" className="w-full" asChild>
                        <Link href={`/dashboard/attendance?classId=${card.classId}${card.sectionId ? `&sectionId=${card.sectionId}` : ''}`}>
                          <ClipboardCheck className="mr-1.5 h-3.5 w-3.5" />Open Attendance
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Subject Teacher Loads</h2>
                <p className="text-sm text-muted-foreground">Your teaching subjects grouped by class and section.</p>
              </div>
              <Badge variant="outline">
                {subjectLoadCount} Subject{subjectLoadCount !== 1 ? 's' : ''}
              </Badge>
            </div>

            {subjectTeacherCards.length === 0 ? (
              <Card className="border-dashed">
                <CardContent className="flex items-center gap-3 py-6 text-sm text-muted-foreground">
                  <BookOpen className="h-4 w-4" />
                  No subject-teacher assignments configured for this year.
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {subjectTeacherCards.map((card) => (
                  <Card key={card.key} className="transition-colors hover:border-primary/40">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <CardTitle className="text-base">
                            {card.className}{card.sectionName ? ` - ${card.sectionName}` : ''}
                          </CardTitle>
                          {card.yearName && (
                            <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                              <GraduationCap className="h-3.5 w-3.5" />
                              {card.yearName}
                            </div>
                          )}
                        </div>
                        <Badge variant="outline" className="text-[10px] font-semibold">
                          <BookOpen className="mr-1 h-3 w-3" />Subject Teacher
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="h-4 w-4" />
                        <span>{card.studentCount} students</span>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {card.subjects.map((subject) => (
                          <Badge key={subject.id} variant="secondary" className="text-xs">
                            {subject.name}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  )
}
