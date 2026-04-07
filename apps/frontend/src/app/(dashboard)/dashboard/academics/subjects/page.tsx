'use client'

import { useEffect, useState, useCallback } from 'react'
import { ProtectedRoute, PermissionGate } from '@/components/auth'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { api } from '@/lib/api-client'
import { Plus, Search, MoreHorizontal, Pencil, Trash2, Filter } from 'lucide-react'
import { toast } from 'sonner'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useSession } from '@/context/session-context'
import useCampusRefetch from '@/hooks/useCampusRefetch'
import { useConfirmDialog } from '@/hooks/useConfirmDialog'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

interface Class { id: string; name: string }
interface Subject {
  id: string;
  name: string;
  code: string;
  isActive: boolean;
  createdAt: string;
  class?: { name: string };
  classId?: string;
}

export default function SubjectsPage() {
  const { selectedCampus } = useSession()
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [classes, setClasses] = useState<Class[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [classFilter, setClassFilter] = useState<string>('all')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Subject | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ name: '', code: '', classId: '' })

  const fetchClasses = useCallback(async () => {
    const res = await api.get<{ data: Class[] }>('/academics/classes', { params: { pageSize: 100 } })
    if (res.success && res.data) {
      const fetched = (res.data as any).data || (Array.isArray(res.data) ? res.data : [])
      setClasses(fetched)
    } else if (!res.success) {
      toast.error(res.message || 'Failed to fetch classes')
    }
  }, [selectedCampus])

  const fetchSubjects = useCallback(async () => {
    setLoading(true)
    const params: any = {
      pageSize: 100,
      search: search || undefined,
      classId: classFilter !== 'all' ? classFilter : undefined
    }
    const res = await api.get<{ data: Subject[] }>('/academics/subjects', { params })
    if (res.success && res.data) {
      const fetched = (res.data as any).data || (Array.isArray(res.data) ? res.data : [])
      setSubjects(fetched)
    }
    setLoading(false)
  }, [search, classFilter, selectedCampus])

  useEffect(() => {
    fetchClasses()
    fetchSubjects()
  }, [fetchClasses, fetchSubjects])

  // Reset filters when campus changes
  useCampusRefetch(() => {
    setClassFilter('all')
  }, [])

  const openCreate = () => {
    setEditing(null);
    setForm({ name: '', code: '', classId: classFilter !== 'all' ? classFilter : '' });
    setDialogOpen(true)
  }

  const openEdit = (s: Subject) => {
    setEditing(s);
    setForm({ name: s.name, code: s.code, classId: s.classId || '' });
    setDialogOpen(true)
  }

  const handleSave = async () => {
    if (!form.classId) { toast.error('Please select a class'); return }
    setSaving(true)
    try {
      const body = editing ? { name: form.name, classId: form.classId } : { name: form.name, code: form.code, classId: form.classId }
      const res = editing ? await api.patch(`/academics/subjects/${editing.id}`, body) : await api.post('/academics/subjects', body)
      if (res.success) {
        toast.success(editing ? 'Subject updated' : 'Subject created');
        setDialogOpen(false);
        fetchSubjects()
      }
      else toast.error(res.message || 'Failed')
    } finally { setSaving(false) }
  }

  const confirmDialog = useConfirmDialog()

  const handleDelete = async (id: string) => {
    confirmDialog.showConfirm('Delete Subject', 'Are you sure you want to delete this subject?', async () => {
      const res = await api.delete(`/academics/subjects/${id}`)
      if (res.success) { toast.success('Deleted'); fetchSubjects() } else toast.error(res.message || 'Failed')
    }, true)
  }

  const columns: ColumnDef<Subject, unknown>[] = [
    { accessorKey: 'code', header: 'Code' },
    { accessorKey: 'name', header: 'Name' },
    {
      accessorKey: 'classId',
      header: 'Class',
      cell: ({ row }) => {
        const cid = row.original.classId
        const cls = classes.find(c => c.id === cid)
        return cls?.name || '-'
      }
    },
    { accessorKey: 'isActive', header: 'Status', cell: ({ row }) => <Badge variant={row.original.isActive ? 'default' : 'secondary'}>{row.original.isActive ? 'Active' : 'Inactive'}</Badge> },
    {
      id: 'actions', header: '', cell: ({ row }) => (
        <PermissionGate permission="academics:update">
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openEdit(row.original)}><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
              <PermissionGate permission="academics:delete">
                <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(row.original.id)}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
              </PermissionGate>
            </DropdownMenuContent>
          </DropdownMenu>
        </PermissionGate>
      )
    },
  ]

  return (
    <ProtectedRoute permission="academics:read">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Class Subjects</h1>
            <p className="mt-1 text-sm text-muted-foreground">Manage subjects ({subjects.length} total)</p>
          </div>
          <PermissionGate permission="academics:create">
            <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add Subject</Button>
          </PermissionGate>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search subjects..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Filter by Class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DataTable columns={columns} data={subjects} isLoading={loading} emptyMessage="No subjects yet. Create your first subject." />
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editing ? 'Edit Subject' : 'Add Subject'}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Class *</Label>
              <Select
                value={form.classId}
                onValueChange={(v) => setForm({ ...form, classId: v })}

              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Mathematics" />
            </div>
            {!editing && (
              <div className="grid gap-2">
                <Label>Code *</Label>
                <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. MATH" />
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleSave} disabled={saving || !form.name || !form.classId || (!editing && !form.code)}>{saving ? 'Saving...' : editing ? 'Update' : 'Create'}</Button>
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
    </ProtectedRoute>
  )
}
