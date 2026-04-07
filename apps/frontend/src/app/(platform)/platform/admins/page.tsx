'use client'

import { useEffect, useState, useCallback } from 'react'
import { Card, CardBody } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
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
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { PageHeader } from '@/components/ui/page-header'
import { PageLoader } from '@/components/ui/page-loader'
import { StatusBadge } from '@/components/ui/status-badge'
import { UserAvatar } from '@/components/ui/user-avatar'
import { api } from '@/lib/api-client'
import { Plus, Power, MoreHorizontal } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'

interface PlatformAdmin {
  id: string
  email: string
  firstName?: string
  lastName?: string
  isActive: boolean
  lastLoginAt?: string
  createdAt: string
}

export default function PlatformAdminsPage() {
  const [admins, setAdmins] = useState<PlatformAdmin[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '' })

  const fetchAdmins = useCallback(async () => {
    setLoading(true)
    const res = await api.get<PlatformAdmin[]>('/platform/admins')
    if (res.success && res.data) {
      setAdmins(Array.isArray(res.data) ? res.data : [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchAdmins() }, [fetchAdmins])

  const handleCreate = async () => {
    setSaving(true)
    try {
      const res = await api.post('/platform/admins', form)
      if (res.success) {
        toast.success('Platform admin created')
        setDialogOpen(false)
        setForm({ email: '', password: '', firstName: '', lastName: '' })
        fetchAdmins()
      } else {
        toast.error(res.message || 'Failed to create')
      }
    } finally { setSaving(false) }
  }

  const handleToggle = async (admin: PlatformAdmin) => {
    const res = await api.patch(`/platform/admins/${admin.id}/toggle-status`, {})
    if (res.success) {
      toast.success(`Admin ${admin.isActive ? 'disabled' : 'enabled'}`)
      fetchAdmins()
    }
  }

  const columns: ColumnDef<PlatformAdmin>[] = [
    {
      accessorKey: 'name',
      header: 'Admin',
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <UserAvatar
            firstName={row.original.firstName}
            lastName={row.original.lastName}
            size="md"
          />
          <div>
            <p className="font-medium text-foreground">
              {row.original.firstName} {row.original.lastName}
            </p>
            <p className="text-xs text-muted-foreground">{row.original.email}</p>
          </div>
        </div>
      ),
    },
    {
      accessorKey: 'isActive',
      header: 'Status',
      cell: ({ row }) => (
        <StatusBadge
          status={row.original.isActive ? 'ACTIVE' : 'INACTIVE'}
          label={row.original.isActive ? 'Active' : 'Disabled'}
          size="sm"
        />
      ),
    },
    {
      accessorKey: 'lastLoginAt',
      header: 'Last Login',
      cell: ({ row }) =>
        row.original.lastLoginAt
          ? new Date(row.original.lastLoginAt).toLocaleString()
          : <span className="text-muted-foreground">Never</span>,
    },
    {
      accessorKey: 'createdAt',
      header: 'Created',
      cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString(),
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleToggle(row.original)}>
              <Power className="mr-2 h-4 w-4" />
              {row.original.isActive ? 'Disable Admin' : 'Enable Admin'}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Users"
        description={`Manage platform administrator accounts (${admins.length} total)`}
        actions={
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Add Admin
          </Button>
        }
      />

      <Card>
        <CardBody className="p-0">
          {loading ? (
            <PageLoader message="Loading admins..." />
          ) : (
            <DataTable columns={columns} data={admins} />
          )}
        </CardBody>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add Platform Admin</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Email *</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="admin@platform.com" />
            </div>
            <div className="grid gap-2">
              <Label>Password *</Label>
              <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min 6 characters" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>First Name</Label>
                <Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>Last Name</Label>
                <Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleCreate} disabled={saving || !form.email || !form.password}>
              {saving ? 'Creating...' : 'Create Admin'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
