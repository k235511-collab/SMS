'use client'

import { useEffect, useState, useCallback } from 'react'
import { ProtectedRoute, PermissionGate } from '@/components/auth'
import { DataTable, type ColumnDef, SortableHeader } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { api } from '@/lib/api-client'
import { teachersService } from '@/services/teachers.service'
import { academicsService } from '@/services/academics.service'
import { Plus, Search, MoreHorizontal, Pencil, Trash2, Eye, BookOpen } from 'lucide-react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { useSession } from '@/context/session-context'
import { CampusBadge } from '@/components/campus-badge'
import { TeachingAssignmentsDialog, type TeachingAssignmentClass, type TeachingAssignmentSelection } from '@/components/teachers/teaching-assignments-dialog'
import useCampusRefetch from '@/hooks/useCampusRefetch'
import { useConfirmDialog } from '@/hooks/useConfirmDialog'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

interface Teacher {
  id: string
  employeeId: string
  firstName: string
  lastName: string
  qualification?: string
  specialization?: string
  isActive: boolean
  createdAt: string
  // extended fields
  email?: string
  salary?: number
  joinDate?: string
  cnic?: string
  maritalStatus?: string
  fatherHusbandName?: string
  fatherHusbandCnic?: string
  qualificationAtAppt?: string
  department?: string
  experience?: string
  gender?: string
  dateOfBirth?: string
  phone?: string
  bloodGroup?: string
  religion?: string
  designation?: string
  address?: string
  note?: string
  photo?: string
  user?: { email?: string; roleId?: string; roleName?: string }
  classTeacherOfId?: string
  classTeacherOf?: { id: string; name: string }
  classAssignments?: Array<{
    id: string
    classId: string
    subjectId?: string | null
    academicYear?: { id: string; name: string; isCurrent?: boolean } | null
    sectionId?: string | null
    class: { id: string; name: string }
    subject?: { id: string; name: string } | null
    section?: { id: string; name: string } | null
  }>
}

function getDisplayAssignments(assignments: Teacher['classAssignments'] = []) {
  const specificAssignments = assignments.filter((assignment) => assignment.subjectId)
  if (specificAssignments.length > 0) {
    return specificAssignments
  }

  return assignments
}

function getClassSectionLabels(assignments: Teacher['classAssignments'] = []) {
  const displayAssignments = getDisplayAssignments(assignments)
  const labels = new Set<string>()
  for (const assignment of displayAssignments) {
    const className = assignment.class?.name || 'Unknown'
    const sectionLabel = assignment.section?.name ? ` (${assignment.section.name})` : ''
    labels.add(`${className}${sectionLabel}`)
  }
  return Array.from(labels)
}

function getSubjectLabels(assignments: Teacher['classAssignments'] = []) {
  const displayAssignments = getDisplayAssignments(assignments)
  const labels = new Set<string>()
  for (const assignment of displayAssignments) {
    labels.add(assignment.subject?.name || 'All Subjects')
  }
  return Array.from(labels)
}

interface RoleOption {
  id: string
  name: string
  slug: string
}

interface PaginatedResponse {
  data: Teacher[]
  meta: { total: number; page: number; pageSize: number; totalPages: number }
}

const emptyForm = {
  employeeId: '', firstName: '', lastName: '', qualification: '', specialization: '',
  email: '', password: '', salary: '', joinDate: '', cnic: '', maritalStatus: '',
  fatherHusbandName: '', fatherHusbandCnic: '', qualificationAtAppt: '', department: '',
  experience: '', gender: '', dateOfBirth: '', phone: '', bloodGroup: '', religion: '',
  designation: '', address: '', note: '', photo: '', roleId: '', classTeacherOfId: '',
}

const genderOptions = ['MALE', 'FEMALE', 'OTHER']
const maritalOptions = ['SINGLE', 'MARRIED', 'WIDOWED', 'DIVORCED']

