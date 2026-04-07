'use client'

import { useEffect, useState, useCallback } from 'react'
import { PlatformOnly } from '@/components/auth'
import { DataTable, type ColumnDef, SortableHeader } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
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
} from '@/components/ui/dropdown-menu'
import { api } from '@/lib/api-client'
import { Plus, Search, MoreHorizontal, Pencil, Trash2, Power, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import { useConfirmDialog } from '@/hooks/useConfirmDialog'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

interface Plan {
  id: string
  name: string
  slug: string
}

interface School {
  id: string
  name: string
  slug: string
  code: string
  email?: string
  phone?: string
  address?: string
  isActive: boolean
  subscriptionPlanId?: string
  subscriptionPlan?: Plan
  createdAt: string
  _count?: { users: number; students: number }
}

export default function PlatformSchoolsPage() {
  const [schools, setSchools] = useState<School[]>([])
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingSchool, setEditingSchool] = useState<School | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '', slug: '', code: '', email: '', phone: '', address: '', subscriptionPlanId: '',
  })

  const fetchSchools = useCallback(async () => {
    setLoading(true)
    const res = await api.get<School[]>('/platform/schools')
    if (res.success && res.data) {
      setSchools(Array.isArray(res.data) ? res.data : [])
    }
    setLoading(false)
  }, [])

  const fetchPlans = useCallback(async () => {
    const res = await api.get<Plan[]>('/platform/plans')
    if (res.success && res.data) {
      setPlans(Array.isArray(res.data) ? res.data : [])
    }
  }, [])

  useEffect(() => {
    fetchSchools()
    fetchPlans()
  }, [fetchSchools, fetchPlans])

  const openCreate = () => {
    setEditingSchool(null)
    setForm({ name: '', slug: '', code: '', email: '', phone: '', address: '', subscriptionPlanId: '' })
    setDialogOpen(true)
  }

  const openEdit = (school: School) => {
    setEditingSchool(school)
    setForm({
      name: school.name,
      slug: school.slug,
      code: school.code,
      email: school.email || '',
      phone: school.phone || '',
      address: school.address || '',
      subscriptionPlanId: school.subscriptionPlanId || '',
    })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const body = {
        name: form.name,
        slug: form.slug,
        code: form.code,
        email: form.email || undefined,
        phone: form.phone || undefined,
        address: form.address || undefined,
        subscriptionPlanId: form.subscriptionPlanId || undefined,
      }
      const res = editingSchool
        ? await api.patch(`/platform/schools/${editingSchool.id}`, body)
        : await api.post('/platform/schools', body)
      if (res.success) {
        toast.success(editingSchool ? 'School updated' : 'School created')
        setDialogOpen(false)
        fetchSchools()
      } else {
        toast.error(res.message || 'Failed to save school')
      }
    } finally {
      setSaving(false)
    }
  }

  const confirmDialog = useConfirmDialog()

  const handleDelete = async (id: string) => {
    confirmDialog.showConfirm('Delete School', 'Are you sure you want to delete this school? This cannot be undone.', async () => {
      const res = await api.delete(`/platform/schools/${id}`)
      if (res.success) {
        toast.success('School deleted')
        fetchSchools()
      } else {
        toast.error(res.message || 'Failed to delete')
      }
    }, true)
  }

  const handleToggleStatus = async (school: School) => {
    const res = await api.patch(`/platform/schools/${school.id}/toggle-status`)
    if (res.success) {
      toast.success(`School ${school.isActive ? 'deactivated' : 'activated'}`)
      fetchSchools()
    } else {
      toast.error(res.message || 'Failed to toggle status')
    }
  }

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }

  const filteredSchools = search
    ? schools.filter(
        (s) =>
          s.name.toLowerCase().includes(search.toLowerCase()) ||
          s.slug.toLowerCase().includes(search.toLowerCase()) ||
          s.code.toLowerCase().includes(search.toLowerCase()),
      )
    : schools

  const columns: ColumnDef<School, unknown>[] = [
    {
      accessorKey: 'name',
      header: ({ column }) => <SortableHeader column={column}>Name</SortableHeader>,
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.name}</p>
          <p className="text-xs text-muted-foreground">{row.original.slug}</p>
        </div>
      ),
    },
    {
      accessorKey: 'code',
      header: 'Code',
    },
    {
      accessorKey: 'subscriptionPlan',
      header: 'Plan',
      cell: ({ row }) => (
        <Badge variant="secondary">
          {row.original.subscriptionPlan?.name || 'No Plan'}
        </Badge>
      ),
    },
    {
      accessorKey: 'email',
      header: 'Contact',
      cell: ({ row }) => (
        <div className="text-sm">
          <p>{row.original.email || '—'}</p>
          <p className="text-xs text-muted-foreground">{row.original.phone || ''}</p>
        </div>
      ),
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? 'default' : 'destructive'}>
          {row.original.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openEdit(row.original)}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleToggleStatus(row.original)}>
              <Power className="mr-2 h-4 w-4" />
              {row.original.isActive ? 'Deactivate' : 'Activate'}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => handleDelete(row.original.id)}
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <PlatformOnly fallback={<div className="p-8 text-center text-muted-foreground">Access denied</div>}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/platform">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Schools Management</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Manage all registered schools ({schools.length} total)
              </p>
            </div>
          </div>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add School
          </Button>
        </div>

        <DataTable
          columns={columns}
          data={filteredSchools}
          isLoading={loading}
          emptyMessage="No schools found."
          toolbar={
            <div className="flex items-center gap-4">
              <div className="relative max-w-sm flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search schools..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          }
        />
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingSchool ? 'Edit School' : 'Create School'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>School Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => {
                  const name = e.target.value
                  setForm({
                    ...form,
                    name,
                    slug: editingSchool ? form.slug : generateSlug(name),
                  })
                }}
                placeholder="Demo International School"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Slug *</Label>
                <Input
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="demo-school"
                />
              </div>
              <div className="grid gap-2">
                <Label>Code *</Label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                  placeholder="DEMO"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Subscription Plan</Label>
              <Select
                value={form.subscriptionPlanId}
                onValueChange={(v) => setForm({ ...form, subscriptionPlanId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a plan" />
                </SelectTrigger>
                <SelectContent>
                  {plans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="info@school.com"
                />
              </div>
              <div className="grid gap-2">
                <Label>Phone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+1234567890"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Address</Label>
              <Input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="123 Education Lane"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              onClick={handleSave}
              disabled={saving || !form.name || !form.slug || !form.code}
            >
              {saving ? 'Saving...' : editingSchool ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDialog.open}
        onOpenChange={confirmDialog.handleClose}
        title={confirmDialog.title}
        description={confirmDialog.description}
        variant={confirmDialog.variant}
        loading={confirmDialog.loading}
        onConfirm={confirmDialog.handleConfirm}
        confirmLabel="Delete"
      />
    </PlatformOnly>
  )
}
