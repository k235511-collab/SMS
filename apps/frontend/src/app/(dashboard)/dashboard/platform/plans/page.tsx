'use client'

import { useEffect, useState, useCallback } from 'react'
import { PlatformOnly } from '@/components/auth'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { api } from '@/lib/api-client'
import { Plus, MoreHorizontal, Pencil, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

interface Plan {
  id: string
  name: string
  slug: string
  price: number
  maxStudents: number | null
  maxTeachers: number | null
  maxCampuses: number | null
  isActive: boolean
  features: string[]
  createdAt: string
}

export default function PlatformPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '', slug: '', price: '', maxStudents: '', maxTeachers: '', maxCampuses: '', features: '',
  })

  const fetchPlans = useCallback(async () => {
    setLoading(true)
    const res = await api.get<Plan[]>('/platform/plans')
    if (res.success && res.data) {
      setPlans(Array.isArray(res.data) ? res.data : [])
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchPlans()
  }, [fetchPlans])

  const openCreate = () => {
    setEditingPlan(null)
    setForm({ name: '', slug: '', price: '', maxStudents: '', maxTeachers: '', maxCampuses: '', features: '' })
    setDialogOpen(true)
  }

  const openEdit = (plan: Plan) => {
    setEditingPlan(plan)
    setForm({
      name: plan.name,
      slug: plan.slug,
      price: plan.price.toString(),
      maxStudents: plan.maxStudents?.toString() || '',
      maxTeachers: plan.maxTeachers?.toString() || '',
      maxCampuses: plan.maxCampuses?.toString() || '',
      features: Array.isArray(plan.features) ? plan.features.join(', ') : '',
    })
    setDialogOpen(true)
  }

  const generateSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  const handleSave = async () => {
    setSaving(true)
    try {
      const body = {
        name: form.name,
        slug: form.slug,
        price: parseFloat(form.price) || 0,
        maxStudents: form.maxStudents ? parseInt(form.maxStudents) : null,
        maxTeachers: form.maxTeachers ? parseInt(form.maxTeachers) : null,
        maxCampuses: form.maxCampuses ? parseInt(form.maxCampuses) : null,
        features: form.features
          ? form.features.split(',').map((f) => f.trim()).filter(Boolean)
          : [],
      }
      const res = editingPlan
        ? await api.patch(`/platform/plans/${editingPlan.id}`, body)
        : await api.post('/platform/plans', body)
      if (res.success) {
        toast.success(editingPlan ? 'Plan updated' : 'Plan created')
        setDialogOpen(false)
        fetchPlans()
      } else {
        toast.error(res.message || 'Failed to save plan')
      }
    } finally {
      setSaving(false)
    }
  }

  const columns: ColumnDef<Plan, unknown>[] = [
    {
      accessorKey: 'name',
      header: 'Plan Name',
      cell: ({ row }) => (
        <div>
          <p className="font-medium">{row.original.name}</p>
          <p className="text-xs text-muted-foreground">{row.original.slug}</p>
        </div>
      ),
    },
    {
      accessorKey: 'price',
      header: 'Price',
      cell: ({ row }) => (
        <span className="font-semibold">
          {row.original.price === 0 ? 'Free' : `$${row.original.price}/mo`}
        </span>
      ),
    },
    {
      accessorKey: 'maxStudents',
      header: 'Max Students',
      cell: ({ row }) => row.original.maxStudents?.toLocaleString() || 'Unlimited',
    },
    {
      accessorKey: 'maxTeachers',
      header: 'Max Teachers',
      cell: ({ row }) => row.original.maxTeachers?.toLocaleString() || 'Unlimited',
    },
    {
      accessorKey: 'maxCampuses',
      header: 'Max Campuses',
      cell: ({ row }) => row.original.maxCampuses?.toLocaleString() || 'Unlimited',
    },
    {
      accessorKey: 'features',
      header: 'Features',
      cell: ({ row }) => (
        <div className="flex flex-wrap gap-1">
          {(Array.isArray(row.original.features) ? row.original.features : []).map((f) => (
            <Badge key={f} variant="secondary" className="text-xs">
              {f}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.isActive ? 'default' : 'secondary'}>
          {row.original.isActive ? 'Active' : 'Inactive'}
        </Badge>
      ),
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
              <h1 className="text-2xl font-bold text-foreground">Subscription Plans</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Manage subscription plans and pricing ({plans.length} plans)
              </p>
            </div>
          </div>
          <Button onClick={openCreate}>
            <Plus className="mr-2 h-4 w-4" />
            Add Plan
          </Button>
        </div>

        <DataTable
          columns={columns}
          data={plans}
          isLoading={loading}
          emptyMessage="No plans found. Create your first subscription plan."
        />
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingPlan ? 'Edit Plan' : 'Create Plan'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Plan Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => {
                    const name = e.target.value
                    setForm({ ...form, name, slug: editingPlan ? form.slug : generateSlug(name) })
                  }}
                  placeholder="Premium"
                />
              </div>
              <div className="grid gap-2">
                <Label>Slug *</Label>
                <Input
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  placeholder="premium"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Price ($/month) *</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.price}
                onChange={(e) => setForm({ ...form, price: e.target.value })}
                placeholder="99.99"
              />
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label>Max Students</Label>
                <Input
                  type="number"
                  value={form.maxStudents}
                  onChange={(e) => setForm({ ...form, maxStudents: e.target.value })}
                  placeholder="Unlimited"
                />
              </div>
              <div className="grid gap-2">
                <Label>Max Teachers</Label>
                <Input
                  type="number"
                  value={form.maxTeachers}
                  onChange={(e) => setForm({ ...form, maxTeachers: e.target.value })}
                  placeholder="Unlimited"
                />
              </div>
              <div className="grid gap-2">
                <Label>Max Campuses</Label>
                <Input
                  type="number"
                  value={form.maxCampuses}
                  onChange={(e) => setForm({ ...form, maxCampuses: e.target.value })}
                  placeholder="Unlimited"
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Features (comma-separated)</Label>
              <Input
                value={form.features}
                onChange={(e) => setForm({ ...form, features: e.target.value })}
                placeholder="attendance, exams, finance, audit"
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              onClick={handleSave}
              disabled={saving || !form.name || !form.slug}
            >
              {saving ? 'Saving...' : editingPlan ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PlatformOnly>
  )
}
