'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Card, CardBody } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { api } from '@/lib/api-client'
import {
  ArrowLeft,
  Building2,
  Users,
  GraduationCap,
  BookOpen,
  MapPin,
  Mail,
  Phone,
  Globe,
  CalendarDays,
  Power,
  Trash2,
  LogIn,
  CheckCircle2,
  Circle,
  LayoutGrid,
  ClipboardList,
  Layers,
  Calendar,
  CalendarOff,
  Banknote,
} from 'lucide-react'
import { toast } from 'sonner'

interface RecentUser {
  id: string
  firstName: string
  lastName: string
  email: string
  isActive: boolean
  createdAt: string
  lastLoginAt?: string | null
  role: { name: string; slug: string }
}

interface OnboardingStatus {
  hasAdmin: boolean
  hasStudents: boolean
  hasTeachers: boolean
  hasClasses: boolean
  hasSubjects: boolean
}

interface SchoolDetail {
  id: string
  name: string
  slug: string
  code: string
  email?: string
  phone?: string
  address?: string
  domain?: string
  website?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  subscriptionPlan?: {
    id: string; name: string; slug: string; price: number
    maxStudents: number | null; maxTeachers: number | null; maxCampuses: number | null
  } | null
  _count?: {
    users: number; students: number; teachers: number; campuses: number
    classes: number; sections: number; subjects: number; exams: number
  }
  subscriptionExpiresAt?: string | null
  lastActiveUser?: { firstName: string; lastName: string; email: string; lastLoginAt: string } | null
  recentUsers?: RecentUser[]
  onboarding?: OnboardingStatus
}

interface PlanOption {
  id: string
  name: string
  price: number
  durationDays?: number | null
}

