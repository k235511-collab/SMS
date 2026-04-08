'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSession } from '@/context/session-context'
import useCampusRefetch from '@/hooks/useCampusRefetch'
import { ProtectedRoute, PermissionGate } from '@/components/auth'
import { DataTable, type ColumnDef, SortableHeader } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { api } from '@/lib/api-client'
import { Plus, Search, MoreHorizontal, Pencil, Trash2, Mail, Phone, Loader2, KeyRound, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'
import { CampusBadge } from '@/components/campus-badge'
import { cn } from '@/lib/utils'

interface User { id: string; email: string; firstName: string; lastName: string; phone?: string; gender?: string; dateOfBirth?: string; bloodGroup?: string; address?: string; cnic?: string; profession?: string; qualification?: string; role?: { id: string; name: string; slug: string }; isActive: boolean; createdAt: string }
interface Role { id: string; name: string; slug: string }
interface PaginatedRes { data: User[]; meta: { total: number; page: number; pageSize: number; totalPages: number } }

const genderOptions = ['MALE', 'FEMALE', 'OTHER']

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [roles, setRoles] = useState<Role[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<User | null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleting, setDeleting] = useState<User | null>(null)
  const [resetOpen, setResetOpen] = useState(false)
  const [resetting, setResetting] = useState<User | null>(null)
  const [resettingLoading, setResettingLoading] = useState(false)
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null)
  const [copiedTemporaryPassword, setCopiedTemporaryPassword] = useState(false)
  const { campuses, selectedCampus, isCampusLocked } = useSession()

  const [form, setForm] = useState({ email: '', password: '', firstName: '', lastName: '', phone: '', roleId: '', gender: '', dateOfBirth: '', bloodGroup: '', address: '', cnic: '', profession: '', qualification: '', campusId: '' })

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    const res = await api.get<PaginatedRes>('/users', { params: { page, pageSize: 20, search: search || undefined } })
    if (res.success && res.data) { setUsers(res.data.data || []); setTotal(res.data.meta?.total || 0) }
    setLoading(false)
  }, [page, search, selectedCampus?.id])

  const fetchRoles = useCallback(async () => {
    const res = await api.get<any>('/roles')
    if (res.success && res.data) {
      const rolesData = res.data.data || res.data
      setRoles(Array.isArray(rolesData) ? rolesData : [])
    }
  }, [])

  // Refetch users when campus changes or other deps change
  useCampusRefetch(() => { setPage(1); fetchUsers() }, [page, search])
  useEffect(() => { fetchRoles() }, [fetchRoles])

  const openCreate = () => { setEditing(null); setForm({ email: '', password: '', firstName: '', lastName: '', phone: '', roleId: '', gender: '', dateOfBirth: '', bloodGroup: '', address: '', cnic: '', profession: '', qualification: '', campusId: selectedCampus?.id || '' }); setDialogOpen(true) }
  const openEdit = (u: User) => { setEditing(u); setForm({ email: u.email, password: '', firstName: u.firstName, lastName: u.lastName, phone: u.phone || '', roleId: u.role?.id || '', gender: u.gender || '', dateOfBirth: u.dateOfBirth ? u.dateOfBirth.slice(0, 10) : '', bloodGroup: u.bloodGroup || '', address: u.address || '', cnic: u.cnic || '', profession: u.profession || '', qualification: u.qualification || '', campusId: (u as any)?.campus?.id || selectedCampus?.id || '' }); setDialogOpen(true) }

  const handleSave = async () => {
    setSaving(true)
    try {
      const body: Record<string, unknown> = { email: form.email, firstName: form.firstName, lastName: form.lastName, phone: form.phone || undefined, roleId: form.roleId || undefined, gender: form.gender || undefined, dateOfBirth: form.dateOfBirth || undefined, bloodGroup: form.bloodGroup || undefined, address: form.address || undefined, cnic: form.cnic || undefined, profession: form.profession || undefined, qualification: form.qualification || undefined }
      if (form.password) body.password = form.password
      // Attach campusId explicitly when provided (super-admin can choose)
      if (form.campusId) body.campusId = form.campusId
      const res = editing ? await api.patch(`/users/${editing.id}`, body) : await api.post('/users', { ...body, password: form.password })
      if (res.success) { toast.success(editing ? 'User updated' : 'User created'); setDialogOpen(false); fetchUsers() }
      else toast.error(res.message || 'Failed')
    } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!deleting) return
    const res = await api.delete(`/users/${deleting.id}`)
    if (res.success) { toast.success('User deleted'); setDeleteOpen(false); setDeleting(null); fetchUsers() }
    else toast.error(res.message || 'Failed')
  }

  const handleResetPassword = async () => {
    if (!resetting) return
    setResettingLoading(true)
    setTemporaryPassword(null)
    setCopiedTemporaryPassword(false)
    try {
      const res = await api.post<{ temporaryPassword: string }>(`/users/${resetting.id}/reset-password`)
      if (res.success && res.data?.temporaryPassword) {
        setTemporaryPassword(res.data.temporaryPassword)
        toast.success('Temporary password generated')
      } else {
        toast.error(res.message || 'Failed to reset password')
      }
    } finally {
      setResettingLoading(false)
    }
  }

  const handleCopyTemporaryPassword = async () => {
    if (!temporaryPassword) return

    try {
      await navigator.clipboard.writeText(temporaryPassword)
      setCopiedTemporaryPassword(true)
      toast.success('Temporary password copied')
      window.setTimeout(() => setCopiedTemporaryPassword(false), 2000)
    } catch {
      toast.error('Failed to copy temporary password')
    }
  }

  const columns: ColumnDef<User, unknown>[] = [
    { accessorKey: 'firstName', header: ({ column }) => <SortableHeader column={column}>Name</SortableHeader>, cell: ({ row }) => `${row.original.firstName} ${row.original.lastName}` },
    { accessorKey: 'email', header: 'Email' },
    { accessorKey: 'phone', header: 'Phone', cell: ({ row }) => row.original.phone || '—' },
    { accessorKey: 'role', header: 'Role', cell: ({ row }) => row.original.role ? <Badge variant="outline">{row.original.role.name}</Badge> : '—' },
    { accessorKey: 'isActive', header: 'Status', cell: ({ row }) => <Badge variant={row.original.isActive ? 'default' : 'secondary'}>{row.original.isActive ? 'Active' : 'Inactive'}</Badge> },
    { accessorKey: 'createdAt', header: 'Joined', cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString() },
    {
      id: 'actions', header: '', cell: ({ row }) => (
        <PermissionGate permission="users:update">
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openEdit(row.original)}><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setResetting(row.original)
                  setTemporaryPassword(null)
                  setResetOpen(true)
                }}
              >
                <KeyRound className="mr-2 h-4 w-4" />
                Reset password
              </DropdownMenuItem>
              <PermissionGate permission="users:delete">
                <DropdownMenuItem className="text-destructive" onClick={() => { setDeleting(row.original); setDeleteOpen(true) }}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
              </PermissionGate>
            </DropdownMenuContent>
          </DropdownMenu>
        </PermissionGate>
      )
    },
  ]

  return (
    <ProtectedRoute permission="users:read">
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Users</h1>
            <p className="mt-1 text-sm text-muted-foreground">Manage user accounts and roles ({total} total)</p>
          </div>
          <PermissionGate permission="users:create">
            <Button onClick={openCreate} className="w-full sm:w-auto"><Plus className="mr-2 h-4 w-4" />Add User</Button>
          </PermissionGate>
        </div>
        
        <div className="hidden sm:block">
          <DataTable columns={columns} data={users} isLoading={loading} emptyMessage="No users found."
            toolbar={<div className="relative max-w-sm"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Search users..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="pl-9" /></div>}
          />
        </div>

        <div className="sm:hidden space-y-4 pb-24">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search users..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="pl-9 bg-muted/20" />
          </div>
          
          {loading ? (
             <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary/60" /></div>
          ) : users.length === 0 ? (
             <div className="text-center p-12 bg-muted/30 rounded-2xl border border-dashed border-border text-muted-foreground text-sm italic">No users found.</div>
          ) : (
             users.map(u => (
               <div key={u.id} className="group bg-card hover:bg-muted/5 transition-all p-5 rounded-2xl border border-border shadow-sm flex flex-col gap-4 relative overflow-hidden">
                 {/* Decorative background element */}
                 <div className="absolute top-0 right-0 p-8 -mr-10 -mt-10 bg-primary/5 rounded-full blur-3xl group-hover:bg-primary/10 transition-colors" />
                 
                 <div className="flex items-center justify-between relative">
                   <div className="flex items-center gap-4">
                     <div className="h-12 w-12 shrink-0 rounded-2xl bg-primary/10 text-primary flex items-center justify-center font-bold text-lg border border-primary/20 shadow-inner">
                       {u.firstName[0]}{u.lastName[0]}
                     </div>
                     <div className="space-y-1">
                       <h3 className="font-bold text-foreground text-base leading-tight">{u.firstName} {u.lastName}</h3>
                       {u.role && (
                         <Badge 
                           variant="outline" 
                           className={cn(
                             "text-[10px] uppercase font-bold tracking-wider h-5 px-1.5",
                             u.role.slug === 'admin' ? "border-amber-500/50 text-amber-600 bg-amber-500/5" : "border-primary/30 text-primary bg-primary/5"
                           )}
                         >
                           {u.role.name}
                         </Badge>
                       )}
                     </div>
                   </div>
                   <div className="flex items-center gap-1">
                     <PermissionGate permission="users:update">
                       <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-primary/5" onClick={() => openEdit(u)}>
                         <Pencil className="h-4 w-4 text-muted-foreground hover:text-primary transition-colors" />
                       </Button>
                     </PermissionGate>
                     <PermissionGate permission="users:update">
                       <DropdownMenu>
                         <DropdownMenuTrigger asChild>
                           <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-primary/5">
                             <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                           </Button>
                         </DropdownMenuTrigger>
                         <DropdownMenuContent align="end" className="w-48">
                           <DropdownMenuItem onClick={() => openEdit(u)}>
                             <Pencil className="mr-2 h-4 w-4" /> Edit User
                           </DropdownMenuItem>
                           <DropdownMenuItem
                             onClick={() => {
                               setResetting(u)
                               setTemporaryPassword(null)
                               setResetOpen(true)
                             }}
                           >
                             <KeyRound className="mr-2 h-4 w-4" /> Reset password
                           </DropdownMenuItem>
                           <PermissionGate permission="users:delete">
                             <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/5" onClick={() => { setDeleting(u); setDeleteOpen(true) }}>
                               <Trash2 className="mr-2 h-4 w-4" /> Delete User
                             </DropdownMenuItem>
                           </PermissionGate>
                         </DropdownMenuContent>
                       </DropdownMenu>
                     </PermissionGate>
                   </div>
                 </div>
                 
                 <div className="space-y-2.5 p-3.5 bg-muted/30 rounded-xl border border-border/40 relative">
                   <div className="flex items-center gap-2.5 text-sm text-foreground/90">
                     <div className="h-7 w-7 rounded-lg bg-card border border-border flex items-center justify-center shrink-0 shadow-sm">
                       <Mail className="h-3.5 w-3.5 text-primary" />
                     </div>
                     <span className="truncate font-medium">{u.email}</span>
                   </div>
                   {u.phone && (
                     <div className="flex items-center gap-2.5 text-sm text-foreground/90">
                       <div className="h-7 w-7 rounded-lg bg-card border border-border flex items-center justify-center shrink-0 shadow-sm">
                         <Phone className="h-3.5 w-3.5 text-primary" />
                       </div>
                       <span className="font-medium">{u.phone}</span>
                     </div>
                   )}
                 </div>
                 
                 <div className="flex items-center justify-between pt-1 relative">
                   <div className="flex flex-col">
                     <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-tight">Joined Date</span>
                     <span className="text-xs font-semibold">{new Date(u.createdAt).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                   </div>
                   <Badge 
                     variant={u.isActive ? 'default' : 'secondary'} 
                     className={cn(
                       "h-6 px-2.5 text-[10px] font-bold tracking-wide uppercase shadow-sm",
                       u.isActive ? "" : "bg-muted text-muted-foreground"
                     )}
                   >
                     {u.isActive ? 'Active' : 'Inactive'}
                   </Badge>
                 </div>
               </div>
             ))
          )}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl overflow-y-auto max-h-[90vh]">
          <DialogHeader><DialogTitle>{editing ? 'Edit User' : 'Add User'}</DialogTitle></DialogHeader>
          {!editing && <CampusBadge />}
          <div className="grid gap-6 py-4">

            {/* Account */}
            <div className="space-y-4 border-b pb-4">
              <h3 className="font-semibold">Account</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2"><Label>Email *</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div className="grid gap-2"><Label>{editing ? 'New Password' : 'Password *'}</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={editing ? 'Leave blank to keep' : ''} /></div>
                <div className="grid gap-2"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+923001234567" /></div>
                <div className="grid gap-2">
                  <Label>Role *</Label>
                  <Select value={form.roleId} onValueChange={(v) => setForm({ ...form, roleId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                    <SelectContent>{roles.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {!isCampusLocked && campuses.length > 0 && (
                  <div className="grid gap-2">
                    <Label>Campus</Label>
                    <Select value={form.campusId} onValueChange={(v) => setForm({ ...form, campusId: v })}>
                      <SelectTrigger><SelectValue placeholder="Select campus (or School-wide)" /></SelectTrigger>
                      <SelectContent>
                        {campuses.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>

            {/* Personal Info */}
            <div className="space-y-4 border-b pb-4">
              <h3 className="font-semibold">Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2"><Label>First Name *</Label><Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></div>
                <div className="grid gap-2"><Label>Last Name *</Label><Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></div>
                <div className="grid gap-2">
                  <Label>Gender</Label>
                  <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{genderOptions.map((g) => <SelectItem key={g} value={g}>{g.charAt(0) + g.slice(1).toLowerCase()}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2"><Label>Date of Birth</Label><Input type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} /></div>
                <div className="grid gap-2"><Label>CNIC</Label><Input value={form.cnic} onChange={(e) => setForm({ ...form, cnic: e.target.value })} placeholder="12345-6789012-3" /></div>
                <div className="grid gap-2"><Label>Blood Group</Label><Input value={form.bloodGroup} onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })} placeholder="A+, O-" /></div>
              </div>
            </div>

            {/* Additional */}
            <div className="space-y-4">
              <h3 className="font-semibold">Additional Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2"><Label>Profession</Label><Input value={form.profession} onChange={(e) => setForm({ ...form, profession: e.target.value })} /></div>
                <div className="grid gap-2"><Label>Qualification</Label><Input value={form.qualification} onChange={(e) => setForm({ ...form, qualification: e.target.value })} /></div>
                <div className="grid gap-2 md:col-span-2"><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
              </div>
            </div>

          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleSave} disabled={saving || !form.email || !form.firstName || !form.lastName || (!editing && !form.password) || !form.roleId}>{saving ? 'Saving...' : editing ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete User</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">Are you sure you want to delete <strong>{deleting?.firstName} {deleting?.lastName}</strong>? This action cannot be undone.</p>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={resetOpen}
        onOpenChange={(open) => {
          setResetOpen(open)
          if (!open) {
            setResetting(null)
            setTemporaryPassword(null)
            setCopiedTemporaryPassword(false)
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Reset password</DialogTitle></DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              Generate a temporary password for{' '}
              <span className="font-medium text-foreground">
                {resetting ? `${resetting.firstName} ${resetting.lastName}` : 'this user'}
              </span>
              . They will be required to change it after signing in.
            </p>
            {temporaryPassword ? (
              <div className="rounded-md border bg-muted/30 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-muted-foreground">Temporary password</div>
                    <div className="mt-1 font-mono text-base break-all">{temporaryPassword}</div>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="shrink-0"
                    onClick={handleCopyTemporaryPassword}
                  >
                    {copiedTemporaryPassword ? (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="mr-2 h-4 w-4" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-md border bg-muted/30 p-3 text-muted-foreground">
                Temporary password will be shown here once generated.
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
            <Button onClick={handleResetPassword} disabled={!resetting || resettingLoading}>
              {resettingLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating…
                </>
              ) : (
                'Generate'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ProtectedRoute>
  )
}
