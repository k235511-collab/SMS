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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { api } from '@/lib/api-client'
import { Plus, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useSession } from '@/context/session-context'
import { CampusBadge } from '@/components/campus-badge'
import useCampusRefetch from '@/hooks/useCampusRefetch'
import { useConfirmDialog } from '@/hooks/useConfirmDialog'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

interface ClassItem { id: string; name: string; code: string; sortOrder: number; isActive: boolean }
interface Section { id: string; name: string; capacity?: number; isActive: boolean; classId: string }

export default function ClassesPage() {
  const { selectedCampus } = useSession()
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [loading, setLoading] = useState(true)
  const [classDialog, setClassDialog] = useState(false)
  const [editingClass, setEditingClass] = useState<ClassItem | null>(null)
  const [classForm, setClassForm] = useState({ name: '', code: '', sortOrder: '0' })

  // Sections
  const [sections, setSections] = useState<Section[]>([])
  const [sectionLoading, setSectionLoading] = useState(false)
  const [selectedClassId, setSelectedClassId] = useState('')
  const [sectionDialog, setSectionDialog] = useState(false)
  const [editingSection, setEditingSection] = useState<Section | null>(null)
  const [sectionForm, setSectionForm] = useState({ name: '', classId: '', capacity: '' })

  const [saving, setSaving] = useState(false)

  const fetchClasses = useCallback(async () => {
    setLoading(true)
    const res = await api.get<{ data: ClassItem[] }>('/academics/classes', { params: { pageSize: 100 } })
    if (res.success && res.data) setClasses(res.data.data || [])
    setLoading(false)
  }, [selectedCampus])

  const fetchSections = useCallback(async (classId: string) => {
    if (!classId) { setSections([]); return }
    setSectionLoading(true)
    const res = await api.get<Section[]>(`/academics/sections/class/${classId}`)
    if (res.success && res.data) setSections(Array.isArray(res.data) ? res.data : [])
    setSectionLoading(false)
  }, [])

  useEffect(() => { fetchClasses() }, [fetchClasses])
  useEffect(() => { if (selectedClassId) fetchSections(selectedClassId) }, [selectedClassId, fetchSections])

  // Reset section selection when campus changes
  useCampusRefetch(() => {
    setSelectedClassId('')
    setSections([])
  }, [])

  const saveClass = async () => {
    setSaving(true)
    try {
      const body = editingClass
        ? { name: classForm.name, sortOrder: Number(classForm.sortOrder), isActive: true }
        : { name: classForm.name, code: classForm.code, sortOrder: Number(classForm.sortOrder) }
      const res = editingClass ? await api.patch(`/academics/classes/${editingClass.id}`, body) : await api.post('/academics/classes', body)
      if (res.success) { toast.success(editingClass ? 'Class updated' : 'Class created'); setClassDialog(false); fetchClasses() }
      else toast.error(res.message || 'Failed')
    } finally { setSaving(false) }
  }

  const confirmDialog = useConfirmDialog()

  const deleteClass = async (id: string) => {
    confirmDialog.showConfirm('Delete Class', 'Are you sure you want to delete this class? This cannot be undone.', async () => {
      const res = await api.delete(`/academics/classes/${id}`)
      if (res.success) { toast.success('Deleted'); fetchClasses() } else toast.error(res.message || 'Failed')
    }, true)
  }

  const saveSection = async () => {
    setSaving(true)
    try {
      const body = { name: sectionForm.name, classId: sectionForm.classId, capacity: sectionForm.capacity ? Number(sectionForm.capacity) : undefined }
      const res = editingSection
        ? await api.patch(`/academics/sections/${editingSection.id}`, body)
        : await api.post('/academics/sections', body)

      if (res.success) {
        toast.success(editingSection ? 'Section updated' : 'Section created')
        setSectionDialog(false)
        fetchSections(sectionForm.classId)
      } else {
        toast.error(res.message || 'Failed')
      }
    } finally { setSaving(false) }
  }

  const deleteSection = async (id: string) => {
    confirmDialog.showConfirm('Delete Section', 'Are you sure you want to delete this section?', async () => {
      const res = await api.delete(`/academics/sections/${id}`)
      if (res.success) { toast.success('Deleted'); if (selectedClassId) fetchSections(selectedClassId) } else toast.error(res.message || 'Failed')
    }, true)
  }

  const classColumns: ColumnDef<ClassItem, unknown>[] = [
    { accessorKey: 'code', header: 'Code' },
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'sortOrder', header: 'Order' },
    { accessorKey: 'isActive', header: 'Status', cell: ({ row }) => <Badge variant={row.original.isActive ? 'default' : 'secondary'}>{row.original.isActive ? 'Active' : 'Inactive'}</Badge> },
    {
      id: 'actions', header: '', cell: ({ row }) => (
        <PermissionGate permission="academics:update">
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => { setEditingClass(row.original); setClassForm({ name: row.original.name, code: row.original.code, sortOrder: String(row.original.sortOrder) }); setClassDialog(true) }}><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
              <PermissionGate permission="academics:delete">
                <DropdownMenuItem className="text-destructive" onClick={() => deleteClass(row.original.id)}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
              </PermissionGate>
            </DropdownMenuContent>
          </DropdownMenu>
        </PermissionGate>
      )
    },
  ]

  const sectionColumns: ColumnDef<Section, unknown>[] = [
    { accessorKey: 'name', header: 'Name' },
    { accessorKey: 'capacity', header: 'Capacity', cell: ({ row }) => row.original.capacity || '—' },
    { accessorKey: 'isActive', header: 'Status', cell: ({ row }) => <Badge variant={row.original.isActive ? 'default' : 'secondary'}>{row.original.isActive ? 'Active' : 'Inactive'}</Badge> },
    {
      id: 'actions', header: '', cell: ({ row }) => (
        <div className="flex items-center justify-end gap-2">
          <PermissionGate permission="academics:update">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
              setEditingSection(row.original)
              setSectionForm({ name: row.original.name, classId: row.original.classId, capacity: String(row.original.capacity || '') })
              setSectionDialog(true)
            }}>
              <Pencil className="h-4 w-4" />
            </Button>
          </PermissionGate>
          <PermissionGate permission="academics:delete">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteSection(row.original.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
          </PermissionGate>
        </div>
      )
    },
  ]

  return (
    <ProtectedRoute permission="academics:read">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Classes</h1>
            <p className="mt-1 text-sm text-muted-foreground">Manage classes and their sections</p>
          </div>
          <PermissionGate permission="academics:create">
            <Button onClick={() => { setEditingClass(null); setClassForm({ name: '', code: '', sortOrder: '0' }); setClassDialog(true) }}><Plus className="mr-2 h-4 w-4" />Add Class</Button>
          </PermissionGate>
        </div>

        <DataTable columns={classColumns} data={classes} isLoading={loading} emptyMessage="No classes yet. Create your first class." />

        {/* Sections panel */}
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Sections</h2>
              <p className="text-sm text-muted-foreground">Select a class above to manage its sections</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
              <SelectTrigger className="w-60"><SelectValue placeholder="Select a class" /></SelectTrigger>
              <SelectContent>{classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name} ({c.code})</SelectItem>)}</SelectContent>
            </Select>
            <PermissionGate permission="academics:create">
              <Button disabled={!selectedClassId} onClick={() => { setEditingSection(null); setSectionForm({ name: '', classId: selectedClassId, capacity: '' }); setSectionDialog(true) }}><Plus className="mr-2 h-4 w-4" />Add Section</Button>
            </PermissionGate>
          </div>
          {selectedClassId ? (
            <DataTable columns={sectionColumns} data={sections} isLoading={sectionLoading} emptyMessage="No sections for this class." />
          ) : (
            <div className="rounded-xl border border-dashed border-input bg-card p-12 text-center"><p className="text-sm text-muted-foreground">Select a class to view its sections.</p></div>
          )}
        </div>
      </div>

      {/* Class Dialog */}
      <Dialog open={classDialog} onOpenChange={setClassDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editingClass ? 'Edit Class' : 'Add Class'}</DialogTitle></DialogHeader>
          {!editingClass && <CampusBadge />}
          <div className="grid gap-4 py-4">
            <div className="grid gap-2"><Label>Name *</Label><Input value={classForm.name} onChange={(e) => setClassForm({ ...classForm, name: e.target.value })} placeholder="e.g. Grade 10" /></div>
            {!editingClass && <div className="grid gap-2"><Label>Code *</Label><Input value={classForm.code} onChange={(e) => setClassForm({ ...classForm, code: e.target.value })} placeholder="e.g. G10" /></div>}
            <div className="grid gap-2"><Label>Sort Order</Label><Input type="number" value={classForm.sortOrder} onChange={(e) => setClassForm({ ...classForm, sortOrder: e.target.value })} /></div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={saveClass} disabled={saving || !classForm.name || (!editingClass && !classForm.code)}>{saving ? 'Saving...' : editingClass ? 'Update' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Section Dialog */}
      <Dialog open={sectionDialog} onOpenChange={setSectionDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>{editingSection ? 'Edit Section' : 'Add Section'}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2"><Label>Name *</Label><Input value={sectionForm.name} onChange={(e) => setSectionForm({ ...sectionForm, name: e.target.value })} placeholder="e.g. Section A" /></div>
            <div className="grid gap-2"><Label>Capacity</Label><Input type="number" value={sectionForm.capacity} onChange={(e) => setSectionForm({ ...sectionForm, capacity: e.target.value })} placeholder="e.g. 40" /></div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={saveSection} disabled={saving || !sectionForm.name}>{saving ? 'Saving...' : editingSection ? 'Update' : 'Create'}</Button>
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
