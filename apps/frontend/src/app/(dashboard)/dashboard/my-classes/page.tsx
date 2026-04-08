'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { teachersService } from '@/services/teachers.service'
import { useAuth } from '@/context/auth-context'
import { Users, BookOpen, GraduationCap, ClipboardCheck, ShieldCheck } from 'lucide-react'
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
  const [classTeacherOfId, setClassTeacherOfId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const assignmentCount = assignments.length
  const uniqueClassCount = useMemo(() => {
    const keys = new Set(
      assignments.map((assignment) => `${assignment.classId}:${assignment.section?.id ?? 'all'}`),
    )
    return keys.size
  }, [assignments])

  // Redirect non-teachers
  useEffect(() => {
    if (user && !user.teacherId) {
      router.replace('/dashboard')
    }
  }, [user, router])

  useEffect(() => {
    if (!user?.teacherId) return
    Promise.all([
      teachersService.getMyClasses(),
      teachersService.getMyProfile(),
    ]).then(([classRes, profileRes]) => {
      if (classRes.success && classRes.data) {
        setAssignments(Array.isArray(classRes.data) ? classRes.data : [])
      }
      if (profileRes.success && profileRes.data) {
        setClassTeacherOfId(profileRes.data.classTeacherOfId || null)
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
            {assignmentCount} teaching assignment{assignmentCount !== 1 ? 's' : ''} across {uniqueClassCount} class{uniqueClassCount !== 1 ? 'es' : ''} this academic year.
          </p>
        </div>
        <Badge variant="secondary" className="text-sm">
          {assignmentCount} Assignment{assignmentCount !== 1 ? 's' : ''}
        </Badge>
      </div>

      {loading && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
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
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {assignments.map((asgn) => {
            const className = asgn.class?.name ?? 'Class'
            const sectionName = asgn.section?.name
            const subjectName = asgn.subject?.name
            const studentCount = asgn.class?._count?.students ?? 0
            const yearName = asgn.academicYear?.name
            const isClassTeacherCard = asgn.classId === classTeacherOfId && !asgn.subject
            const isSubjectTeacherCard = !!asgn.subject

            return (
              <Card key={asgn.id} className={`transition-colors ${isClassTeacherCard ? 'border-primary/50 bg-primary-50/20' : 'hover:border-primary/50'}`}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-lg">
                      {className}{sectionName ? ` — ${sectionName}` : ''}
                    </CardTitle>
                    {isClassTeacherCard && (
                      <Badge className="bg-primary-100 text-primary-700 border-primary-200 text-[10px] font-semibold">
                        <ShieldCheck className="h-3 w-3 mr-0.5" />Class Teacher
                      </Badge>
                    )}
                    {isSubjectTeacherCard && (
                      <Badge variant="outline" className="text-[10px] font-semibold">
                        <BookOpen className="h-3 w-3 mr-0.5" />Subject Teacher
                      </Badge>
                    )}
                  </div>
                  <Badge variant="outline">
                    <Users className="h-3 w-3 mr-1 inline" />{studentCount}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {subjectName && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <BookOpen className="h-4 w-4" />
                        <span>{subjectName}</span>
                      </div>
                    )}
                    {!subjectName && isClassTeacherCard && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <ClipboardCheck className="h-4 w-4" />
                        <span>Full access: attendance, report cards, all subjects</span>
                      </div>
                    )}
                    {yearName && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <GraduationCap className="h-4 w-4" />
                        <span>{yearName}</span>
                      </div>
                    )}
                    {(isClassTeacherCard || asgn.classId === classTeacherOfId) && (
                      <div className="flex gap-2 pt-2">
                        <Button size="sm" className="flex-1" asChild>
                          <Link href={`/dashboard/attendance?classId=${asgn.classId}${asgn.section ? `&sectionId=${asgn.section.id}` : ''}`}>
                            <ClipboardCheck className="h-3.5 w-3.5 mr-1.5" />Attendance
                          </Link>
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
