'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { ProtectedRoute, PermissionGate } from '@/components/auth'
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
import { Plus, Search, MoreHorizontal, Eye, UserPlus, X, Pencil, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { useSession } from '@/context/session-context'
import { CampusBadge } from '@/components/campus-badge'

// ─── Types ──────────────────────────────────────────────────────────────────

interface ParentWithChildren {
  id: string
  firstName: string
  lastName: string
  phone?: string
  gender?: string
  cnic?: string
  profession?: string
  qualification?: string
  address?: string
  avatar?: string
  isActive: boolean
  createdAt: string
  children: {
    id: string
    parentId: string
    studentId: string
    relationship: string
    isPrimary: boolean
    student: {
      id: string
      firstName: string
      lastName: string
      rollNumber: string
      class?: { id: string; name: string }
      section?: { id: string; name: string }
    }
  }[]
}

interface StudentOption {
  id: string
  firstName: string
  lastName: string
  rollNumber: string
  class?: { id: string; name: string }
  section?: { id: string; name: string }
}

const EMPTY_FORM = {
  firstName: '',
  lastName: '',
  phone: '',
  gender: '',
  cnic: '',
  profession: '',
  qualification: '',
  address: '',
}

const RELATIONSHIP_OPTIONS = ['FATHER', 'MOTHER', 'GUARDIAN', 'OTHER']

// ─── Page ───────────────────────────────────────────────────────────────────

export default function ParentsPage() {
  const { selectedCampus } = useSession()
  const [parents, setParents] = useState<ParentWithChildren[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [linkOpen, setLinkOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [selectedParent, setSelectedParent] = useState<ParentWithChildren | null>(null)
  const [selectedLinkId, setSelectedLinkId] = useState<string | null>(null)

  // Create parent form
  const [form, setForm] = useState(EMPTY_FORM)
  const [editForm, setEditForm] = useState(EMPTY_FORM)
  const [editingParentId, setEditingParentId] = useState<string | null>(null)
  const [editRelationship, setEditRelationship] = useState('GUARDIAN')

  // Link child form
  const [linkForm, setLinkForm] = useState({ parentId: '', studentId: '', relationship: 'GUARDIAN' })
  const [students, setStudents] = useState<StudentOption[]>([])
  const [parentChildren, setParentChildren] = useState<ParentWithChildren['children']>([])
  const [studentSearch, setStudentSearch] = useState('')
  const [studentSearchResults, setStudentSearchResults] = useState<StudentOption[]>([])
  const [studentDropdownOpen, setStudentDropdownOpen] = useState(false)
  const [studentSearching, setStudentSearching] = useState(false)
  const [selectedStudentName, setSelectedStudentName] = useState('')
  const studentDropdownRef = useRef<HTMLDivElement>(null)

  // ─── Data Loading ───────────────────────────────────────────

  const loadParents = useCallback(async () => {
    setLoading(true)
    try {
      const res = await api.get<ParentWithChildren[]>('/parents')
      setParents(res.success && Array.isArray(res.data) ? res.data : [])
    } catch {
      toast.error('Failed to load parents')
    } finally {
      setLoading(false)
    }
  }, [selectedCampus])

  useEffect(() => { loadParents() }, [loadParents])

  // Click-outside handler for student search dropdown
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (studentDropdownRef.current && !studentDropdownRef.current.contains(e.target as Node)) {
        setStudentDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Filter by search
  let parentList = parents
  if (search) {
    const s = search.toLowerCase()
    parentList = parentList.filter(p =>
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(s) ||
      (p.phone || '').toLowerCase().includes(s) ||
      (p.cnic || '').toLowerCase().includes(s) ||
      p.children.some(c =>
        `${c.student.firstName} ${c.student.lastName}`.toLowerCase().includes(s) ||
        c.student.rollNumber.toLowerCase().includes(s)
      )
    )
  }

  // ─── Create Parent ─────────────────────────────────────────

  const handleCreate = async () => {
    const res = await api.post('/parents', {
      firstName: form.firstName,
      lastName: form.lastName,
      phone: form.phone || undefined,
      gender: form.gender || undefined,
      cnic: form.cnic || undefined,
      profession: form.profession || undefined,
      qualification: form.qualification || undefined,
      address: form.address || undefined,
    })
    if (res.success) {
      toast.success('Parent created successfully')
      setCreateOpen(false)
      setForm(EMPTY_FORM)
      loadParents()
    } else {
      toast.error(res.message || 'Failed to create parent')
    }
  }

  const openEdit = (parent: ParentWithChildren) => {
    setEditingParentId(parent.id)
    const primaryChild = parent.children.find(c => c.isPrimary)
    setEditRelationship(primaryChild?.relationship || parent.children[0]?.relationship || 'GUARDIAN')
    setEditForm({
      firstName: parent.firstName || '',
      lastName: parent.lastName || '',
      phone: parent.phone || '',
      gender: parent.gender || '',
      cnic: parent.cnic || '',
      profession: parent.profession || '',
      qualification: parent.qualification || '',
      address: parent.address || '',
    })
    setEditOpen(true)
  }

  const handleEdit = async () => {
    if (!editingParentId) return
    const res = await api.patch(`/users/${editingParentId}`, {
      firstName: editForm.firstName,
      lastName: editForm.lastName,
      phone: editForm.phone || undefined,
      gender: editForm.gender || undefined,
      cnic: editForm.cnic || undefined,
      profession: editForm.profession || undefined,
      qualification: editForm.qualification || undefined,
      address: editForm.address || undefined,
    })

    if (res.success) {
      const currentParent = parents.find(p => p.id === editingParentId)
      if (currentParent?.children?.length) {
        await Promise.all(
          currentParent.children.map((child) =>
            api.patch(`/parents/link/${child.id}`, {
              relationship: editRelationship,
            })
          )
        )
      }

      toast.success('Parent updated successfully')
      setEditOpen(false)
      setEditingParentId(null)
      setEditForm(EMPTY_FORM)
      setEditRelationship('GUARDIAN')
      loadParents()

      if (selectedParent && selectedParent.id === editingParentId) {
        setSelectedParent({
          ...selectedParent,
          firstName: editForm.firstName,
          lastName: editForm.lastName,
          phone: editForm.phone || undefined,
          gender: editForm.gender || undefined,
          cnic: editForm.cnic || undefined,
          profession: editForm.profession || undefined,
          qualification: editForm.qualification || undefined,
          address: editForm.address || undefined,
        })
      }
    } else {
      toast.error(res.message || 'Failed to update parent')
    }
  }

  const openDeleteParent = (parent: ParentWithChildren) => {
    setSelectedParent(parent)
    setDeleteOpen(true)
  }

  const handleDeleteParent = async () => {
    if (!selectedParent) return

    const kidsRes = await api.get<ParentWithChildren['children']>(`/parents/children/${selectedParent.id}`)
    const links = kidsRes.success && Array.isArray(kidsRes.data) ? kidsRes.data : selectedParent.children || []

    for (const childLink of links) {
      const unlinkRes = await api.delete(`/parents/link/${childLink.id}`)
      if (!unlinkRes.success) {
        toast.error(unlinkRes.message || 'Failed to unlink children before deleting parent')
        return
      }
    }

    const res = await api.delete(`/users/${selectedParent.id}`)
    if (res.success) {
      toast.success('Parent deleted successfully')
      setDeleteOpen(false)
      if (detailOpen) setDetailOpen(false)
      setSelectedParent(null)
      loadParents()
    } else {
      toast.error(res.message || 'Failed to delete parent')
    }
  }

  // ─── Link Child ─────────────────────────────────────────────

  const searchStudents = async (query: string) => {
    if (!query || query.trim().length < 2) {
      setStudentSearchResults([])
      return
    }
    setStudentSearching(true)
    try {
      const res = await api.get<any>('/students', { params: { pageSize: 20, search: query.trim() } })
      const arr = res.data?.data || res.data || []
      setStudentSearchResults(Array.isArray(arr) ? arr : [])
    } catch {
      setStudentSearchResults([])
    } finally {
      setStudentSearching(false)
    }
  }

  const openLinkDialog = (parentId: string) => {
    setLinkForm({ parentId, studentId: '', relationship: 'GUARDIAN' })
    setStudentSearch('')
    setSelectedStudentName('')
    setStudentSearchResults([])
    setStudentDropdownOpen(false)
    setLinkOpen(true)
  }

  const handleLink = async () => {
    const res = await api.post('/parents/link', {
      parentId: linkForm.parentId,
      studentId: linkForm.studentId,
      relationship: linkForm.relationship,
      isPrimary: false,
    })
    if (res.success) {
      toast.success('Child linked successfully')
      setLinkOpen(false)
      loadParents()
    } else {
      toast.error(res.message || 'Failed to link child')
    }
  }

  // ─── Unlink / Delete ───────────────────────────────────────

  const handleUnlink = async (linkId: string) => {
    const res = await api.delete(`/parents/link/${linkId}`)
    if (res.success) {
      toast.success('Child unlinked')
      loadParents()
      if (selectedParent) {
        const kidsRes = await api.get<ParentWithChildren['children']>(`/parents/children/${selectedParent.id}`)
        setParentChildren(kidsRes.success && Array.isArray(kidsRes.data) ? kidsRes.data : [])
      }
    } else {
      toast.error(res.message || 'Failed to unlink')
    }
  }

  // ─── View Detail ───────────────────────────────────────────

  const openDetail = async (parent: ParentWithChildren) => {
    setSelectedParent(parent)
    const kidsRes = await api.get<ParentWithChildren['children']>(`/parents/children/${parent.id}`)
    setParentChildren(kidsRes.success && Array.isArray(kidsRes.data) ? kidsRes.data : parent.children)
    setDetailOpen(true)
  }

  // ─── Helpers ───────────────────────────────────────────────

  const relBadgeColor = (rel: string) => {
    switch (rel) {
      case 'FATHER': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
      case 'MOTHER': return 'bg-pink-100 text-pink-800 dark:bg-pink-900/30 dark:text-pink-300'
      case 'GUARDIAN': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300'
    }
  }

  // ─── Render ────────────────────────────────────────────────

  return (
    <ProtectedRoute permission="students:read">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Parents</h1>
            <p className="text-sm text-muted-foreground">
              Manage parent profiles and their child links
            </p>
          </div>
          <PermissionGate permission="users:create">
            <Button onClick={() => { setForm(EMPTY_FORM); setCreateOpen(true) }}>
              <Plus className="mr-2 h-4 w-4" />
              Add Parent
            </Button>
          </PermissionGate>
        </div>

        {/* Search */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search parents, children..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <span className="text-sm text-muted-foreground">
            {parentList.length} parent(s)
          </span>
        </div>

        {/* Parents List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : parentList.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-lg">No parents found</p>
            <p className="text-sm mt-1">Create a parent account to get started</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {parentList.map((parent) => (
              <div
                key={parent.id}
                className="border rounded-lg p-4 bg-card hover:shadow-sm transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                      {parent.firstName?.[0]}{parent.lastName?.[0]}
                    </div>
                    <div>
                      <h3 className="font-medium">
                        {parent.firstName} {parent.lastName}
                      </h3>
                      {parent.phone && (
                        <p className="text-sm text-muted-foreground">{parent.phone}</p>
                      )}
                    </div>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(parent)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit Parent
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openDetail(parent)}>
                        <Eye className="mr-2 h-4 w-4" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => openLinkDialog(parent.id)}>
                        <UserPlus className="mr-2 h-4 w-4" />
                        Link Child
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => openDeleteParent(parent)}>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Parent
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Children */}
                {parent.children.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {parent.children.map(child => (
                      <div
                        key={child.id}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted text-sm"
                      >
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${relBadgeColor(child.relationship)}`}>
                          {child.relationship}
                        </span>
                        <span className="font-medium">
                          {child.student.firstName} {child.student.lastName}
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {child.student.rollNumber}
                          {child.student.class && ` · ${child.student.class.name}`}
                          {child.student.section && `-${child.student.section.name}`}
                        </span>
                        <button
                          onClick={() => handleUnlink(child.id)}
                          className="ml-1 text-muted-foreground hover:text-destructive"
                          title="Unlink"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {parent.children.length === 0 && (
                  <p className="mt-2 text-xs text-muted-foreground italic">No children linked yet</p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ─── Create Parent Dialog ─── */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Parent</DialogTitle>
            </DialogHeader>
            <CampusBadge />

            <div className="grid gap-4 py-2">
              {/* Personal info */}
              <h4 className="text-sm font-semibold text-muted-foreground mb-1">Personal Information</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>First Name *</Label>
                  <Input value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} />
                </div>
                <div>
                  <Label>Last Name *</Label>
                  <Input value={form.lastName} onChange={e => setForm({ ...form, lastName: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>CNIC</Label>
                  <Input value={form.cnic} onChange={e => setForm({ ...form, cnic: e.target.value })} placeholder="12345-6789012-3" />
                </div>
                <div>
                  <Label>Gender</Label>
                  <Select value={form.gender} onValueChange={v => setForm({ ...form, gender: v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MALE">Male</SelectItem>
                      <SelectItem value="FEMALE">Female</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Phone / WhatsApp</Label>
                <Input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="+923001234567" />
              </div>

              {/* Professional */}
              <h4 className="text-sm font-semibold text-muted-foreground mt-2 mb-1">Additional</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Profession</Label>
                  <Input value={form.profession} onChange={e => setForm({ ...form, profession: e.target.value })} />
                </div>
                <div>
                  <Label>Qualification</Label>
                  <Input value={form.qualification} onChange={e => setForm({ ...form, qualification: e.target.value })} />
                </div>
              </div>

              <div>
                <Label>Address</Label>
                <Input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
              </div>
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button
                onClick={handleCreate}
                disabled={!form.firstName || !form.lastName}
              >
                Create Parent
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ─── Edit Parent Dialog ─── */}
        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Parent</DialogTitle>
            </DialogHeader>
            <CampusBadge />

            <div className="grid gap-4 py-2">
              <h4 className="text-sm font-semibold text-muted-foreground mb-1">Personal Information</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>First Name *</Label>
                  <Input value={editForm.firstName} onChange={e => setEditForm({ ...editForm, firstName: e.target.value })} />
                </div>
                <div>
                  <Label>Last Name *</Label>
                  <Input value={editForm.lastName} onChange={e => setEditForm({ ...editForm, lastName: e.target.value })} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>CNIC</Label>
                  <Input value={editForm.cnic} onChange={e => setEditForm({ ...editForm, cnic: e.target.value })} placeholder="12345-6789012-3" />
                </div>
                <div>
                  <Label>Gender</Label>
                  <Select value={editForm.gender} onValueChange={v => setEditForm({ ...editForm, gender: v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MALE">Male</SelectItem>
                      <SelectItem value="FEMALE">Female</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Phone / WhatsApp</Label>
                <Input value={editForm.phone} onChange={e => setEditForm({ ...editForm, phone: e.target.value })} placeholder="+923001234567" />
              </div>

              <div>
                <Label>Relationship</Label>
                <Select value={editRelationship} onValueChange={setEditRelationship}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {RELATIONSHIP_OPTIONS.map(r => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground mt-1">This updates the relationship on all linked children.</p>
              </div>

              <h4 className="text-sm font-semibold text-muted-foreground mt-2 mb-1">Additional</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Profession</Label>
                  <Input value={editForm.profession} onChange={e => setEditForm({ ...editForm, profession: e.target.value })} />
                </div>
                <div>
                  <Label>Qualification</Label>
                  <Input value={editForm.qualification} onChange={e => setEditForm({ ...editForm, qualification: e.target.value })} />
                </div>
              </div>

              <div>
                <Label>Address</Label>
                <Input value={editForm.address} onChange={e => setEditForm({ ...editForm, address: e.target.value })} />
              </div>
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={handleEdit} disabled={!editForm.firstName || !editForm.lastName}>
                Update Parent
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ─── Delete Parent Dialog ─── */}
        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Delete Parent</DialogTitle>
            </DialogHeader>

            <div className="space-y-2 text-sm">
              <p>
                Are you sure you want to delete{' '}
                <span className="font-semibold">{selectedParent ? `${selectedParent.firstName} ${selectedParent.lastName}` : 'this parent'}</span>?
              </p>
              <p className="text-muted-foreground">
                All linked children will be unlinked first, then the parent account will be deleted.
              </p>
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button variant="destructive" onClick={handleDeleteParent}>
                Delete Parent
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ─── Link Child Dialog ─── */}
        <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Link Child</DialogTitle>
            </DialogHeader>

            <div className="grid gap-4 py-2">
              <div ref={studentDropdownRef} style={{ position: 'relative' }}>
                <Label>Student *</Label>
                {linkForm.studentId ? (
                  <div className="flex items-center gap-2 px-3 py-2 rounded-md border bg-primary/5 border-primary/30">
                    <div className="flex-1">
                      <span className="text-sm font-medium">{selectedStudentName}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setLinkForm({ ...linkForm, studentId: '' })
                        setSelectedStudentName('')
                        setStudentSearch('')
                      }}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Input
                      value={studentSearch}
                      onChange={(e) => {
                        const val = e.target.value
                        setStudentSearch(val)
                        if (val.trim().length >= 2) {
                          setStudentDropdownOpen(true)
                          searchStudents(val)
                        } else {
                          setStudentDropdownOpen(false)
                        }
                      }}
                      placeholder="Search by name, roll number..."
                    />
                    {studentDropdownOpen && studentSearch.trim().length >= 2 && (
                      <div className="absolute top-[calc(100%+2px)] left-0 right-0 z-50 max-h-52 overflow-y-auto bg-popover border rounded-md shadow-lg">
                        {studentSearching ? (
                          <div className="p-3 text-sm text-muted-foreground text-center">Searching...</div>
                        ) : studentSearchResults.length === 0 ? (
                          <div className="p-3 text-sm text-muted-foreground text-center">No students found</div>
                        ) : (
                          studentSearchResults.map(s => (
                            <button
                              key={s.id}
                              type="button"
                              className="w-full text-left px-3 py-2.5 hover:bg-accent hover:text-accent-foreground text-sm transition-colors border-b last:border-b-0"
                              onClick={() => {
                                setLinkForm({ ...linkForm, studentId: s.id })
                                const label = `${s.firstName} ${s.lastName} (${s.rollNumber})${s.class ? ` · ${s.class.name}` : ''}`
                                setSelectedStudentName(label)
                                setStudentSearch('')
                                setStudentDropdownOpen(false)
                              }}
                            >
                              <div className="font-medium">{s.firstName} {s.lastName}</div>
                              <div className="text-xs text-muted-foreground flex gap-3 mt-0.5">
                                <span>Roll: {s.rollNumber}</span>
                                {s.class && <span>{s.class.name}</span>}
                                {s.section && <span>Sec: {s.section.name}</span>}
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              <div>
                <Label>Relationship *</Label>
                <Select value={linkForm.relationship} onValueChange={v => setLinkForm({ ...linkForm, relationship: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {RELATIONSHIP_OPTIONS.map(r => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={handleLink} disabled={!linkForm.studentId}>
                Link
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ─── Parent Detail Dialog ─── */}
        <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Parent Details</DialogTitle>
            </DialogHeader>

            {selectedParent && (
              <div className="space-y-4">
                {/* Personal info */}
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                    {selectedParent.firstName?.[0]}{selectedParent.lastName?.[0]}
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg">
                      {selectedParent.firstName} {selectedParent.lastName}
                    </h3>
                    {selectedParent.phone && <p className="text-sm text-muted-foreground">{selectedParent.phone}</p>}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div><span className="text-muted-foreground">Phone:</span> {selectedParent.phone || '—'}</div>
                  <div><span className="text-muted-foreground">Gender:</span> {selectedParent.gender || '—'}</div>
                  <div><span className="text-muted-foreground">CNIC:</span> {selectedParent.cnic || '—'}</div>
                  <div><span className="text-muted-foreground">Profession:</span> {selectedParent.profession || '—'}</div>
                  <div><span className="text-muted-foreground">Qualification:</span> {selectedParent.qualification || '—'}</div>
                  <div className="col-span-2"><span className="text-muted-foreground">Address:</span> {selectedParent.address || '—'}</div>
                </div>

                {/* Children */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-sm">Children</h4>
                    <Button size="sm" variant="outline" onClick={() => openLinkDialog(selectedParent.id)}>
                      <UserPlus className="mr-1 h-3 w-3" />
                      Link Child
                    </Button>
                  </div>

                  {parentChildren.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">No children linked</p>
                  ) : (
                    <div className="space-y-2">
                      {parentChildren.map((c: any) => (
                        <div key={c.id} className="flex items-center justify-between px-3 py-2 bg-muted rounded-md">
                          <div className="flex items-center gap-2">
                            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${relBadgeColor(c.relationship)}`}>
                              {c.relationship}
                            </span>
                            <span className="text-sm font-medium">
                              {c.student.firstName} {c.student.lastName}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              {c.student.rollNumber}
                              {c.student.class && ` · ${c.student.class.name}`}
                            </span>
                          </div>
                          <button
                            onClick={() => handleUnlink(c.id)}
                            className="text-muted-foreground hover:text-destructive"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Close</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ProtectedRoute>
  )
}
