'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card, CardBody } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { DataTable, SortableHeader, type ColumnDef } from '@/components/ui/data-table'
import { PageHeader } from '@/components/ui/page-header'
import { StatusBadge } from '@/components/ui/status-badge'
import { api } from '@/lib/api-client'
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Power,
  Eye,
  Search,
  Download,
  LogIn,
  X,
  UserCog,
} from 'lucide-react'
import { toast } from 'sonner'
import { GoogleAccountPicker, type GoogleAccount } from '@/components/ui/google-account-picker'

interface School {
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
  subscriptionPlan?: { id: string; name: string; slug: string; maxStudents?: number | null }
  subscriptionPlanId?: string
  _count?: { users: number; students: number; teachers: number; campuses: number }
}

interface Plan {
  id: string; name: string; slug: string; price: number; maxStudents?: number | null
}

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
const codeify = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]+/g, '-').substring(0, 8)

export default function PlatformSchoolsPage() {
  const [schools, setSchools] = useState<School[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [planFilter, setPlanFilter] = useState<string>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<School | null>(null)
  const [googleAccount, setGoogleAccount] = useState<GoogleAccount | null>(null)
  const [useManualAdmin, setUseManualAdmin] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<School | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [adminSwitchTarget, setAdminSwitchTarget] = useState<School | null>(null)
  const [adminSwitchSaving, setAdminSwitchSaving] = useState(false)
  
  // Current admin fetching
  const [currentAdmin, setCurrentAdmin] = useState<{ email: string, hasGoogleLogin: boolean, hasPassword: boolean, firstName: string, lastName: string } | null>(null)
  const [loadingAdmin, setLoadingAdmin] = useState(false)

  const searchParams = useSearchParams()
  const router = useRouter()

  const [adminSwitchForm, setAdminSwitchForm] = useState({
    adminEmail: '', adminPassword: '', adminFirstName: '', adminLastName: '', adminGoogleId: ''
  })


  const [form, setForm] = useState({
    name: '', slug: '', code: '', email: '', phone: '', address: '', website: '', domain: '',
    subscriptionPlanId: '',
    adminEmail: '', adminPassword: '', adminFirstName: '', adminLastName: '', adminGoogleId: '',
  })

  const [totalSchools, setTotalSchools] = useState(0)

  const fetchSchools = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, any> = { pageSize: 100, search }
      if (statusFilter !== 'all') params.status = statusFilter
      if (planFilter !== 'all') params.planId = planFilter
      const res = await api.get<any>('/platform/schools', { params })
      if (res.success && res.data) {
        const d = res.data.data || res.data
        setSchools(Array.isArray(d) ? d : [])
        setTotalSchools(res.data.meta?.total ?? (Array.isArray(d) ? d.length : 0))
      }
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter, planFilter])

  const fetchPlans = useCallback(async () => {
    const res = await api.get<Plan[]>('/platform/plans')
    if (res.success && res.data) {
      setPlans(Array.isArray(res.data) ? res.data : [])
    }
  }, [])

  useEffect(() => { fetchSchools() }, [fetchSchools])
  useEffect(() => { fetchPlans() }, [fetchPlans])

  // Auto-open create dialog if action=create in URL
  useEffect(() => {
    if (searchParams.get('action') === 'create') {
      resetForm()
      setDialogOpen(true)
    }
  }, [searchParams])

  const resetForm = () => {
    setEditing(null)
    setGoogleAccount(null)
    setUseManualAdmin(false)
    setForm({
      name: '', slug: '', code: '', email: '', phone: '', address: '', website: '', domain: '',
      subscriptionPlanId: '',
      adminEmail: '', adminPassword: '', adminFirstName: '', adminLastName: '', adminGoogleId: '',
    })
  }

  const openEdit = (school: School) => {
    setEditing(school)
    setForm({
      name: school.name, slug: school.slug, code: school.code,
      email: school.email || '', phone: school.phone || '',
      address: school.address || '', website: school.website || '',
      domain: school.domain || '',
      subscriptionPlanId: school.subscriptionPlanId || school.subscriptionPlan?.id || '',
      adminEmail: '', adminPassword: '', adminFirstName: '', adminLastName: '', adminGoogleId: '',
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (editing) {
        const { adminEmail, adminPassword, adminFirstName, adminLastName, ...updateData } = form
        const res = await api.patch(`/platform/schools/${editing.id}`, updateData)
        if (res.success) { toast.success('School updated'); setDialogOpen(false); fetchSchools() }
        else toast.error(res.message || 'Failed to update')
      } else {
        const res = await api.post('/platform/schools', form)
        if (res.success) { toast.success('School created with default roles'); setDialogOpen(false); fetchSchools() }
        else toast.error(res.message || 'Failed to create')
      }
    } finally { setSaving(false) }
  }

  const handleToggle = async (school: School) => {
    const res = await api.patch(`/platform/schools/${school.id}/toggle-status`, {})
    if (res.success) {
      toast.success(`School ${school.isActive ? 'suspended' : 'activated'}`)
      fetchSchools()
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await api.delete(`/platform/schools/${deleteTarget.id}`)
      if (res.success) {
        toast.success(`"${deleteTarget.name}" deleted`)
        fetchSchools()
      } else {
        toast.error(res.message || 'Failed to delete')
      }
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  const handleAdminSwitch = async () => {
    if (!adminSwitchTarget) return
    setAdminSwitchSaving(true)
    try {
      // Filter out empty password to avoid backend validation error
      const payload: any = { ...adminSwitchForm }
      if (!payload.adminPassword) delete payload.adminPassword

      const res = await api.patch(`/platform/schools/${adminSwitchTarget.id}/switch-admin`, payload)
      if (res.success) {
        toast.success('Admin credentials updated successfully')
        setAdminSwitchTarget(null)
      } else {
        toast.error(res.message || 'Failed to update admin')
      }
    } finally {
      setAdminSwitchSaving(false)
    }
  }

  const handleImpersonate = async (school: School) => {
    if (!school.isActive) {
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

  const exportCSV = () => {
    const headers = ['Name', 'Slug', 'Code', 'Plan', 'Users', 'Students', 'Teachers', 'Status', 'Registered']
    const rows = schools.map((s) => [
      s.name,
      s.slug,
      s.code,
      s.subscriptionPlan?.name || 'None',
      s._count?.users || 0,
      s._count?.students || 0,
      s._count?.teachers || 0,
      s.isActive ? 'Active' : 'Suspended',
      new Date(s.createdAt).toLocaleDateString(),
    ])
    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `schools-export-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('CSV exported')
  }

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('all')
    setPlanFilter('all')
  }

  const hasFilters = search || statusFilter !== 'all' || planFilter !== 'all'

  const columns: ColumnDef<School>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => <SortableHeader column={column}>School</SortableHeader>,
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-foreground">{row.original.name}</p>
          <p className="text-xs text-muted-foreground">{row.original.slug}</p>
        </div>
      ),
    },
    {
      accessorKey: 'code',
      header: ({ column }) => <SortableHeader column={column}>Code</SortableHeader>,
    },
    {
      accessorKey: 'subscriptionPlan',
      header: 'Plan',
      cell: ({ row }) => (
        <Badge variant="secondary">{row.original.subscriptionPlan?.name || 'None'}</Badge>
      ),
    },
    {
      id: 'counts',
      header: 'Usage',
      cell: ({ row }) => {
        const c = row.original._count
        const maxStudents = row.original.subscriptionPlan?.maxStudents
        const studentCount = c?.students || 0
        const pct = maxStudents ? Math.round((studentCount / maxStudents) * 100) : null
        return (
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground">
              <span>{c?.users || 0} users</span>
              <span className="mx-1">&middot;</span>
              <span>{studentCount} students</span>
              <span className="mx-1">&middot;</span>
              <span>{c?.teachers || 0} teachers</span>
            </div>
            {pct !== null && (
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-20 rounded-full bg-muted">
                  <div
                    className={`h-1.5 rounded-full ${pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-yellow-500' : 'bg-emerald-500'}`}
                    style={{ width: `${Math.min(100, pct)}%` }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">{pct}%</span>
              </div>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => (
        <StatusBadge
          status={row.original.isActive ? 'ACTIVE' : 'SUSPENDED'}
          size="sm"
        />
      ),
    },
    {
      accessorKey: 'createdAt',
      header: ({ column }) => <SortableHeader column={column}>Registered</SortableHeader>,
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => router.push(`/platform/schools/${row.original.id}`)}>
              <Eye className="mr-2 h-4 w-4" /> View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openEdit(row.original)}>
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={async () => {
              setAdminSwitchTarget(row.original)
              setUseManualAdmin(false)
              setGoogleAccount(null)
              setAdminSwitchForm({ adminEmail: '', adminPassword: '', adminFirstName: '', adminLastName: '', adminGoogleId: '' })
              
              setCurrentAdmin(null)
              setLoadingAdmin(true)
              try {
                const res = await api.get(`/platform/schools/${row.original.id}/admin`)
                if (res.success && res.data) {
                  setCurrentAdmin(res.data)
                  setAdminSwitchForm({
                    adminEmail: res.data.email,
                    adminFirstName: res.data.firstName,
                    adminLastName: res.data.lastName,
                    adminPassword: '',
                    adminGoogleId: res.data.hasGoogleLogin ? 'existing' : ''
                  })
                  if (!res.data.hasGoogleLogin) {
                    setUseManualAdmin(true)
                  }
                }
              } finally {
                setLoadingAdmin(false)
              }
            }}>
              <UserCog className="mr-2 h-4 w-4" /> Manage Admin Login
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => handleImpersonate(row.original)}
              disabled={!row.original.isActive}
            >
              <LogIn className="mr-2 h-4 w-4" /> Impersonate
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleToggle(row.original)}>
              <Power className="mr-2 h-4 w-4" />
              {row.original.isActive ? 'Suspend School' : 'Activate School'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={() => setDeleteTarget(row.original)}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Schools"
        description={`Manage all schools on the platform (${totalSchools} total)`}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportCSV} disabled={schools.length === 0}>
              <Download className="mr-2 h-4 w-4" /> Export CSV
            </Button>
            <Button onClick={() => { resetForm(); setDialogOpen(true) }}>
              <Plus className="mr-2 h-4 w-4" /> Add School
            </Button>
          </div>
        }
      />

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search schools..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Suspended</SelectItem>
          </SelectContent>
        </Select>
        <Select value={planFilter} onValueChange={setPlanFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Plan" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Plans</SelectItem>
            <SelectItem value="none">No Plan</SelectItem>
            {plans.map((p) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            <X className="mr-1 h-3 w-3" /> Clear
          </Button>
        )}
      </div>

      {/* Table */}
      <Card>
        <CardBody className="p-0">
          <DataTable
            columns={columns}
            data={schools}
            isLoading={loading}
            onRowClick={(school: School) => router.push(`/platform/schools/${school.id}`)}
            emptyMessage={hasFilters ? 'No schools match the current filters.' : 'No schools yet. Create your first school!'}
          />
        </CardBody>
      </Card>

      {/* Delete Confirmation AlertDialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete School</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to permanently delete <strong>&ldquo;{deleteTarget?.name}&rdquo;</strong>?
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

      {/* Manage Admin Dialog */}
      <Dialog open={!!adminSwitchTarget} onOpenChange={(open) => { if (!open) setAdminSwitchTarget(null) }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Manage School Admin</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Update the primary super admin credentials for <strong>{adminSwitchTarget?.name}</strong>. Provide a Google account OR a new email and password.
            </p>

            <div className="bg-muted/50 rounded-lg p-4 mb-6 border">
              {loadingAdmin ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <div className="h-4 w-4 rounded-full border-2 border-primary border-t-transparent animate-spin"/> Loading current credentials...
                </div>
              ) : currentAdmin ? (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Current Connected System</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-foreground">{currentAdmin.firstName} {currentAdmin.lastName}</p>
                      <p className="text-sm text-muted-foreground">{currentAdmin.email}</p>
                    </div>
                    <Badge variant={currentAdmin.hasGoogleLogin ? 'default' : 'secondary'}>
                      {currentAdmin.hasGoogleLogin ? 'Google Connected' : 'Email/Password'}
                    </Badge>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No admin credentials found.</p>
              )}
            </div>

            <div className="flex justify-end mb-4">
              <Button variant="outline" size="sm" onClick={() => setUseManualAdmin(!useManualAdmin)} type="button">
                {useManualAdmin ? 'Use Google instead' : 'Use email/password'}
              </Button>
            </div>

            {!useManualAdmin ? (
              <div className="space-y-4">
                <GoogleAccountPicker 
                  account={googleAccount}
                  onChange={(acc) => {
                    setGoogleAccount(acc)
                    if (acc) {
                      setAdminSwitchForm({
                        ...adminSwitchForm,
                        adminEmail: acc.email,
                        adminFirstName: acc.name.split(' ')[0] || '',
                        adminLastName: acc.name.split(' ').slice(1).join(' ') || '',
                        adminGoogleId: acc.googleId,
                        adminPassword: '' // Clear password when switching to Google
                      })
                    }
                  }}
                />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid gap-2">
                  <Label>Admin Email *</Label>
                  <Input 
                    type="email" 
                    value={adminSwitchForm.adminEmail} 
                    onChange={(e) => setAdminSwitchForm({ ...adminSwitchForm, adminEmail: e.target.value, adminGoogleId: '' })} 
                    placeholder="admin@school.com" 
                  />
                </div>
                
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="admin-password">
                      {currentAdmin?.hasPassword ? 'New Password' : 'Set Password'}
                    </Label>
                    {currentAdmin?.hasPassword && (
                      <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Leave blank to keep current</span>
                    )}
                  </div>
                  <Input 
                    id="admin-password"
                    type="password" 
                    value={adminSwitchForm.adminPassword} 
                    onChange={(e) => setAdminSwitchForm({ ...adminSwitchForm, adminPassword: e.target.value })} 
                    placeholder={currentAdmin?.hasPassword ? "Enter new password" : "Enter password (min 6 chars)"} 
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label>First Name</Label>
                    <Input 
                      value={adminSwitchForm.adminFirstName} 
                      onChange={(e) => setAdminSwitchForm({ ...adminSwitchForm, adminFirstName: e.target.value })} 
                      placeholder="First Name" 
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Last Name</Label>
                    <Input 
                      value={adminSwitchForm.adminLastName} 
                      onChange={(e) => setAdminSwitchForm({ ...adminSwitchForm, adminLastName: e.target.value })} 
                      placeholder="Last Name" 
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdminSwitchTarget(null)}>Cancel</Button>
            <Button onClick={handleAdminSwitch} disabled={adminSwitchSaving || !adminSwitchForm.adminEmail || (!adminSwitchForm.adminPassword && !currentAdmin?.hasPassword && !adminSwitchForm.adminGoogleId)}>
              {adminSwitchSaving ? 'Saving...' : 'Update Admin Credentials'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit School' : 'Add New School'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>School Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({
                    ...form,
                    name: e.target.value,
                    ...(!editing ? { slug: slugify(e.target.value), code: codeify(e.target.value) } : {}),
                  })}
                  placeholder="International School"
                />
              </div>
              <div className="grid gap-2">
                <Label>Slug *</Label>
                <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="international-school" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Code *</Label>
                <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="IS-001" />
              </div>
              <div className="grid gap-2">
                <Label>Subscription Plan</Label>
                <Select value={form.subscriptionPlanId} onValueChange={(v) => setForm({ ...form, subscriptionPlanId: v })}>
                  <SelectTrigger><SelectValue placeholder="Select plan" /></SelectTrigger>
                  <SelectContent>
                    {plans.map((p) => <SelectItem key={p.id} value={p.id}>{p.name} (PKR {p.price}/mo)</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="info@school.com" />
              </div>
              <div className="grid gap-2">
                <Label>Phone</Label>
                <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+1234567890" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Address</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="123 Education Lane" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Domain</Label>
                <Input value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value })} placeholder="school.example.com" />
              </div>
              <div className="grid gap-2">
                <Label>Website</Label>
                <Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://school.com" />
              </div>
            </div>

            {/* Admin User Creation (only for new schools) */}
            {!editing && (
              <>
                <div className="mt-2 border-t border-border pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="text-sm font-semibold text-foreground">School Admin Account</h3>
                      <p className="text-xs text-muted-foreground">Select a Google account to become the super admin.</p>
                    </div>
                    <Button variant="link" size="sm" onClick={() => setUseManualAdmin(!useManualAdmin)} type="button">
                      {useManualAdmin ? 'Use Google instead' : 'Use email/password'}
                    </Button>
                  </div>
                </div>

                {!useManualAdmin ? (
                  <div className="mb-4">
                    <GoogleAccountPicker 
                      account={googleAccount}
                      onChange={(acc) => {
                        setGoogleAccount(acc)
                        if (acc) {
                          setForm({
                            ...form,
                            adminEmail: acc.email,
                            adminFirstName: acc.name.split(' ')[0] || '',
                            adminLastName: acc.name.split(' ').slice(1).join(' ') || '',
                            adminGoogleId: acc.googleId,
                            adminPassword: ''
                          })
                        } else {
                          setForm({ ...form, adminEmail: '', adminFirstName: '', adminLastName: '', adminGoogleId: '' })
                        }
                      }}
                    />
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label>Admin Email</Label>
                        <Input type="email" value={form.adminEmail} onChange={(e) => setForm({ ...form, adminEmail: e.target.value, adminGoogleId: '' })} placeholder="admin@school.com" />
                      </div>
                      <div className="grid gap-2">
                        <Label>Admin Password</Label>
                        <Input type="password" value={form.adminPassword} onChange={(e) => setForm({ ...form, adminPassword: e.target.value })} placeholder="Min 6 characters" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div className="grid gap-2">
                        <Label>First Name</Label>
                        <Input value={form.adminFirstName} onChange={(e) => setForm({ ...form, adminFirstName: e.target.value })} placeholder="Admin" />
                      </div>
                      <div className="grid gap-2">
                        <Label>Last Name</Label>
                        <Input value={form.adminLastName} onChange={(e) => setForm({ ...form, adminLastName: e.target.value })} placeholder="User" />
                      </div>
                    </div>
                  </>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button onClick={handleSave} disabled={saving || !form.name || !form.slug || !form.code}>
              {saving ? 'Saving...' : editing ? 'Update School' : 'Create School'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
