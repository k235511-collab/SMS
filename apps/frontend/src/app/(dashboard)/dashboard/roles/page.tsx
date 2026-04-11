'use client'

import { useEffect, useState, useCallback } from 'react'
import { ProtectedRoute, PermissionGate } from '@/components/auth'
import { useAuth } from '@/context/auth-context'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api-client'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Shield, MoreHorizontal, Plus } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'

interface Role {
  id: string
  name: string
  description?: string
  isSystem: boolean
  userCount: number
}

interface Permission {
  id: string
  name: string
  slug: string
  module: string
}

export default function RolesPage() {
  const HIDDEN_PERMISSION_MODULES = new Set([
    'assignment',
    'assignments',
    'audit',
    'backup',
    'feature-flag',
    'feature-flags',
    'feature_flag',
    'feature_flags',
    'library',
    'notification',
    'notifications',
    'platform',
    'plateform',
    'schools',
    'transport',
    'campuses',
    'parents',
    'parent',
  ])

  const [roles, setRoles] = useState<Role[]>([])
  const [allPermissions, setAllPermissions] = useState<Permission[]>([])
  const [loading, setLoading] = useState(true)
  const [permDialogOpen, setPermDialogOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<Role | null>(null)
  const [saving, setSaving] = useState(false)
  const [selectedPermIds, setSelectedPermIds] = useState<Set<string>>(new Set())

  // Create role state
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({ name: '', slug: '', description: '' })
  const [creatingSaving, setCreatingSaving] = useState(false)
  const { hasRole } = useAuth()
  const isSuperAdmin = hasRole('super_admin')

  const [defaultLoading, setDefaultLoading] = useState(false)

  const fetchRoles = useCallback(async () => {
    setLoading(true)
    const res = await api.get<any>('/roles')
    if (res.success && res.data) {
      let rolesData = res.data.data || res.data
      if (Array.isArray(rolesData)) {
        rolesData = rolesData.filter((r: any) => r.slug !== 'student' && r.slug !== 'super_admin')
      }
      setRoles(Array.isArray(rolesData) ? rolesData : [])
    }
    setLoading(false)
  }, [])

  const fetchPermissions = useCallback(async () => {
    const res = await api.get<Permission[]>('/permissions')
    if (res.success && res.data) {
      setAllPermissions(Array.isArray(res.data) ? res.data : [])
    }
  }, [])

  useEffect(() => {
    fetchRoles()
    fetchPermissions()
  }, [fetchRoles, fetchPermissions])

  const openPermissions = async (role: Role) => {
    setSelectedRole(role)
    const res = await api.get<{ permissions: { permissionId: string; permission?: { id: string } }[] }>(`/roles/${role.id}`)
    if (res.success && res.data) {
      const permIds = new Set(
        (res.data.permissions || []).map((rp) => rp.permission?.id || (rp as any).permissionId).filter(Boolean),
      )
      setSelectedPermIds(permIds)
      setPermDialogOpen(true)
    }
  }

  const handleSavePermissions = async () => {
    if (!selectedRole) return
    setSaving(true)
    try {
      const visiblePermissionIds = new Set(
        allPermissions
          .filter((p) => !HIDDEN_PERMISSION_MODULES.has((p.module || '').toLowerCase()))
          .map((p) => p.id),
      )

      const res = await api.post(`/roles/${selectedRole.id}/permissions`, {
        permissionIds: Array.from(selectedPermIds).filter((id) => visiblePermissionIds.has(id)),
      })
      if (res.success) {
        toast.success('Permissions updated')
        setPermDialogOpen(false)
      } else {
        toast.error(res.message || 'Failed to save permissions')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleCreateRole = async () => {
    if (!createForm.name || !createForm.slug) return
    setCreatingSaving(true)
    try {
      const res = await api.post('/roles', {
        name: createForm.name,
        slug: createForm.slug,
        description: createForm.description || undefined,
      })
      if (res.success) {
        toast.success('Role created successfully')
        setCreateOpen(false)
        setCreateForm({ name: '', slug: '', description: '' })
        fetchRoles()
      } else {
        toast.error(res.message || 'Failed to create role')
      }
    } finally {
      setCreatingSaving(false)
    }
  }

  const handleSetDefault = async () => {
    if (!selectedRole) return
    setDefaultLoading(true)
    try {
      const res = await api.post(`/roles/${selectedRole.id}/default`, {})
      if (res.success) {
        toast.success('Current permissions saved as default for this role')
      } else {
        toast.error(res.message || 'Failed to set default permissions')
      }
    } finally {
      setDefaultLoading(false)
    }
  }

  const handleRestoreDefault = async () => {
    if (!selectedRole) return
    setDefaultLoading(true)
    try {
      const res = await api.patch(`/roles/${selectedRole.id}/default`, {})
      if (res.success) {
        toast.success('Permissions restored from defaults')
        // Refresh currently selected permissions
        await openPermissions(selectedRole)
      } else {
        toast.error(res.message || 'Failed to restore default permissions')
      }
    } finally {
      setDefaultLoading(false)
    }
  }

  const togglePermission = (id: string) => {
    const next = new Set(selectedPermIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedPermIds(next)
  }

  const toggleModule = (module: string) => {
    const modulePerms = allPermissions.filter(
      (p) => p.module === module && !HIDDEN_PERMISSION_MODULES.has((p.module || '').toLowerCase()),
    )
    const allSelected = modulePerms.every((p) => selectedPermIds.has(p.id))
    const next = new Set(selectedPermIds)
    modulePerms.forEach((p) => {
      if (allSelected) next.delete(p.id)
      else next.add(p.id)
    })
    setSelectedPermIds(next)
  }

  const permissionsByModule = allPermissions
    .filter((p) => !HIDDEN_PERMISSION_MODULES.has((p.module || '').toLowerCase()))
    .reduce<Record<string, Permission[]>>((acc, p) => {
      if (!acc[p.module]) acc[p.module] = []
      acc[p.module].push(p)
      return acc
    }, {})

  const columns: ColumnDef<Role, unknown>[] = [
    {
      accessorKey: 'name',
      header: 'Role Name',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{row.getValue('name')}</span>
        </div>
      ),
    },
    {
      accessorKey: 'description',
      header: 'Description',
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <PermissionGate permission="roles:update">
              <DropdownMenuItem onClick={() => openPermissions(row.original)}>
                <Shield className="mr-2 h-4 w-4" />
                Permissions
              </DropdownMenuItem>
            </PermissionGate>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ]

  return (
    <ProtectedRoute permission="roles:read">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Roles & Permissions</h1>
            <p className="text-muted-foreground">
              Manage custom roles and assign granular permissions.
            </p>
          </div>
          <PermissionGate permission="roles:create">
            <Button onClick={() => { setCreateForm({ name: '', slug: '', description: '' }); setCreateOpen(true) }}>
              <Plus className="mr-2 h-4 w-4" />
              Create Role
            </Button>
          </PermissionGate>
        </div>

        <DataTable
          columns={columns}
          data={roles}
          isLoading={loading}
          emptyMessage="No roles found."
        />

        <Dialog open={permDialogOpen} onOpenChange={setPermDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Granular Permissions: {selectedRole?.name}</DialogTitle>
              <DialogDescription>
                Assign specific module permissions to this role.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {Object.entries(permissionsByModule).map(([module, perms]) => {
                const moduleSelected = perms.every((p) => selectedPermIds.has(p.id))
                const someSelected = perms.some((p) => selectedPermIds.has(p.id))

                return (
                  <div key={module} className="border border-border rounded-lg overflow-hidden">
                    <div className="bg-muted px-4 py-2 border-b border-border flex items-center justify-between">
                      <h3 className="text-sm font-semibold capitalize">{module}</h3>
                      <div className="flex items-center gap-2">
                        <Label htmlFor={`module-${module}`} className="text-xs">Select All</Label>
                        <input
                          type="checkbox"
                          id={`module-${module}`}
                          checked={moduleSelected}
                          className="h-4 w-4 rounded border-border text-primary-600"
                          onChange={() => toggleModule(module)}
                          ref={(el) => { if (el) el.indeterminate = someSelected && !moduleSelected }}
                        />
                      </div>
                    </div>
                    <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                      {perms.map((p) => (
                        <div key={p.id} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            id={p.id}
                            checked={selectedPermIds.has(p.id)}
                            onChange={() => togglePermission(p.id)}
                            className="h-4 w-4 rounded border-border text-primary-600"
                          />
                          <Label htmlFor={p.id} className="text-xs font-normal cursor-pointer leading-tight">
                            {p.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <div className="flex flex-1 gap-2">
                {isSuperAdmin && (
                  <Button
                    variant="outline"
                    onClick={handleSetDefault}
                    disabled={defaultLoading || saving}
                    title="Set current permissions as default baseline for this campus"
                  >
                    Set as Default
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={handleRestoreDefault}
                  disabled={defaultLoading || saving}
                  title="Restore permissions from the saved default baseline"
                >
                  Restore Defaults
                </Button>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setPermDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSavePermissions} isLoading={saving} disabled={defaultLoading}>
                  Save Changes
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Create Role Dialog */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create Role</DialogTitle>
              <DialogDescription>
                Add a new custom role to your school.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label>Role Name *</Label>
                <Input
                  value={createForm.name}
                  onChange={(e) => {
                    const name = e.target.value
                    const slug = name.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '')
                    setCreateForm({ ...createForm, name, slug })
                  }}
                  placeholder="e.g. Senior Teacher"
                />
              </div>
              <div className="grid gap-2">
                <Label>Slug *</Label>
                <Input
                  value={createForm.slug}
                  onChange={(e) => setCreateForm({ ...createForm, slug: e.target.value })}
                  placeholder="e.g. senior_teacher"
                />
                <p className="text-xs text-muted-foreground">Auto-generated from name. Must be unique.</p>
              </div>
              <div className="grid gap-2">
                <Label>Description</Label>
                <Input
                  value={createForm.description}
                  onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
                  placeholder="Optional description"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button onClick={handleCreateRole} disabled={!createForm.name || !createForm.slug || creatingSaving}>
                {creatingSaving ? 'Creating...' : 'Create Role'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  )
}