export default function SchoolDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [school, setSchool] = useState<SchoolDetail | null>(null)
  const [plans, setPlans] = useState<PlanOption[]>([])
  const [loading, setLoading] = useState(true)
  const [renewOpen, setRenewOpen] = useState(false)
  const [renewMode, setRenewMode] = useState<'existing' | 'new'>('existing')
  const [selectedPlanId, setSelectedPlanId] = useState('')
  const [renewing, setRenewing] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const fetchSchool = useCallback(async () => {
    setLoading(true)
    const res = await api.get<SchoolDetail>(`/platform/schools/${params.id}`)
    if (res.success && res.data) {
      setSchool(res.data as SchoolDetail)
    }
    setLoading(false)
  }, [params.id])

  const fetchPlans = useCallback(async () => {
    const res = await api.get<PlanOption[]>('/platform/plans')
    if (res.success && Array.isArray(res.data)) {
      setPlans(res.data)
    }
  }, [])

  useEffect(() => { fetchSchool() }, [fetchSchool])
  useEffect(() => { fetchPlans() }, [fetchPlans])

  const handleToggle = async () => {
    if (!school) return
    const res = await api.patch(`/platform/schools/${school.id}/toggle-status`, {})
    if (res.success) {
      toast.success(`School ${school.isActive ? 'suspended' : 'activated'}`)
      fetchSchool()
    }
  }

  const handleDelete = async () => {
    if (!school) return
    setDeleting(true)
    try {
      const res = await api.delete(`/platform/schools/${school.id}`)
      if (res.success) {
        toast.success(`"${school.name}" deleted`)
        router.push('/platform/schools')
      } else {
        toast.error(res.message || 'Failed to delete')
      }
    } finally {
      setDeleting(false)
      setDeleteOpen(false)
    }
  }

  const handleImpersonate = async () => {
    if (!school || !school.isActive) {
      toast.error('Cannot impersonate a suspended school')
      return
    }
    const res = await api.post<any>(`/platform/schools/${school.id}/impersonate`, {})
    if (res.success && res.data) {
      document.cookie = `sms_access_token=${res.data.token}; path=/; max-age=3600; SameSite=Lax`
      toast.success(`Impersonating ${school.name} as ${res.data.user?.email}`)
      window.location.href = '/dashboard'
    } else {
      toast.error(res.message || 'Failed to impersonate')
    }
  }

  const handleOpenRenew = () => {
    if (school?.subscriptionPlan?.id) {
      setRenewMode('existing')
      setSelectedPlanId(school.subscriptionPlan.id)
    } else {
      setRenewMode('new')
      setSelectedPlanId('')
    }
    setRenewOpen(true)
  }

  const handleRenew = async () => {
    if (!school) return

    const planId = renewMode === 'existing' ? school.subscriptionPlan?.id : selectedPlanId
    if (!planId) {
      toast.error('Please choose a subscription plan first')
      return
    }

    setRenewing(true)
    try {
      const res = await api.patch(`/platform/schools/${school.id}`, { subscriptionPlanId: planId })
      if (res.success) {
        toast.success('Subscription updated successfully')
        setRenewOpen(false)
        await fetchSchool()
      } else {
        toast.error(res.message || 'Failed to update subscription')
      }
    } finally {
      setRenewing(false)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <div className="h-10 w-10 animate-pulse rounded-lg bg-muted" />
          <div className="space-y-2">
            <div className="h-6 w-48 animate-pulse rounded bg-muted" />
            <div className="h-4 w-32 animate-pulse rounded bg-muted" />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-24 animate-pulse rounded-lg border border-border bg-muted/30" />
          ))}
        </div>
      </div>
    )
  }

  if (!school) {
    return (
      <div className="text-center py-20">
        <h2 className="text-lg font-semibold text-foreground">School not found</h2>
        <Button variant="outline" className="mt-4" onClick={() => router.push('/platform/schools')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Schools
        </Button>
      </div>
    )
  }

  // Revenue approximations
  const calculateTotalRevenue = () => {
    if (!school) return 0
    const price = school.subscriptionPlan?.price || 0
    // Estimate active months since creation
    const createdDate = new Date(school.createdAt)
    const now = new Date()
    // Calculate full months difference (at least 1 to represent the current active month)
    const diffMonths = (now.getFullYear() - createdDate.getFullYear()) * 12 + (now.getMonth() - createdDate.getMonth())
    const activeMonths = Math.max(1, diffMonths)
    return activeMonths * price
  }

  const startDate = new Date(school.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  const expiryDate = school.subscriptionExpiresAt
    ? new Date(school.subscriptionExpiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Lifetime'
  const expiryDateObj = school.subscriptionExpiresAt ? new Date(school.subscriptionExpiresAt) : null
  const hasValidExpiryDate = !!expiryDateObj && !Number.isNaN(expiryDateObj.getTime())
  const now = new Date()
  const diffMs = hasValidExpiryDate ? expiryDateObj.getTime() - now.getTime() : null
  const isSubscriptionExpired = hasValidExpiryDate && diffMs != null ? diffMs < 0 : false
  const remainingDays = hasValidExpiryDate && diffMs != null ? Math.ceil(Math.max(diffMs, 0) / 86400000) : null
  const expiredDays = hasValidExpiryDate && diffMs != null && diffMs < 0
    ? Math.ceil(Math.abs(diffMs) / 86400000)
    : 0

  const stats = [
    { label: 'Users', value: school._count?.users || 0, icon: Users, color: 'text-blue-600 bg-blue-500/10 dark:bg-blue-500/20' },
    { label: 'Students', value: school._count?.students || 0, icon: GraduationCap, color: 'text-emerald-600 bg-emerald-500/10 dark:bg-emerald-500/20' },
    { label: 'Teachers', value: school._count?.teachers || 0, icon: BookOpen, color: 'text-violet-600 bg-violet-500/10 dark:bg-violet-500/20' },
    { label: 'Campuses', value: school._count?.campuses || 0, icon: Building2, color: 'text-amber-600 bg-amber-500/10 dark:bg-amber-500/20' },
    { label: 'Classes', value: school._count?.classes || 0, icon: LayoutGrid, color: 'text-cyan-600 bg-cyan-500/10 dark:bg-cyan-500/20' },
    { label: 'Starts From', value: startDate, icon: Calendar, color: 'text-rose-600 bg-rose-500/10 dark:bg-rose-500/20' },
    { label: 'Expiry Date', value: expiryDate, icon: CalendarOff, color: 'text-orange-600 bg-orange-500/10 dark:bg-orange-500/20' },
    { label: 'Total Revenue', value: `Rs ${calculateTotalRevenue().toLocaleString()}`, icon: Banknote, color: 'text-green-600 bg-green-500/10 dark:bg-green-500/20' },
  ]

  const onboarding = school.onboarding
  const onboardingSteps = onboarding ? [
    { label: 'Admin user created', done: onboarding.hasAdmin },
    { label: 'Teachers added', done: onboarding.hasTeachers },
    { label: 'Students enrolled', done: onboarding.hasStudents },
    { label: 'Classes configured', done: onboarding.hasClasses },
    { label: 'Subjects created', done: onboarding.hasSubjects },
  ] : []

  const completedSteps = onboardingSteps.filter((s) => s.done).length
  const totalSteps = onboardingSteps.length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push('/platform/schools')} aria-label="Back to schools">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">{school.name}</h1>
            <Badge variant={school.isActive ? 'default' : 'destructive'}>
              {school.isActive ? 'Active' : 'Suspended'}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{school.slug} &middot; {school.code}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleImpersonate}
            disabled={!school.isActive}
            title={!school.isActive ? 'Cannot impersonate suspended school' : 'Log in as school admin'}
          >
            <LogIn className="mr-2 h-4 w-4" /> Impersonate
          </Button>
          <Button variant="outline" onClick={handleToggle}>
            <Power className="mr-2 h-4 w-4" />
            {school.isActive ? 'Suspend' : 'Activate'}
          </Button>
          <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardBody className="flex items-center gap-3 p-4">
              <div className={`rounded-lg p-2 ${s.color}`}>
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* School Info */}
        <Card>
          <CardBody className="p-6">
            <h2 className="mb-4 text-lg font-semibold text-foreground">School Information</h2>
            <div className="space-y-3">
              {school.email && (
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground">{school.email}</span>
                </div>
              )}
              {school.phone && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground">{school.phone}</span>
                </div>
              )}
              {school.address && (
                <div className="flex items-center gap-3 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground">{school.address}</span>
                </div>
              )}
              {school.website && (
                <div className="flex items-center gap-3 text-sm">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <a href={school.website} target="_blank" rel="noopener" className="text-primary-600 hover:underline">{school.website}</a>
                </div>
              )}
              {school.domain && (
                <div className="flex items-center gap-3 text-sm">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <span className="text-foreground">Domain: {school.domain}</span>
                </div>
              )}
              <div className="flex items-center gap-3 text-sm">
                <CalendarDays className="h-4 w-4 text-muted-foreground" />
                <span className="text-foreground">Registered: {new Date(school.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Subscription & Activity */}
        <div className="space-y-6">
          <Card>
            <CardBody className="p-6">
              <div className="mb-4 flex items-start justify-between gap-3">
                <h2 className="text-lg font-semibold text-foreground">Subscription Plan</h2>
                <Button
                  size="sm"
                  variant={isSubscriptionExpired || !school.subscriptionPlan ? 'primary' : 'secondary'}
                  onClick={handleOpenRenew}
                >
                  {school.subscriptionPlan
                    ? (isSubscriptionExpired ? 'Renew Now' : 'Renew or Upgrade')
                    : 'Assign Plan'}
                </Button>
              </div>
              {school.subscriptionPlan ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground">{school.subscriptionPlan.name}</span>
                    <Badge variant="secondary">PKR {school.subscriptionPlan.price}/mo</Badge>
                  </div>
                  {school.subscriptionExpiresAt && (
                    <div className={`flex items-center justify-between gap-2 text-xs p-2 rounded border ${
                      isSubscriptionExpired
                        ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-300 dark:border-red-500/20'
                        : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-500/10 dark:text-amber-300 dark:border-amber-500/20'
                    }`}>
                      <div className="flex items-center gap-2">
                      <CalendarDays className="h-3 w-3" />
                      <span>Expires on: {new Date(school.subscriptionExpiresAt).toLocaleDateString()}</span>
                      </div>
                      <Badge variant={isSubscriptionExpired ? 'destructive' : 'secondary'}>
                        {isSubscriptionExpired
                          ? `Expired ${expiredDays} day${expiredDays === 1 ? '' : 's'} ago`
                          : `${remainingDays ?? 0} day${remainingDays === 1 ? '' : 's'} left`}
                      </Badge>
                    </div>
                  )}
                  {!school.subscriptionExpiresAt && (
                    <div className="flex items-center justify-between gap-2 rounded border border-emerald-200 bg-emerald-50 p-2 text-xs text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-300">
                      <span>This school is on a lifetime subscription.</span>
                    </div>
                  )}
                  <div className="space-y-2 text-xs text-muted-foreground">
                    {school.subscriptionPlan.maxStudents != null && (
                      <div>
                        <div className="mb-1 flex justify-between">
                          <span>Students</span>
                          <span>{school._count?.students || 0} / {school.subscriptionPlan.maxStudents}</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted">
                          <div
                            className={`h-2 rounded-full ${
                              ((school._count?.students || 0) / Math.max(1, school.subscriptionPlan.maxStudents)) > 0.9
                                ? 'bg-red-500'
                                : 'bg-primary-500'
                            }`}
                            style={{
                              width: `${Math.min(100, ((school._count?.students || 0) / Math.max(1, school.subscriptionPlan.maxStudents)) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                    {school.subscriptionPlan.maxTeachers != null && (
                      <div>
                        <div className="mb-1 flex justify-between">
                          <span>Teachers</span>
                          <span>{school._count?.teachers || 0} / {school.subscriptionPlan.maxTeachers}</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted">
                          <div
                            className={`h-2 rounded-full ${
                              ((school._count?.teachers || 0) / Math.max(1, school.subscriptionPlan.maxTeachers)) > 0.9
                                ? 'bg-red-500'
                                : 'bg-primary-500'
                            }`}
                            style={{
                              width: `${Math.min(100, ((school._count?.teachers || 0) / Math.max(1, school.subscriptionPlan.maxTeachers)) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                    {school.subscriptionPlan.maxCampuses != null && (
                      <div>
                        <div className="mb-1 flex justify-between">
                          <span>Campuses</span>
                          <span>{school._count?.campuses || 0} / {school.subscriptionPlan.maxCampuses}</span>
                        </div>
                        <div className="h-2 rounded-full bg-muted">
                          <div
                            className="h-2 rounded-full bg-primary-500"
                            style={{
                              width: `${Math.min(100, ((school._count?.campuses || 0) / Math.max(1, school.subscriptionPlan.maxCampuses)) * 100)}%`,
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No plan assigned</p>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardBody className="p-6">
              <h2 className="mb-4 text-lg font-semibold text-foreground">Last Active User</h2>
              {school.lastActiveUser ? (
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-500/10 text-sm font-semibold text-primary-600">
                    {school.lastActiveUser.firstName?.[0]}{school.lastActiveUser.lastName?.[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">
                      {school.lastActiveUser.firstName} {school.lastActiveUser.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground">{school.lastActiveUser.email}</p>
                    {school.lastActiveUser.lastLoginAt && (
                      <p className="text-xs text-muted-foreground">
                        Last login: {new Date(school.lastActiveUser.lastLoginAt).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No recent activity</p>
              )}
            </CardBody>
          </Card>
        </div>
      </div>

      {/* Bottom row: Recent Users + Onboarding */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Recent Users */}
        <Card>
          <CardBody className="p-6">
            <h2 className="mb-4 text-lg font-semibold text-foreground">Recent Users</h2>
            {school.recentUsers && school.recentUsers.length > 0 ? (
              <div className="space-y-3">
                {school.recentUsers.map((u) => (
                  <div key={u.id} className="flex items-center justify-between rounded-lg border border-border p-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-xs font-semibold">
                        {u.firstName[0]}{u.lastName[0]}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{u.firstName} {u.lastName}</p>
                        <p className="text-xs text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={u.isActive ? 'secondary' : 'destructive'} className="text-[10px]">
                        {u.role.name}
                      </Badge>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {u.lastLoginAt ? `Login: ${new Date(u.lastLoginAt).toLocaleDateString()}` : 'Never logged in'}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No users yet</p>
            )}
          </CardBody>
        </Card>

        {/* Onboarding Checklist */}
        <Card>
          <CardBody className="p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Onboarding Progress</h2>
              {totalSteps > 0 && (
                <Badge variant={completedSteps === totalSteps ? 'default' : 'secondary'}>
                  {completedSteps}/{totalSteps}
                </Badge>
              )}
            </div>
            {totalSteps > 0 && (
              <>
                <div className="mb-4 h-2 rounded-full bg-muted">
                  <div
                    className="h-2 rounded-full bg-emerald-500 transition-all"
                    style={{ width: `${(completedSteps / totalSteps) * 100}%` }}
                  />
                </div>
                <div className="space-y-2">
                  {onboardingSteps.map((step, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      {step.done ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : (
                        <Circle className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span className={step.done ? 'text-foreground' : 'text-muted-foreground'}>
                        {step.label}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Delete Confirmation */}
      <Dialog open={renewOpen} onOpenChange={setRenewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{school?.subscriptionPlan ? 'Renew or Upgrade Subscription' : 'Assign Subscription Plan'}</DialogTitle>
            <DialogDescription>
              {school?.subscriptionPlan
                ? 'Choose whether to renew the current plan or switch to another plan for upgrade or downgrade.'
                : 'Select a subscription plan to activate this school.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {school?.subscriptionPlan && (
              <div className="space-y-2">
                <Label>Renewal Option</Label>
                <Select value={renewMode} onValueChange={(value) => setRenewMode(value as 'existing' | 'new')}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select renewal option" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="existing">Renew existing plan ({school.subscriptionPlan.name})</SelectItem>
                    <SelectItem value="new">Choose new plan (upgrade or downgrade)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {(renewMode === 'new' || !school?.subscriptionPlan) && (
              <div className="space-y-2">
                <Label>Select Plan</Label>
                <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose a plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {plans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name} · PKR {plan.price}/mo · {plan.durationDays ? `${plan.durationDays} days` : 'lifetime'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {plans.length === 0 && (
                  <p className="text-xs text-muted-foreground">No subscription plans are available yet.</p>
                )}
              </div>
            )}

            {school?.subscriptionPlan && renewMode === 'existing' && (
              <div className="rounded-md border border-border bg-muted/30 p-3 text-xs text-muted-foreground">
                Renewing the current plan will extend expiry based on that plan duration from today.
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRenewOpen(false)} disabled={renewing}>Cancel</Button>
            <Button
              onClick={handleRenew}
              disabled={
                renewing ||
                ((renewMode === 'new' || !school?.subscriptionPlan) && !selectedPlanId)
              }
            >
              {renewing
                ? 'Saving...'
                : (school?.subscriptionPlan && renewMode === 'existing' ? 'Renew Current Plan' : 'Save Subscription')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete School</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete <strong>{school.name}</strong>?
              This will remove ALL school data including users, students, teachers, classes, exams and financial records.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete Permanently'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
