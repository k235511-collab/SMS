'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import { Card, CardBody } from '@/components/ui/card'
import { PermissionGate } from '@/components/auth'
import { api } from '@/lib/api-client'
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  Sparkles,
} from 'lucide-react'
import Link from 'next/link'
import { useSession } from '@/context/session-context'
import {
  FeeCollectionCard,
  AttendanceChart,
  QuickActions,
  PeopleStats,
  UpcomingEvents,
} from '@/components/dashboard'

/* ─── Types ──────────────────────────────────────────────────────── */
interface DashboardOverview {
  people: {
    students: { total: number; active: number; inactive: number }
    teachers: number
    staff: number
    classes: number
  }
  setup?: {
    academicYears: number
    campuses: number
    classes: number
    sections: number
    subjects: number
    teachers: number
    students: number
  }
  feeCollection: {
    today: number
    monthly: number
    yearly: number
    pendingFee: number
    arrears: number
  }
  attendance: {
    summary: { present: number; absent: number; late: number; leave: number }
    byClass: { className: string; present: number; absent: number; late: number; leave: number }[]
  }
  upcomingEvents: { id: string; title: string; startDate: string; endDate: string | null; type: string }[]
}

interface SetupStep {
  key: string
  label: string
  description: string
  href: string
  done: boolean
  permission?: string
}

