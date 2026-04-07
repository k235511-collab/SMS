'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardBody } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { StatusBadge } from '@/components/ui/status-badge'
import { PageHeader } from '@/components/ui/page-header'
import { PageLoader } from '@/components/ui/page-loader'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { api } from '@/lib/api-client'
import { Plus, Pencil, Trash2, MoreHorizontal } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { useConfirmDialog } from '@/hooks/useConfirmDialog'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'

interface Plan {
  id: string
  name: string
  slug: string
  price: number
  maxStudents: number
  maxTeachers: number
  maxCampuses: number
  features: string[]
  isActive: boolean
  durationDays?: number | null
  createdAt: string
  _count?: { schools: number }
}

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')

export default function PlatformPlansPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Plan | null>(null)
  const [saving, setSaving] = useState(false)
  const [featuresText, setFeaturesText] = useState('')

  const [form, setForm] = useState({
    name: '', slug: '', price: 0, maxStudents: 100, maxTeachers: 20, maxCampuses: 1, isActive: true,
    durationDays: 0,
    applyToExisting: false,
  })

  const fetchPlans = useCallback(async () => {
    setLoading(true)
    const res = await api.get<any>('/platform/plans')
    if (res.success && res.data) {
      const d = Array.isArray(res.data) ? res.data : res.data.data || []
      setPlans(d)
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchPlans() }, [fetchPlans])

  const resetForm = () => {
    setEditing(null)
    setForm({ name: '', slug: '', price: 0, maxStudents: 100, maxTeachers: 20, maxCampuses: 1, isActive: true, durationDays: 0, applyToExisting: false })
    setFeaturesText('')
  }

  const openEdit = (plan: Plan) => {
    setEditing(plan)
    setForm({
      name: plan.name,
      slug: plan.slug,
      price: plan.price ?? 0,
      maxStudents: plan.maxStudents ?? 100,
      maxTeachers: plan.maxTeachers ?? 20,
      maxCampuses: plan.maxCampuses ?? 1,
      isActive: plan.isActive,
      durationDays: plan.durationDays ?? 0,
      applyToExisting: false,
    })
    setFeaturesText((plan.features || []).join('\n'))
    setDialogOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    const body = { 
      ...form, 
      features: featuresText.split('\n').map(s => s.trim()).filter(Boolean),
      durationDays: form.durationDays > 0 ? form.durationDays : null 
    }
    try {
      if (editing) {
        // Exclude slug when editing to avoid backend validation errors
        const { slug, ...updateBody } = body
        const res = await api.patch(`/platform/plans/${editing.id}`, updateBody)
        if (res.success) { toast.success('Plan updated'); setDialogOpen(false); fetchPlans() }
        else toast.error(res.message || 'Failed')
      } else {
        const res = await api.post('/platform/plans', body)
        if (res.success) { toast.success('Plan created'); setDialogOpen(false); fetchPlans() }
        else toast.error(res.message || 'Failed')
      }
    } finally { setSaving(false) }
  }

  const confirmDialog = useConfirmDialog()

  const handleDelete = async (plan: Plan) => {
    confirmDialog.showConfirm(
      'Delete Plan',
      `Delete "${plan.name}"? This cannot be undone.`,
      async () => {
        const res = await api.delete(`/platform/plans/${plan.id}`)
        if (res.success) { toast.success('Plan deleted'); fetchPlans() }
        else toast.error(res.message || 'Cannot delete — schools are using this plan')
      },
      true,
    )
  }

  const totalRevenue = plans.reduce((sum, p) => sum + p.price * (p._count?.schools || 0), 0)

  const columns: ColumnDef<Plan>[] = [
    {
      accessorKey: 'name',
      header: 'Plan',
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-foreground">{row.original.name}</p>
          <p className="text-xs text-muted-foreground">{row.original.slug}</p>
        </div>
      ),
    },
    {
      accessorKey: 'price',
      header: 'Price',
      cell: ({ row }) => (
        <div>
          {row.original.price === 0 ? (
            <span className="font-bold text-emerald-600">FREE</span>
          ) : (
            <span className="font-semibold text-foreground">PKR {row.original.price}/mo</span>
          )}
          <p className="text-[10px] text-muted-foreground">
            {row.original.durationDays ? `${row.original.durationDays} days` : 'Lifetime'}
          </p>
        </div>
      ),
    },
    {
      id: 'limits',
      header: 'Limits',
      cell: ({ row }) => (
        <div className="text-xs text-muted-foreground">
          {row.original.maxStudents} students · {row.original.maxTeachers} teachers · {row.original.maxCampuses} campuses
        </div>
      ),
    },
    {
      id: 'schools',
      header: 'Schools',
      cell: ({ row }) => <Badge variant="secondary">{row.original._count?.schools || 0}</Badge>,
    },
    {
      id: 'revenue',
      header: 'MRR',
      cell: ({ row }) => (
        <span className="text-sm font-medium text-emerald-600">
          PKR {(row.original.price * (row.original._count?.schools || 0)).toLocaleString()}
        </span>
      ),
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => (
        <StatusBadge
          status={row.original.isActive ? 'ACTIVE' : 'INACTIVE'}
          size="sm"
        />
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => openEdit(row.original)}>
              <Pencil className="mr-2 h-4 w-4" /> Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(row.original)}>
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
        title="Subscription Plans"
        description={`${plans.length} plans · Estimated MRR: PKR ${totalRevenue.toLocaleString()}`}
        actions={
          <Button onClick={() => { resetForm(); setDialogOpen(true) }}>
            <Plus className="mr-2 h-4 w-4" /> Add Plan
          </Button>
        }
      />

      <Card>
        <CardBody className="p-0">
          {loading ? (
            <PageLoader message="Loading plans..." />
          ) : (
            <DataTable columns={columns} data={plans} />
          )}
        </CardBody>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Plan' : 'Add Subscription Plan'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Plan Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value, ...(!editing ? { slug: slugify(e.target.value) } : {}) })}
                  placeholder="Pro Plan"
                />
              </div>
              <div className="grid gap-2">
                <Label>Slug</Label>
                <Input value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} placeholder="pro-plan" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Price (PKR/month) *</Label>
                <div className="relative">
                  <Input 
                    type="number" 
                    value={form.price} 
                    onChange={(e) => setForm({ ...form, price: e.target.value === '' ? 0 : +e.target.value })} 
                    placeholder="0 for Free Plan"
                  />
                  {form.price === 0 && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded dark:bg-emerald-950 dark:text-emerald-400">
                      FREE
                    </div>
                  )}
                </div>
              </div>
              <div className="grid gap-2">
                <Label>Max Campuses</Label>
                <Input type="number" value={form.maxCampuses} onChange={(e) => setForm({ ...form, maxCampuses: +e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Max Students</Label>
                <Input type="number" value={form.maxStudents} onChange={(e) => setForm({ ...form, maxStudents: +e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Duration (days)</Label>
                <Input type="number" value={form.durationDays} onChange={(e) => setForm({ ...form, durationDays: +e.target.value })} placeholder="0 for lifetime" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Max Teachers</Label>
                <Input type="number" value={form.maxTeachers} onChange={(e) => setForm({ ...form, maxTeachers: +e.target.value })} />
              </div>
            </div>

            {editing && (
              <div className="flex items-start space-x-3 p-3 rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50">
                <Checkbox 
                  id="applyToExisting" 
                  checked={form.applyToExisting} 
                  onCheckedChange={(checked) => setForm({ ...form, applyToExisting: !!checked })}
                />
                <div className="grid gap-1.5 leading-none">
                  <label
                    htmlFor="applyToExisting"
                    className="text-sm font-medium leading-none cursor-pointer text-amber-900 dark:text-amber-200"
                  >
                    Sync expiry dates for existing schools?
                  </label>
                  <p className="text-xs text-amber-700/80 dark:text-amber-400/80">
                    This will immediately recalculate and update all current schools on this plan based on their creation date and the new duration.
                  </p>
                </div>
              </div>
            )}

            <div className="grid gap-2">
              <Label>Features (one per line)</Label>
              <Textarea
                className="min-h-[100px]"
                value={featuresText}
                onChange={(e) => setFeaturesText(e.target.value)}
                placeholder={"Unlimited Classrooms\nSMS Notifications\nAPI Access"}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleSave} disabled={saving || !form.name || !form.slug}>
              {saving ? 'Saving...' : editing ? 'Update Plan' : 'Create Plan'}
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
    </div>
  )
}