export default function TeachersPage() {
  const router = useRouter()
  const { selectedCampus, selectedYear } = useSession()
  const [teachers, setTeachers] = useState<Teacher[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Teacher | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ ...emptyForm })
  const [roles, setRoles] = useState<RoleOption[]>([])
  const [modalClasses, setModalClasses] = useState<any[]>([])

  // ─── Teaching assignments state ─────────────────────────────────────────
  const [assignOpen, setAssignOpen] = useState(false)
  const [assignTeacher, setAssignTeacher] = useState<Teacher | null>(null)
  const [availableClasses, setAvailableClasses] = useState<TeachingAssignmentClass[]>([])
  const [selectedMap, setSelectedMap] = useState<Record<string, TeachingAssignmentSelection>>({})
  const [assignSaving, setAssignSaving] = useState(false)
  const [assignLoading, setAssignLoading] = useState(true)

  const fetchRoles = useCallback(async () => {
    const res = await api.get<any>('/roles', { params: { pageSize: 100 } })
    if (res.success && res.data) {
      const list = Array.isArray(res.data) ? res.data : (Array.isArray(res.data.data) ? res.data.data : [])
      setRoles(list)
    }
  }, [])

  const fetchTeachers = useCallback(async () => {
    setLoading(true)
    const res = await api.get<PaginatedResponse>('/teachers', { params: { page, pageSize: 20, search: search || undefined } })
    if (res.success && res.data) { setTeachers(res.data.data || []); setTotal(res.data.meta?.total || 0) }
    setLoading(false)
  }, [page, search, selectedCampus])

  useEffect(() => { fetchTeachers() }, [fetchTeachers])
  useEffect(() => { fetchRoles() }, [fetchRoles])

  // Reset page when campus changes
  useCampusRefetch(() => { setPage(1) }, [])

  const openCreate = () => {
    setEditing(null)
    setForm({ ...emptyForm })
    fetchModalClasses()
    setDialogOpen(true)
  }

  const openEdit = (t: Teacher) => {
    setEditing(t)
    setForm({
      employeeId: t.employeeId, firstName: t.firstName, lastName: t.lastName,
      qualification: t.qualification || '', specialization: t.specialization || '',
      email: (t as any).email || t.user?.email || '', password: '',
      salary: t.salary != null ? String(t.salary) : '',
      joinDate: t.joinDate ? t.joinDate.slice(0, 10) : '',
      cnic: t.cnic || '', maritalStatus: t.maritalStatus || '',
      fatherHusbandName: t.fatherHusbandName || '', fatherHusbandCnic: t.fatherHusbandCnic || '',
      qualificationAtAppt: t.qualificationAtAppt || '', department: t.department || '',
      experience: t.experience || '', gender: t.gender || '',
      dateOfBirth: t.dateOfBirth ? t.dateOfBirth.slice(0, 10) : '',
      phone: t.phone || '', bloodGroup: t.bloodGroup || '', religion: t.religion || '',
      designation: t.designation || '', address: t.address || '', note: t.note || '',
      photo: t.photo || '', roleId: t.user?.roleId || '',
      classTeacherOfId: t.classTeacherOfId || '',
    })
    fetchModalClasses()
    setDialogOpen(true)
  }

  const fetchModalClasses = async () => {
    const res = await academicsService.getClasses()
    if (res.success && res.data) {
      const list = Array.isArray(res.data) ? res.data : (res.data?.data || [])
      setModalClasses(list)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const body: any = {
        firstName: form.firstName, lastName: form.lastName,
        qualification: form.qualification || undefined,
        specialization: form.specialization || undefined,
        designation: form.designation || undefined,
        department: form.department || undefined,
        salary: form.salary ? parseFloat(form.salary) : undefined,
        joinDate: form.joinDate || undefined,
        cnic: form.cnic || undefined,
        maritalStatus: form.maritalStatus || undefined,
        fatherHusbandName: form.fatherHusbandName || undefined,
        fatherHusbandCnic: form.fatherHusbandCnic || undefined,
        qualificationAtAppt: form.qualificationAtAppt || undefined,
        experience: form.experience || undefined,
        gender: form.gender || undefined,
        dateOfBirth: form.dateOfBirth || undefined,
        phone: form.phone || undefined,
        bloodGroup: form.bloodGroup || undefined,
        religion: form.religion || undefined,
        address: form.address || undefined,
        note: form.note || undefined,
        photo: form.photo || undefined,
        classTeacherOfId: form.classTeacherOfId || null,
      }
      if (!editing) body.employeeId = form.employeeId
      if (form.email) body.email = form.email
      if (form.password) body.password = form.password
      if (form.roleId) body.roleId = form.roleId
      const res = editing ? await api.patch(`/teachers/${editing.id}`, body) : await api.post('/teachers', body)
      if (res.success) { toast.success(editing ? 'Teacher updated' : 'Teacher added'); setDialogOpen(false); fetchTeachers() }
      else toast.error(res.message || 'Failed to save')
    } finally { setSaving(false) }
  }

  const confirmDialog = useConfirmDialog()

  const handleDelete = async (id: string) => {
    confirmDialog.showConfirm('Delete Teacher', 'Are you sure you want to delete this teacher? This cannot be undone.', async () => {
      const res = await api.delete(`/teachers/${id}`)
      if (res.success) { toast.success('Teacher deleted'); fetchTeachers() }
      else toast.error(res.message || 'Failed to delete')
    }, true)
  }

  const openAssignClasses = async (teacher: Teacher) => {
    if (!selectedYear?.id) {
      toast.error('Please select an academic year first')
      return
    }
    setAssignSaving(false)
    setAvailableClasses([])
    setSelectedMap({})
    setAssignLoading(true)
    setAssignTeacher(teacher)
    // Use setTimeout to ensure loading=true renders before opening dialog
    await new Promise(resolve => setTimeout(resolve, 0))
    setAssignOpen(true)
    const [assignRes, classRes] = await Promise.all([
      teachersService.getClassAssignments(teacher.id, selectedYear.id),
      academicsService.getClasses(),
    ])
    // Build selected map from existing assignments
    const map: Record<string, TeachingAssignmentSelection> = {}
    if (assignRes.success && assignRes.data) {
      const assignments = Array.isArray(assignRes.data) ? assignRes.data : []
      for (const a of assignments) {
        if (!map[a.classId]) {
          map[a.classId] = { sectionIds: new Set<string>(), subjectIds: new Set<string>(), isClassTeacher: false, isSubjectTeacher: false }
        }
        if (a.sectionId) map[a.classId].sectionIds.add(a.sectionId)
        if (a.subjectId) {
          map[a.classId].subjectIds.add(a.subjectId)
          map[a.classId].isSubjectTeacher = true
        } else {
          map[a.classId].isClassTeacher = true
        }
      }
    }
    setSelectedMap(map)
    // Now fetch sections + subjects for each class
    if (classRes.success && classRes.data) {
      const list = Array.isArray(classRes.data) ? classRes.data : (classRes.data?.data || [])
      // Fetch sections and subjects for all classes in parallel
      const withSections = await Promise.all(
        list.map(async (c: any) => {
          const [secRes, subjRes] = await Promise.all([
            api.get<any>(`/academics/sections/class/${c.id}`),
            academicsService.getSubjects(c.id),
          ])
          const sections = secRes.success && secRes.data
            ? (Array.isArray(secRes.data) ? secRes.data : secRes.data?.data || [])
            : []
          const subjects = subjRes.success && subjRes.data
            ? (Array.isArray(subjRes.data) ? subjRes.data : subjRes.data?.data || [])
            : []
          return { id: c.id, name: c.name, sections, subjects }
        }),
      )
      setAvailableClasses(withSections)
    }
    setAssignLoading(false)
  }

  const toggleClass = (classId: string) => {
    setSelectedMap(prev => {
      const next = { ...prev }
      if (next[classId] !== undefined) {
        delete next[classId]
      } else {
        next[classId] = { sectionIds: new Set<string>(), subjectIds: new Set<string>(), isClassTeacher: false, isSubjectTeacher: true }
      }
      return next
    })
  }

  const toggleSection = (classId: string, sectionId: string) => {
    setSelectedMap(prev => {
      const next = { ...prev }
      if (!next[classId]) next[classId] = { sectionIds: new Set<string>(), subjectIds: new Set<string>(), isClassTeacher: false, isSubjectTeacher: true }
      const secs = new Set(next[classId].sectionIds)
      if (secs.has(sectionId)) secs.delete(sectionId)
      else secs.add(sectionId)
      next[classId] = { ...next[classId], sectionIds: secs }
      return next
    })
  }

  const toggleSubject = (classId: string, subjectId: string) => {
    setSelectedMap(prev => {
      const next = { ...prev }
      if (!next[classId]) next[classId] = { sectionIds: new Set<string>(), subjectIds: new Set<string>(), isClassTeacher: false, isSubjectTeacher: true }
      const subjects = new Set(next[classId].subjectIds)
      if (subjects.has(subjectId)) subjects.delete(subjectId)
      else subjects.add(subjectId)
      next[classId] = { ...next[classId], subjectIds: subjects }
      return next
    })
  }

  const toggleClassTeacher = (classId: string) => {
    setSelectedMap(prev => {
      const next = { ...prev }
      if (!next[classId]) return next
      next[classId] = { ...next[classId], isClassTeacher: !next[classId].isClassTeacher }
      return next
    })
  }

  const toggleSubjectTeacher = (classId: string) => {
    setSelectedMap(prev => {
      const next = { ...prev }
      if (!next[classId]) return next
      next[classId] = { ...next[classId], isSubjectTeacher: !next[classId].isSubjectTeacher }
      return next
    })
  }

  const handleSaveClasses = async () => {
    if (!assignTeacher) return
    if (!selectedYear?.id) {
      toast.error('Please select an academic year first')
      return
    }
    setAssignSaving(true)
    const selectedEntries = Object.entries(selectedMap)

    // Validate: each class must have at least one role
    for (const [, value] of selectedEntries) {
      if (!value.isClassTeacher && !value.isSubjectTeacher) {
        toast.error('Each class must have at least one role assigned (Class Teacher or Subject Teacher)')
        setAssignSaving(false)
        return
      }
      if (value.isClassTeacher && value.sectionIds.size === 0) {
        toast.error('Please select at least one section for each Class Teacher assignment')
        setAssignSaving(false)
        return
      }
      if (value.isSubjectTeacher && value.subjectIds.size === 0) {
        toast.error('Please select at least one subject for each Subject Teacher assignment')
        setAssignSaving(false)
        return
      }
    }

    try {
      const assignments = selectedEntries
        .filter(([, value]) => value.isClassTeacher || value.isSubjectTeacher)
        .map(([classId, value]) => ({
        classId,
        sectionIds: Array.from(value.sectionIds),
        subjectIds: value.isSubjectTeacher ? Array.from(value.subjectIds) : [],
        isClassTeacher: value.isClassTeacher,
        isSubjectTeacher: value.isSubjectTeacher,
        academicYearId: selectedYear.id,
      }))

      const res = await teachersService.syncClasses(assignTeacher.id, selectedYear.id, assignments)
      if (res.success) {
        toast.success('Teaching assignments updated')
        setAssignOpen(false)
        fetchTeachers()
      } else {
        toast.error(res.message || 'Failed to update assignments')
      }
    } catch (err: any) {
      toast.error(err?.message || 'An unexpected error occurred')
    } finally {
      setAssignSaving(false)
    }
  }

  const columns: ColumnDef<Teacher, unknown>[] = [
    { accessorKey: 'employeeId', header: ({ column }) => <SortableHeader column={column}>Teacher ID</SortableHeader>, cell: ({ row }) => <span className="text-xs font-medium text-muted-foreground">{row.original.employeeId}</span> },
    {
      id: 'name',
      header: ({ column }) => <SortableHeader column={column}>Name</SortableHeader>,
      accessorFn: (row) => `${row.firstName} ${row.lastName}`.trim(),
      cell: ({ row }) => {
        const name = `${row.original.firstName} ${row.original.lastName}`.trim()
        return <span className="font-medium text-foreground">{name || '—'}</span>
      },
    },
    { accessorKey: 'phone', header: 'Phone', cell: ({ row }) => <span className="text-sm text-muted-foreground">{(row.original as any).phone || '—'}</span> },
    {
      id: 'classSection',
      header: 'Class (Section)',
      cell: ({ row }) => {
        const labels = getClassSectionLabels(row.original.classAssignments)
        if (labels.length === 0) return <span className="text-sm text-muted-foreground">—</span>
        return <span className="text-sm">{labels.join(', ')}</span>
      },
    },
    {
      id: 'subject',
      header: 'Subject',
      cell: ({ row }) => {
        const labels = getSubjectLabels(row.original.classAssignments)
        if (labels.length === 0) return <span className="text-sm text-muted-foreground">—</span>
        return <span className="text-sm">{labels.join(', ')}</span>
      },
    },
    {
      id: 'assignments',
      header: 'Assignments',
      cell: ({ row }) => (
        <PermissionGate permission="teachers:update">
          <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={() => openAssignClasses(row.original)}>
            <BookOpen className="h-3.5 w-3.5" />
            Manage
          </Button>
        </PermissionGate>
      ),
    },
    { id: 'actions', header: '', cell: ({ row }) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => router.push(`/dashboard/teachers/${row.original.id}`)}><Eye className="mr-2 h-4 w-4" />View Profile</DropdownMenuItem>
          <PermissionGate permission="teachers:update"><DropdownMenuItem onClick={() => openEdit(row.original)}><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem></PermissionGate>
          <PermissionGate permission="teachers:delete"><DropdownMenuItem className="text-destructive" onClick={() => handleDelete(row.original.id)}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem></PermissionGate>
        </DropdownMenuContent>
      </DropdownMenu>
    )},
  ]

  return (
    <ProtectedRoute permission="teachers:read">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Teachers</h1>
            <p className="mt-1 text-sm text-muted-foreground">Manage teaching staff ({total} total)</p>
          </div>
          <PermissionGate permission="teachers:create">
            <Button onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add Teacher</Button>
          </PermissionGate>
        </div>
        <DataTable columns={columns} data={teachers} isLoading={loading} emptyMessage="No teachers found."
          toolbar={<div className="flex items-center gap-4"><div className="relative max-w-sm flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input placeholder="Search teachers..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} className="pl-9" /></div></div>}
        />
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl overflow-y-auto max-h-[90vh]">
          <DialogHeader><DialogTitle>{editing ? 'Edit Teacher' : 'Add Teacher'}</DialogTitle></DialogHeader>
          {!editing && <CampusBadge />}
          <div className="grid gap-6 py-4">

            {/* Account & Employment */}
            <div className="space-y-4 border-b pb-4">
              <h3 className="font-semibold">Account & Employment</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {!editing && (
                  <div className="grid gap-2"><Label>Employee ID *</Label><Input value={form.employeeId} onChange={(e) => setForm({ ...form, employeeId: e.target.value })} placeholder="TCH-001" /></div>
                )}
                <div className="grid gap-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="teacher@school.com" /></div>
                <div className="grid gap-2"><Label>{editing ? 'New Password' : 'Password'}</Label><Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={editing ? 'Leave blank to keep' : 'Min 6 chars'} /></div>
                <div className="grid gap-2">
                  <Label>Role</Label>
                  <Select value={form.roleId} onValueChange={(v) => setForm({ ...form, roleId: v })}>
                    <SelectTrigger><SelectValue placeholder="Select Role" /></SelectTrigger>
                    <SelectContent>
                      {roles.map((r) => (
                        <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2"><Label>Designation</Label><Input value={form.designation} onChange={(e) => setForm({ ...form, designation: e.target.value })} placeholder="Senior Teacher" /></div>
                <div className="grid gap-2"><Label>Department</Label><Input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} placeholder="Science" /></div>
                <div className="grid gap-2"><Label>Salary</Label><Input type="number" value={form.salary} onChange={(e) => setForm({ ...form, salary: e.target.value })} placeholder="50000" /></div>
                <div className="grid gap-2"><Label>Join Date</Label><Input type="date" value={form.joinDate} onChange={(e) => setForm({ ...form, joinDate: e.target.value })} /></div>
                <div className="grid gap-2"><Label>Experience</Label><Input value={form.experience} onChange={(e) => setForm({ ...form, experience: e.target.value })} placeholder="5 years" /></div>
                <div className="grid gap-2">
                  <Label>Class Teacher Of</Label>
                  <Select value={form.classTeacherOfId} onValueChange={(v) => setForm({ ...form, classTeacherOfId: v === '__none__' ? '' : v })}>
                    <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">None</SelectItem>
                      {modalClasses.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {!editing && form.email && (
                <p className="text-xs text-muted-foreground">Providing email + password auto-creates a user login account for this teacher.</p>
              )}
            </div>

            {/* Personal Info */}
            <div className="space-y-4 border-b pb-4">
              <h3 className="font-semibold">Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="grid gap-2"><Label>First Name *</Label><Input value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} /></div>
                <div className="grid gap-2"><Label>Last Name *</Label><Input value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} /></div>
                <div className="grid gap-2"><Label>Father / Husband Name</Label><Input value={form.fatherHusbandName} onChange={(e) => setForm({ ...form, fatherHusbandName: e.target.value })} /></div>
                <div className="grid gap-2"><Label>CNIC</Label><Input value={form.cnic} onChange={(e) => setForm({ ...form, cnic: e.target.value })} placeholder="12345-6789012-3" /></div>
                <div className="grid gap-2"><Label>Father/Husband CNIC</Label><Input value={form.fatherHusbandCnic} onChange={(e) => setForm({ ...form, fatherHusbandCnic: e.target.value })} placeholder="12345-6789012-3" /></div>
                <div className="grid gap-2">
                  <Label>Gender</Label>
                  <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{genderOptions.map((g) => <SelectItem key={g} value={g}>{g.charAt(0) + g.slice(1).toLowerCase()}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2"><Label>Date of Birth</Label><Input type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} /></div>
                <div className="grid gap-2">
                  <Label>Marital Status</Label>
                  <Select value={form.maritalStatus} onValueChange={(v) => setForm({ ...form, maritalStatus: v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{maritalOptions.map((m) => <SelectItem key={m} value={m}>{m.charAt(0) + m.slice(1).toLowerCase()}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2"><Label>Blood Group</Label><Input value={form.bloodGroup} onChange={(e) => setForm({ ...form, bloodGroup: e.target.value })} placeholder="A+, O-, etc." /></div>
                <div className="grid gap-2">
                  <Label>Religion</Label>
                  <Select value={form.religion} onValueChange={(v) => setForm({ ...form, religion: v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Islam">Islam</SelectItem>
                      <SelectItem value="Christianity">Christianity</SelectItem>
                      <SelectItem value="Hinduism">Hinduism</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Qualifications */}
            <div className="space-y-4 border-b pb-4">
              <h3 className="font-semibold">Qualifications</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="grid gap-2"><Label>Qualification</Label><Input value={form.qualification} onChange={(e) => setForm({ ...form, qualification: e.target.value })} placeholder="M.Ed, PhD" /></div>
                <div className="grid gap-2"><Label>Qualification at Appointment</Label><Input value={form.qualificationAtAppt} onChange={(e) => setForm({ ...form, qualificationAtAppt: e.target.value })} placeholder="B.Ed" /></div>
                <div className="grid gap-2"><Label>Specialization / Subject</Label><Input value={form.specialization} onChange={(e) => setForm({ ...form, specialization: e.target.value })} placeholder="Mathematics" /></div>
              </div>
            </div>

            {/* Contact */}
            <div className="space-y-4">
              <h3 className="font-semibold">Contact</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+923001234567" /></div>
                <div className="grid gap-2"><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
                <div className="grid gap-2 md:col-span-2"><Label>Note</Label><Input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="Optional remarks" /></div>
              </div>
            </div>

          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleSave} disabled={saving || !form.firstName || !form.lastName || (!editing && !form.employeeId)}>
              {saving ? 'Saving...' : editing ? 'Update' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TeachingAssignmentsDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        teacherName={assignTeacher ? `${assignTeacher.firstName} ${assignTeacher.lastName}` : 'Teacher'}
        academicYearName={selectedYear?.name}
        availableClasses={availableClasses}
        selectedMap={selectedMap}
        saving={assignSaving}
        loading={assignLoading}
        onToggleClass={toggleClass}
        onToggleSection={toggleSection}
        onToggleSubject={toggleSubject}
        onToggleClassTeacher={toggleClassTeacher}
        onToggleSubjectTeacher={toggleSubjectTeacher}
        onSave={handleSaveClasses}
      />

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