/* ─── Page ───────────────────────────────────────────────────────── */
export default function DashboardPage() {
  const { user } = useAuth()
  const router = useRouter()
  const { selectedYear, selectedCampus } = useSession()
  const [data, setData] = useState<DashboardOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [fetchSucceeded, setFetchSucceeded] = useState(false)
  const [wizardHiddenTemporarily, setWizardHiddenTemporarily] = useState(false)

  // Redirect teachers away from Dashboard to My Classes
  useEffect(() => {
    if (user?.teacherId) {
      router.replace('/dashboard/my-classes')
    }
  }, [user?.teacherId, router])

  // Guard against stale responses from overlapping fetches
  const fetchCounterRef = useRef(0)

  const fetchOverview = useCallback(async (showLoader = true) => {
    const fetchId = ++fetchCounterRef.current
    if (showLoader) setLoading(true)
    setFetchSucceeded(false)
    try {
      const params: Record<string, string> = {}
      if (selectedYear?.id) params.academicYearId = selectedYear.id
      if (selectedYear?.startDate) params.startDate = selectedYear.startDate
      if (selectedYear?.endDate) params.endDate = selectedYear.endDate
      const res = await api.get<DashboardOverview>('/analytics/overview', { params })
      // Discard result if a newer fetch was started while we were waiting
      if (fetchId !== fetchCounterRef.current) return
      if (res.success && res.data) {
        setData(res.data)
        setFetchSucceeded(true)
      }
    } catch {
      // components handle empty state gracefully
    } finally {
      if (fetchId === fetchCounterRef.current) setLoading(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear?.id, selectedCampus?.id])

  // Re-fetch when school or academic year changes
  useEffect(() => {
    if (user?.schoolId) {
      fetchOverview()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchOverview, user?.schoolId, selectedYear?.id])

  // Auto-refresh every 60 seconds (silent, no loading spinner)
  useEffect(() => {
    const interval = setInterval(() => {
      fetchOverview(false)
    }, 60_000)
    return () => clearInterval(interval)
  }, [fetchOverview])

  // Re-fetch when user focuses the window (e.g. comes back from attendance page)
  useEffect(() => {
    const handleFocus = () => {
      fetchOverview(false)
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [fetchOverview])

  // Re-fetch when navigating back to this page (visibility change)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        fetchOverview(false)
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [fetchOverview])

  const emptyPeople = { students: { total: 0, active: 0, inactive: 0 }, teachers: 0, staff: 0, classes: 0 }
  const people = data?.people ?? emptyPeople

  const setupCounts = data?.setup ?? {
    academicYears: 0,
    campuses: 0,
    classes: 0,
    sections: 0,
    subjects: 0,
    teachers: 0,
    students: 0,
  }

  const hideWizardTemporarily = () => setWizardHiddenTemporarily(true)

  const setupSteps: SetupStep[] = [
    {
      key: 'academic-years',
      label: 'Set Academic Year',
      description: 'Create your academic year before daily operations',
      href: '/dashboard/settings?tab=academic-years',
      done: setupCounts.academicYears > 0,
      permission: 'academics:create',
    },
    {
      key: 'classes',
      label: 'Create Classes',
      description: 'Set up class structure (e.g. Grade 1, Grade 2)',
      href: '/dashboard/academics/classes',
      done: setupCounts.classes > 0,
      permission: 'academics:create',
    },
    {
      key: 'subjects',
      label: 'Add Subjects',
      description: 'Define subjects taught in your school',
      href: '/dashboard/academics/subjects',
      done: setupCounts.subjects > 0,
      permission: 'academics:create',
    },
    {
      key: 'teachers',
      label: 'Add Teachers',
      description: 'Register your teaching staff',
      href: '/dashboard/teachers',
      done: setupCounts.teachers > 0,
      permission: 'teachers:create',
    },
    {
      key: 'students',
      label: 'Enroll Students',
      description: 'Add students to your school',
      href: '/dashboard/students',
      done: setupCounts.students > 0,
      permission: 'students:create',
    },
    {
      key: 'bulk-import-essentials',
      label: 'Prepare Bulk Import Essentials',
      description: 'Ensure campus, academic year, classes and sections are ready for bulk import',
      href: '/dashboard/students',
      done:
        setupCounts.campuses > 0 &&
        setupCounts.academicYears > 0 &&
        setupCounts.classes > 0 &&
        setupCounts.sections > 0,
      permission: 'students:create',
    },
  ]
  const completedSteps = setupSteps.filter((s) => s.done).length
  const allSetupCompleted = setupSteps.length > 0 && completedSteps === setupSteps.length
  const showSetupWizard = !loading && fetchSucceeded && !allSetupCompleted && !wizardHiddenTemporarily
  const setupProgress = Math.round((completedSteps / setupSteps.length) * 100)

  const currency = (user?.schoolSettings as any)?.currency ?? 'PKR'

  return (
    <div className="space-y-6">
      {/* ─── Header ─────────────────────────────────────────── */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Welcome back, {user?.firstName}.
          {user?.schoolName
            ? ` Here\u0027s an overview of ${user.schoolName}.`
            : ' Here\u0027s an overview of your school.'}
        </p>
      </div>

      {/* ─── New School Setup Wizard ────────────────────────── */}
      {showSetupWizard && (
        <Card className="border-primary/30 bg-primary/5">
          <CardBody className="space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-primary/10 p-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">
                    Welcome! Let&apos;s set up your school
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Complete these setup steps to manage your school smoothly.
                  </p>
                </div>
              </div>
              <button
                onClick={hideWizardTemporarily}
                className="rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                title="Hide for now"
              >
                Hide for now
              </button>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{completedSteps} of {setupSteps.length} steps completed</span>
                <span>{setupProgress}%</span>
              </div>
              <div className="h-2 rounded-full bg-muted">
                <div className="h-2 rounded-full bg-primary transition-all" style={{ width: `${setupProgress}%` }} />
              </div>
              <p className="text-xs text-muted-foreground">You can hide this card temporarily and continue later.</p>
            </div>

            <div className="space-y-2">
              {setupSteps.map((step) => {
                const stepLink = (
                  <Link
                    key={step.key}
                    href={step.href}
                    className={`flex items-center justify-between rounded-lg border p-3 transition-colors ${step.done ? 'border-border bg-muted/50 opacity-60' : 'border-border bg-card hover:border-primary/50 hover:bg-accent'}`}
                  >
                    <div className="flex items-start gap-3">
                      {step.done ? <CheckCircle2 className="h-5 w-5 flex-shrink-0 text-emerald-500 mt-0.5" /> : <Circle className="h-5 w-5 flex-shrink-0 text-muted-foreground mt-0.5" />}
                      <div>
                        <p className={`text-sm font-medium leading-tight ${step.done ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                          {step.label}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">{step.description}</p>
                      </div>
                    </div>
                    {!step.done && <ArrowRight className="h-4 w-4 flex-shrink-0 text-muted-foreground ml-2" />}
                  </Link>
                )
                if (step.permission) {
                  return <PermissionGate key={step.key} permission={step.permission}>{stepLink}</PermissionGate>
                }
                return stepLink
              })}
            </div>
          </CardBody>
        </Card>
      )}

      {/* ─── Quick Actions ──────────────────────────────────── */}
      <QuickActions />

      {/* ─── Fee Collection ─────────────────────────────────── */}
      <PermissionGate permission="finance:read">
        <div>
          <h2 className="text-sm font-bold text-foreground uppercase tracking-wider mb-3">
            Fee Collection
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <FeeCollectionCard
              title="Today"
              variant="today"
              received={data?.feeCollection?.today ?? 0}
              loading={loading}
              currency={currency}
            />
            <FeeCollectionCard
              title="Monthly"
              variant="monthly"
              received={data?.feeCollection?.monthly ?? 0}
              loading={loading}
              currency={currency}
            />
            <FeeCollectionCard
              title="Yearly"
              variant="yearly"
              received={data?.feeCollection?.yearly ?? 0}
              loading={loading}
              currency={currency}
            />
            <FeeCollectionCard
              title="Pending Fee"
              variant="pending"
              received={data?.feeCollection?.pendingFee ?? 0}
              loading={loading}
              currency={currency}
            />
            <FeeCollectionCard
              title="Previous Year Dues"
              variant="arrears"
              received={data?.feeCollection?.arrears ?? 0}
              loading={loading}
              currency={currency}
            />
          </div>
        </div>
      </PermissionGate>

      {/* ─── People Stats ───────────────────────────────────── */}
      <PeopleStats data={people} loading={loading} />

      {/* ─── Attendance + Events (2-column) ─────────────────── */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <PermissionGate permission="attendance:read">
            <AttendanceChart
              summary={data?.attendance?.summary ?? { present: 0, absent: 0, late: 0, leave: 0 }}
              byClass={data?.attendance?.byClass ?? []}
              loading={loading}
            />
          </PermissionGate>
        </div>

        <div>
          <UpcomingEvents
            events={data?.upcomingEvents ?? []}
            loading={loading}
          />
        </div>
      </div>
    </div>
  )
}
