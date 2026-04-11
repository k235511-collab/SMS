'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { ProtectedRoute, PermissionGate } from '@/components/auth'
import { DataTable, type ColumnDef, type PaginationState, SortableHeader } from '@/components/ui/data-table'
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
import { StatusBadge } from '@/components/ui'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { api } from '@/lib/api-client'
import { studentsService, type StudentImportPreview } from '@/services/students.service'
import { cn } from '@/lib/utils'
import { Plus, Search, MoreHorizontal, Pencil, Trash2, FileText, ArrowUpRight, AlertTriangle, X, CreditCard, LogOut, Upload, Download } from 'lucide-react'
import { toast } from 'sonner'
import { StudentStats } from './components/student-stats'
import { StudentFilters } from './components/student-filters'
import { Checkbox } from '@/components/ui/checkbox'
import { useSession } from '@/context/session-context'
import { CampusBadge } from '@/components/campus-badge'
import useCampusRefetch from '@/hooks/useCampusRefetch'
import { usePermissions } from '@/hooks/use-permissions'
import { useConfirmDialog } from '@/hooks/useConfirmDialog'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

interface Student {
  id: string
  rollNumber: string
  firstName: string
  lastName: string
  dateOfBirth?: string
  gender?: string
  bloodGroup?: string
  guardianName?: string
  guardianPhone?: string
  guardianEmail?: string
  phone?: string
  address?: string
  isActive: boolean
  status: string
  createdAt: string
  balance: number
  class?: { id: string; name: string; code: string }
  section?: { id: string; name: string }
  parents?: { parent: { id: string; firstName: string; lastName: string; phone?: string } }[]
}

interface PaginatedResponse {
  data: Student[]
  meta: { total: number; page: number; pageSize: number; totalPages: number }
}

const genderOptions = ['MALE', 'FEMALE', 'OTHER']

/** Format phone to Pakistani format: +92 3XX XXXXXXX */
function formatPakistaniPhone(phone: string): string {
  // Strip all non-digit characters
  let digits = phone.replace(/\D/g, '')

  // Handle various input formats:
  // 03001234567 → 923001234567
  // 3001234567  → 923001234567
  // 923001234567 → 923001234567
  // 0092301234567 → 923001234567
  if (digits.startsWith('0092')) {
    digits = digits.slice(2) // remove leading 00
  }
  if (digits.startsWith('92') && digits.length >= 12) {
    // Already has country code
  } else if (digits.startsWith('0') && digits.length === 11) {
    digits = '92' + digits.slice(1)
  } else if (digits.length === 10 && digits.startsWith('3')) {
    digits = '92' + digits
  }

  // Format as +92 3XX XXXXXXX
  if (digits.startsWith('92') && digits.length === 12) {
    return `+${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`
  }

  // Fallback: return original if not a recognizable PK number
  return phone
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = window.URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.URL.revokeObjectURL(url)
}

export default function StudentsPage() {
  const router = useRouter()
  const { selectedYear, academicYears, selectedCampus, isLoading: sessionLoading } = useSession()
  const { can } = usePermissions()
  const canReadFinance = can('finance:read')
  const [students, setStudents] = useState<Student[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [statsLoading, setStatsLoading] = useState(true)
  const [stats, setStats] = useState<any>(null)

  const [search, setSearch] = useState('')
  const [filters, setFilters] = useState({ classId: '', sectionId: '', status: '', regNo: '', balanceMin: '', balanceMax: '' })

  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  })
  const [rowSelection, setRowSelection] = useState({})
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingStudent, setEditingStudent] = useState<Student | null>(null)
  const [saving, setSaving] = useState(false)

  // ── Promotion state ──
  const [promoteDialogOpen, setPromoteDialogOpen] = useState(false)
  const [promoting, setPromoting] = useState(false)
  const [targetYearId, setTargetYearId] = useState('')
  const [classMappings, setClassMappings] = useState<Record<string, { toClassId: string; toSectionId: string }>>({})
  const [allClassesWithSections, setAllClassesWithSections] = useState<{ id: string; name: string; sortOrder: number; sections: { id: string; name: string }[] }[]>([])
  const [pendingFeePreview, setPendingFeePreview] = useState<{ studentsWithPending: { studentId: string; name: string; rollNumber: string; pendingAmount: number }[]; totalPending: number; studentsWithPendingCount: number } | null>(null)

  // ── Mark as Left state ──
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false)
  const [leavingStudent, setLeavingStudent] = useState<Student | null>(null)
  const [leaveForm, setLeaveForm] = useState({ leaveDate: '', leaveReason: '' })
  const [markingAsLeft, setMarkingAsLeft] = useState(false)

  // ── Import / Export state ──
  const importFileInputRef = useRef<HTMLInputElement>(null)
  const [importDialogOpen, setImportDialogOpen] = useState(false)
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importPreview, setImportPreview] = useState<StudentImportPreview | null>(null)
  const [previewingImport, setPreviewingImport] = useState(false)
  const [importingStudents, setImportingStudents] = useState(false)
  const [downloadingTemplate, setDownloadingTemplate] = useState(false)
  const [exportingStudents, setExportingStudents] = useState(false)

  // Create/Edit Form State
  const [form, setForm] = useState({
    rollNumber: '', firstName: '', lastName: '', dateOfBirth: '',
    gender: '', bloodGroup: '', guardianName: '', guardianPhone: '',
    guardianEmail: '', address: '',
    classId: '', sectionId: '', status: 'ACTIVE',
    cnic: '', phone: '',
    group: '', religion: '', admissionNote: '', profileImage: '',
    parentId: '',
    documents: [] as string[],
    discountType: '' as '' | 'PERCENTAGE' | 'FIXED',
    discountValue: '' as string | number,
  })
  const [parents, setParents] = useState<{ id: string; firstName: string; lastName: string; phone?: string; cnic?: string; profession?: string }[]>([])
  const [parentSearch, setParentSearch] = useState('')
  const [parentSearching, setParentSearching] = useState(false)
  const [parentDropdownOpen, setParentDropdownOpen] = useState(false)
  const [selectedParentName, setSelectedParentName] = useState('')
  const parentDropdownRef = useRef<HTMLDivElement>(null)
  const [parentMode, setParentMode] = useState<'search' | 'create'>('search')
  const [parentForm, setParentForm] = useState({
    firstName: '', lastName: '', phone: '', gender: '', cnic: '',
    profession: '', qualification: '', address: '', relationship: 'FATHER' as string,
  })
  const [parentDuplicateMsg, setParentDuplicateMsg] = useState('')

  // Close parent dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (parentDropdownRef.current && !parentDropdownRef.current.contains(e.target as Node)) {
        setParentDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const fetchStudents = useCallback(async () => {
    setLoading(true)
    const res = await api.get<PaginatedResponse>('/students', {
      params: {
        page: pagination.pageIndex + 1,
        pageSize: pagination.pageSize,
        search: search || undefined,
        classId: filters.classId || undefined,
        sectionId: filters.sectionId || undefined,
        status: filters.status || undefined,
        regNo: filters.regNo || undefined,
        balanceMin: filters.balanceMin || undefined,
        balanceMax: filters.balanceMax || undefined,
        academicYearId: selectedYear?.id || undefined,
      },
    })
    if (res.success && res.data) {
      setStudents(res.data.data || [])
      setTotal(res.data.meta?.total || 0)
    }
    setLoading(false)
  }, [pagination, search, filters, selectedYear?.id, selectedCampus?.id])

  // ... existing state ...
  const [classes, setClasses] = useState<{ id: string, name: string }[]>([])
  const [sections, setSections] = useState<{ id: string, name: string }[]>([])

  // Fetch classes for the modal
  const fetchClasses = useCallback(async () => {
    const res = await api.get<any>('/academics/classes')
    if (res.success && res.data) {
      const list = Array.isArray(res.data)
        ? res.data
        : (Array.isArray(res.data.data) ? res.data.data : [])
      setClasses(list)
    }
  }, [])

  // Fetch sections when class changes in modal
  useEffect(() => {
    if (!form.classId) {
      setSections([])
      return
    }
    const fetchSections = async () => {
      const res = await api.get<any>(`/academics/sections/class/${form.classId}`)
      if (res.success && res.data) {
        setSections(Array.isArray(res.data) ? res.data : [])
      } else {
        setSections([])
      }
    }
    fetchSections()
  }, [form.classId])

  const fetchStats = useCallback(async () => {
    setStatsLoading(true)
    const res = await api.get<any>('/students/stats', {
      params: {
        academicYearId: selectedYear?.id || undefined,
      },
    })
    if (res.success && res.data) {
      setStats(res.data)
    }
    setStatsLoading(false)
  }, [selectedYear?.id, selectedCampus?.id])

  useEffect(() => {
    if (sessionLoading) return // Wait for academic year to load
    fetchStudents()
    fetchStats()
    fetchClasses()
  }, [fetchStudents, fetchStats, fetchClasses, sessionLoading])

  // Reset pagination when campus changes
  useCampusRefetch(() => {
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }, [])

  // Check for duplicate parent by CNIC or phone
  const checkParentDuplicate = useCallback(async (cnic: string, phone: string) => {
    if (!cnic && !phone) { setParentDuplicateMsg(''); return }
    try {
      const q = cnic || phone
      const res = await api.get<any>('/parents/search', { params: { q } })
      const matches = res.success && Array.isArray(res.data) ? res.data : []
      if (matches.length > 0) {
        const names = matches.map((p: any) => `${p.firstName} ${p.lastName}`).join(', ')
        setParentDuplicateMsg(`Parent already exists: ${names}. Please use the search field to select.`)
      } else {
        setParentDuplicateMsg('')
      }
    } catch {
      setParentDuplicateMsg('')
    }
  }, [])

  // Parent search for student form
  const searchParents = useCallback(async (query: string) => {
    setParentSearching(true)
    try {
      const res = await api.get<any>('/parents/search', { params: { q: query } })
      setParents(res.success && Array.isArray(res.data) ? res.data : [])
    } catch {
      setParents([])
    } finally {
      setParentSearching(false)
    }
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (parentSearch.trim()) {
        searchParents(parentSearch)
        setParentDropdownOpen(true)
      } else {
        searchParents('')
        setParentDropdownOpen(parentSearch !== undefined && parentSearch !== null)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [parentSearch, searchParents])

  const handleFilterChange = useCallback((newFilters: any) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
    setPagination(prev => ({ ...prev, pageIndex: 0 }))
  }, [])

  // ... openCreate ...

  const openEdit = (student: Student) => {
    setEditingStudent(student)
    // Try to get discount info from current enrollment or student-level data
    const enrollment = (student as any).enrollments?.[0]
    setForm({
      rollNumber: student.rollNumber, firstName: student.firstName, lastName: student.lastName,
      dateOfBirth: student.dateOfBirth?.slice(0, 10) || '', gender: student.gender || '',
      bloodGroup: student.bloodGroup || '', guardianName: student.guardianName || '',
      guardianPhone: student.guardianPhone || '', guardianEmail: student.guardianEmail || '',
      address: student.address || '',
      classId: student.class?.id || '',
      sectionId: student.section?.id || '',
      status: student.status || 'ACTIVE',
      cnic: (student as any).cnic || '',
      phone: (student as any).phone || '',
      group: (student as any).group || '',
      religion: (student as any).religion || '',
      admissionNote: (student as any).admissionNote || '',
      profileImage: (student as any).profileImage || '',
      parentId: '',
      documents: ((student as any).documents || []).map((d: any) => d.type),
      discountType: enrollment?.discountType || '',
      discountValue: enrollment?.discountValue != null ? String(enrollment.discountValue) : '',
    })
    setParentSearch('')
    setSelectedParentName('')
    setParents([])
    setParentMode('search')
    setParentForm({ firstName: '', lastName: '', phone: '', gender: '', cnic: '', profession: '', qualification: '', address: '', relationship: 'FATHER' })
    setParentDuplicateMsg('')
    // Load linked parents for this student to pre-populate
    api.get<any>(`/parents/student/${student.id}`).then((res: any) => {
      if (res.success && Array.isArray(res.data) && res.data.length > 0) {
        const first = res.data[0]
        setForm(f => ({ ...f, parentId: first.parentId }))
        setSelectedParentName(`${first.parent.firstName} ${first.parent.lastName}`)
      }
    }).catch(() => { })
    setDialogOpen(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      let parentId = form.parentId

      // If creating a new parent, do that first
      if (parentMode === 'create' && parentForm.firstName && parentForm.lastName) {
        if (parentDuplicateMsg) {
          toast.error('A parent with this CNIC/phone already exists. Please search and select them instead.')
          setSaving(false)
          return
        }
        const parentRes = await api.post<any>('/parents', {
          firstName: parentForm.firstName,
          lastName: parentForm.lastName,
          phone: parentForm.phone || undefined,
          gender: parentForm.gender || undefined,
          cnic: parentForm.cnic || undefined,
          profession: parentForm.profession || undefined,
          qualification: parentForm.qualification || undefined,
          address: parentForm.address || undefined,
          relationship: parentForm.relationship || undefined,
        })
        if (parentRes.success && parentRes.data?.id) {
          parentId = parentRes.data.id
        } else {
          toast.error(parentRes.message || 'Failed to create parent')
          setSaving(false)
          return
        }
      }

      const body = {
        ...form,
        dateOfBirth: form.dateOfBirth ? new Date(form.dateOfBirth).toISOString() : undefined,
        gender: form.gender || undefined,
        bloodGroup: form.bloodGroup || undefined,
        guardianName: form.guardianName || undefined,
        guardianPhone: form.guardianPhone || undefined,
        guardianEmail: form.guardianEmail || undefined,
        address: form.address || undefined,
        classId: form.classId || undefined,
        sectionId: form.sectionId || undefined,
        cnic: form.cnic || undefined,
        phone: form.phone || undefined,
        group: form.group || undefined,
        religion: form.religion || undefined,
        admissionNote: form.admissionNote || undefined,
        profileImage: form.profileImage || undefined,
        parentId: parentId || undefined,
        relationship: parentForm.relationship || undefined,
        documents: form.documents,
        discountType: (form.discountType && form.discountType !== 'NONE') ? form.discountType : undefined,
        discountValue: (form.discountType && form.discountType !== 'NONE' && form.discountValue) ? Number(form.discountValue) : undefined,
      } as any

      if (editingStudent) {
        delete body.rollNumber
      } else {
        // When creating, attach to the selected academic year
        if (selectedYear?.id) {
          body.academicYearId = selectedYear.id
        }
      }

      const res = editingStudent
        ? await api.patch(`/students/${editingStudent.id}`, body)
        : await api.post('/students', body)

      if (res.success) {
        toast.success(editingStudent ? 'Student updated' : 'Student enrolled')
        setDialogOpen(false)
        fetchStudents()
        fetchStats()
      } else {
        toast.error(res.message || 'Failed to save student')
      }
    } finally { setSaving(false) }
  }

  const confirmDialog = useConfirmDialog()

  const handleDelete = async (id: string) => {
    confirmDialog.showConfirm('Delete Student', 'Are you sure you want to delete this student?', async () => {
      const res = await api.delete(`/students/${id}`)
      if (res.success) {
        toast.success('Student deleted')
        fetchStudents()
        fetchStats()
      }
      else toast.error(res.message || 'Failed to delete')
    }, true)
  }

  const resetImportState = () => {
    setImportFile(null)
    setImportPreview(null)
    if (importFileInputRef.current) {
      importFileInputRef.current.value = ''
    }
  }

  const handleDownloadImportTemplate = async () => {
    setDownloadingTemplate(true)
    try {
      const { blob, fileName } = await studentsService.downloadImportTemplate()
      downloadBlob(blob, fileName)
      toast.success('Student import template downloaded')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to download import template')
    } finally {
      setDownloadingTemplate(false)
    }
  }

  const handlePreviewImport = async () => {
    if (!importFile) {
      toast.error('Please choose an Excel file first')
      return
    }

    setPreviewingImport(true)
    try {
      const preview = await studentsService.previewImport(importFile)
      setImportPreview(preview)
      if (preview.errors.length > 0) {
        toast.warning(`Validation completed with ${preview.errors.length} issue(s)`)
      } else {
        toast.success(`Validation passed for ${preview.summary.validRows} row(s)`)
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to preview import file')
    } finally {
      setPreviewingImport(false)
    }
  }

  const handleCommitImport = async () => {
    if (!importFile) {
      toast.error('Please choose an Excel file first')
      return
    }

    setImportingStudents(true)
    try {
      const result = await studentsService.commitImport(importFile)
      setImportPreview((prev) =>
        prev
          ? {
            ...prev,
            summary: result.summary,
            errors: result.errors,
          }
          : null,
      )

      if (result.failed > 0) {
        toast.warning(`Imported ${result.imported} row(s), ${result.failed} row(s) failed`)
      } else {
        toast.success(`Imported ${result.imported} student(s) successfully`)
      }

      if (result.imported > 0) {
        fetchStudents()
        fetchStats()
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to import students')
    } finally {
      setImportingStudents(false)
    }
  }

  const handleExport = async () => {
    setExportingStudents(true)
    try {
      const { blob, fileName } = await studentsService.exportExcel({
        search: search || undefined,
        classId: filters.classId || undefined,
        sectionId: filters.sectionId || undefined,
        status: filters.status || undefined,
        regNo: filters.regNo || undefined,
        balanceMin: filters.balanceMin || undefined,
        balanceMax: filters.balanceMax || undefined,
        academicYearId: selectedYear?.id || undefined,
      })

      downloadBlob(blob, fileName)
      toast.success('Students exported to Excel')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to export students')
    } finally {
      setExportingStudents(false)
    }
  }

  const handleBulkDelete = async () => {
    const selectedIndices = Object.keys(rowSelection)
    if (selectedIndices.length === 0) return
    confirmDialog.showConfirm(
      'Delete Students',
      `Are you sure you want to delete ${selectedIndices.length} students? This cannot be undone.`,
      async () => {
        setLoading(true)
        let successCount = 0
        for (const idx of selectedIndices) {
          const student = students[parseInt(idx)]
          if (student) {
            const res = await api.delete(`/students/${student.id}`)
            if (res.success) successCount++
          }
        }
        toast.success(`Deleted ${successCount} students`)
        setRowSelection({})
        fetchStudents()
        fetchStats()
      },
      true,
    )
  }

  // ── Mark as Left Logic ──

  const openLeaveDialog = (student: Student) => {
    setLeavingStudent(student)
    setLeaveForm({ leaveDate: new Date().toISOString().split('T')[0], leaveReason: '' })
    setLeaveDialogOpen(true)
  }

  const handleMarkAsLeft = async () => {
    if (!leavingStudent) return
    setMarkingAsLeft(true)
    try {
      const res = await api.patch(`/students/${leavingStudent.id}/mark-as-left`, {
        leaveDate: leaveForm.leaveDate ? new Date(leaveForm.leaveDate).toISOString() : undefined,
        leaveReason: leaveForm.leaveReason || undefined,
      })
      if (res.success) {
        toast.success(`${leavingStudent.firstName} ${leavingStudent.lastName} marked as left`)
        setLeaveDialogOpen(false)
        setLeavingStudent(null)
        fetchStudents()
        fetchStats()
      } else {
        toast.error((res as any).message || 'Failed to mark student as left')
      }
    } finally {
      setMarkingAsLeft(false)
    }
  }

  // ── Promotion Logic ──

  const fetchClassesWithSections = useCallback(async () => {
    const res = await api.get<any>('/academics/classes?pageSize=100')
    if (res.success && res.data) {
      const list = Array.isArray(res.data) ? res.data : (Array.isArray(res.data.data) ? res.data.data : [])
      // For each class, fetch its sections
      const withSections = await Promise.all(
        list.map(async (cls: any) => {
          const secRes = await api.get<any>(`/academics/sections/class/${cls.id}`)
          const sections = secRes.success && Array.isArray(secRes.data) ? secRes.data : []
          return { id: cls.id, name: cls.name, sortOrder: cls.sortOrder ?? 0, sections }
        })
      )
      withSections.sort((a, b) => a.sortOrder - b.sortOrder)
      setAllClassesWithSections(withSections)
      return withSections
    }
    return []
  }, [])

  const openPromoteDialog = async () => {
    const selectedIndices = Object.keys(rowSelection)
    if (selectedIndices.length === 0) return

    // Only show years that start AFTER the current year (true "next" years)
    const futureYears = academicYears
      .filter(y => y.id !== selectedYear?.id && new Date(y.startDate) > new Date(selectedYear?.startDate || 0))
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    if (futureYears.length === 0) {
      // No future academic year exists — redirect to create one
      toast.error('No future academic year found. Please create a new academic year first.')
      router.push('/dashboard/academics/years')
      return
    }

    // Fetch classes with sections for mapping
    const classesData = await fetchClassesWithSections()

    // Get unique classes of selected students
    const selectedStudents = selectedIndices.map(idx => students[parseInt(idx)]).filter(Boolean)
    const uniqueClassIds = [...new Set(selectedStudents.map(s => s.class?.id).filter(Boolean))] as string[]

    // Auto-suggest mappings: each class maps to the next class by sortOrder
    const initialMappings: Record<string, { toClassId: string; toSectionId: string }> = {}
    for (const fromClassId of uniqueClassIds) {
      const fromIdx = classesData.findIndex(c => c.id === fromClassId)
      const nextClass = fromIdx >= 0 && fromIdx < classesData.length - 1 ? classesData[fromIdx + 1] : null
      initialMappings[fromClassId] = {
        toClassId: nextClass?.id || '',
        toSectionId: '',
      }
    }
    setClassMappings(initialMappings)

    // Default target year: the nearest future year
    setTargetYearId(futureYears[0]?.id || '')

    // Fetch pending fee preview for selected students
    setPendingFeePreview(null)
    try {
      const previewRes = await api.post<any>('/students/promote/preview', {
        studentIds: selectedStudents.map(s => s.id),
      })
      if (previewRes.success && previewRes.data) {
        setPendingFeePreview(previewRes.data)
      }
    } catch {
      // Non-critical — proceed without preview
    }

    setPromoteDialogOpen(true)
  }

  const handlePromote = async () => {
    if (!selectedYear?.id || !targetYearId) return
    const selectedIndices = Object.keys(rowSelection)
    const selectedStudents = selectedIndices.map(idx => students[parseInt(idx)]).filter(Boolean)

    // Validate all mappings are set
    const uniqueClassIds = [...new Set(selectedStudents.map(s => s.class?.id).filter(Boolean))] as string[]
    const missingMappings = uniqueClassIds.filter(cid => !classMappings[cid]?.toClassId)
    if (missingMappings.length > 0) {
      toast.error('Please select a target class for all classes')
      return
    }

    setPromoting(true)
    try {
      const res = await api.post<any>('/students/promote', {
        studentIds: selectedStudents.map(s => s.id),
        fromYearId: selectedYear.id,
        toYearId: targetYearId,
        classMappings: uniqueClassIds.map(fromClassId => ({
          fromClassId,
          toClassId: classMappings[fromClassId].toClassId,
          toSectionId: classMappings[fromClassId].toSectionId || undefined,
        })),
      })

      if (res.success && res.data) {
        const { promoted, skipped, errors } = res.data
        if (promoted > 0) {
          toast.success(`${promoted} student${promoted > 1 ? 's' : ''} promoted successfully`)
        }
        if (skipped > 0) {
          toast.warning(`${skipped} student${skipped > 1 ? 's' : ''} skipped${errors?.length ? ': ' + errors.slice(0, 3).join(', ') : ''}`)
        }
        setPromoteDialogOpen(false)
        setRowSelection({})
        fetchStudents()
        fetchStats()
      } else {
        toast.error(res.message || 'Promotion failed')
      }
    } finally {
      setPromoting(false)
    }
  }

  const getTargetSections = (toClassId: string) => {
    return allClassesWithSections.find(c => c.id === toClassId)?.sections || []
  }

  const columns: ColumnDef<Student, unknown>[] = [
    {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          onClick={(e) => e.stopPropagation()}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: 'firstName',
      header: ({ column }) => <SortableHeader column={column}>Name</SortableHeader>,
      cell: ({ row }) => (
        <div className="flex min-w-[220px] flex-col py-1">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-foreground">{row.original.firstName} {row.original.lastName}</span>
            <StatusBadge status={row.original.status} />
          </div>
          <div className="text-[10px] text-muted-foreground flex flex-col gap-0.5 mt-0.5">
            <span>class: <span className="text-foreground">{row.original.class?.name || 'N/A'}</span>, section: <span className="text-foreground">{row.original.section?.name || 'N/A'}</span></span>
            <span>Reg.No: <span className="text-foreground">{row.original.rollNumber || 'N/A'}</span></span>
          </div>
        </div>
      )
    },
    {
      accessorKey: 'phone',
      header: () => <span className="whitespace-nowrap">WA No.</span>,
      cell: ({ row }) => {
        const raw = row.original.phone || row.original.guardianPhone || ''
        if (!raw) return <span className="text-muted-foreground">N/A</span>
        return <span className="tabular-nums whitespace-nowrap">{formatPakistaniPhone(raw)}</span>
      }
    },
    {
      id: 'fatherName',
      header: () => <span className="whitespace-nowrap">Father Name</span>,
      cell: ({ row }) => {
        const parent = row.original.parents?.[0]?.parent
        if (parent) return <span className="whitespace-nowrap">{parent.firstName} {parent.lastName}</span>
        return <span className="whitespace-nowrap">{row.original.guardianName || 'N/A'}</span>
      }
    },
    ...(canReadFinance ? [{
      accessorKey: 'balance' as const,
      header: ({ column }: any) => <SortableHeader column={column}>Balance</SortableHeader>,
      cell: ({ row }: any) => {
        const balance = row.original.balance || 0
        const invoices = (row.original as any).invoices
        const hasInvoices = invoices && invoices.length > 0

        if (balance === 0 && !hasInvoices) {
          return (
            <span className="text-xs text-muted-foreground">
              No Fee Vouchers
            </span>
          )
        }
        if (balance === 0) {
          return (
            <span className="font-medium text-emerald-600">
              Paid
            </span>
          )
        }
        return (
          <span className={cn(
            "font-medium tabular-nums",
            balance > 0 ? "text-red-500" : "text-emerald-600"
          )}>
            {balance > 0 ? `-${balance}` : `+${Math.abs(balance)}`}
          </span>
        )
      }
    }] : []),
    {
      id: 'options',
      header: () => <div className="text-right pr-1">Actions</div>,
      cell: ({ row }) => (
        <div className="flex min-w-[280px] items-center justify-end gap-2">
          {canReadFinance && (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="success"
              className="h-8 px-3 text-xs whitespace-nowrap"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/dashboard/students/${row.original.id}?tab=finance`)
              }}
            >
              <CreditCard className="mr-1 h-3 w-3" />Pay Fee
            </Button>
            <Button
              size="sm"
              variant="primary"
              className="h-8 px-3 text-xs whitespace-nowrap"
              onClick={(e) => {
                e.stopPropagation();
                toast.info(`Generating report for ${row.original.firstName}...`)
              }}
            >
              <FileText className="mr-1 h-3 w-3" />F.Report
            </Button>
          </div>
          )}

          <div className="ml-1 border-l pl-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); router.push(`/dashboard/students/${row.original.id}`) }}><Search className="mr-2 h-4 w-4" />View Profile</DropdownMenuItem>
                <PermissionGate permission="students:update"><DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEdit(row.original) }}><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem></PermissionGate>
                {row.original.status !== 'LEFT' && (
                  <PermissionGate permission="students:update"><DropdownMenuItem className="text-orange-600" onClick={(e) => { e.stopPropagation(); openLeaveDialog(row.original) }}><LogOut className="mr-2 h-4 w-4" />Mark as Left</DropdownMenuItem></PermissionGate>
                )}
                <PermissionGate permission="students:delete"><DropdownMenuItem className="text-destructive" onClick={(e) => { e.stopPropagation(); handleDelete(row.original.id) }}><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem></PermissionGate>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      )
    },
  ]

  return (
    <ProtectedRoute permission="students:read">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Students</h1>
            <p className="mt-1 text-sm text-muted-foreground">Manage student enrollment and records</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleExport} disabled={exportingStudents}>
              <Upload className="mr-2 h-4 w-4" />
              {exportingStudents ? 'Exporting...' : 'Export Excel'}
            </Button>
            <PermissionGate permission="students:create">
              <Button
                variant="outline"
                onClick={() => {
                  resetImportState()
                  setImportDialogOpen(true)
                }}
              >
                <Download className="mr-2 h-4 w-4" />Import Excel
              </Button>
              <Button onClick={() => {
                setEditingStudent(null)
                setForm({
                  rollNumber: '', firstName: '', lastName: '', dateOfBirth: '',
                  gender: '', bloodGroup: '', guardianName: '', guardianPhone: '',
                  guardianEmail: '', address: '', classId: '', sectionId: '', status: 'ACTIVE',
                  cnic: '', phone: '',
                  group: '', religion: '', admissionNote: '', profileImage: '',
                  parentId: '', documents: [],
                  discountType: '', discountValue: '',
                })
                setParentSearch('')
                setSelectedParentName('')
                setParents([])
                setParentMode('search')
                setParentForm({ firstName: '', lastName: '', phone: '', gender: '', cnic: '', profession: '', qualification: '', address: '', relationship: 'FATHER' })
                setParentDuplicateMsg('')
                setDialogOpen(true)
              }}><Plus className="mr-2 h-4 w-4" />Enroll Student</Button>
            </PermissionGate>
          </div>
        </div>

        {/* Stats Row */}
        <StudentStats stats={stats} loading={statsLoading} />

        {/* Filters and Table */}
        <div className="space-y-4">
          {/* Custom Filters Component */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <StudentFilters onFilterChange={handleFilterChange} />

            <div className="relative max-w-sm w-full sm:w-auto">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search name, roll..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value)
                  setPagination(prev => ({ ...prev, pageIndex: 0 }))
                }}
                className="pl-9 w-full sm:w-[250px]"
              />
            </div>
          </div>

          <DataTable
            columns={columns}
            data={students}
            onRowClick={(student: Student) => router.push(`/dashboard/students/${student.id}`)}
            isLoading={loading}
            rowCount={total}
            manualPagination={true}
            pagination={pagination}
            onPaginationChange={setPagination}
            emptyMessage="No students found matching your criteria."
            enableRowSelection={true}
            rowSelection={rowSelection}
            onRowSelectionChange={setRowSelection}
            toolbar={
              Object.keys(rowSelection).length > 0 && (
                <div className="flex items-center gap-2 rounded-lg bg-muted p-2 animate-in fade-in slide-in-from-top-1">
                  <span className="text-sm font-medium ml-2">{Object.keys(rowSelection).length} selected</span>
                  <div className="ml-auto flex gap-2">
                    <Button variant="outline" size="sm" onClick={openPromoteDialog}><ArrowUpRight className="mr-1 h-4 w-4" />Promote</Button>
                    <Button variant="destructive" size="sm" onClick={handleBulkDelete}>Delete</Button>
                  </div>
                </div>
              )
            }
          />
        </div>
      </div>

      <Dialog
        open={importDialogOpen}
        onOpenChange={(open) => {
          setImportDialogOpen(open)
          if (!open) {
            resetImportState()
          }
        }}
      >
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bulk Import Students</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <input
              ref={importFileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(event) => {
                const selected = event.target.files?.[0] || null
                setImportFile(selected)
                setImportPreview(null)
              }}
            />

            <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
              Download the template, fill students in the <span className="font-medium text-foreground">Students</span> sheet,
              then upload it here to validate and import.
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" onClick={handleDownloadImportTemplate} disabled={downloadingTemplate}>
                <Download className="mr-2 h-4 w-4" />
                {downloadingTemplate ? 'Downloading...' : 'Download Template'}
              </Button>
              <Button variant="outline" onClick={() => importFileInputRef.current?.click()}>
                <Upload className="mr-2 h-4 w-4" />Choose Excel File
              </Button>
              <span className="text-sm text-muted-foreground truncate max-w-[320px]">
                {importFile ? importFile.name : 'No file selected'}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={handlePreviewImport} disabled={!importFile || previewingImport || importingStudents}>
                {previewingImport ? 'Validating...' : 'Preview Import'}
              </Button>
              <Button onClick={handleCommitImport} disabled={!importFile || importingStudents || previewingImport}>
                {importingStudents ? 'Importing...' : 'Import Valid Rows'}
              </Button>
            </div>

            {importPreview && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-lg border p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Rows</p>
                    <p className="text-xl font-semibold">{importPreview.summary.totalRows}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Valid Rows</p>
                    <p className="text-xl font-semibold text-emerald-600">{importPreview.summary.validRows}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Invalid Rows</p>
                    <p className="text-xl font-semibold text-red-600">{importPreview.summary.invalidRows}</p>
                  </div>
                </div>

                {importPreview.validRows.length > 0 && (
                  <div className="rounded-lg border">
                    <div className="border-b px-3 py-2 text-sm font-medium">Sample Valid Rows</div>
                    <div className="max-h-56 overflow-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-muted/40 text-left">
                          <tr>
                            <th className="px-3 py-2 font-medium">Row</th>
                            <th className="px-3 py-2 font-medium">Roll</th>
                            <th className="px-3 py-2 font-medium">Name</th>
                            <th className="px-3 py-2 font-medium">Class</th>
                            <th className="px-3 py-2 font-medium">Section</th>
                          </tr>
                        </thead>
                        <tbody>
                          {importPreview.validRows.slice(0, 15).map((row) => (
                            <tr key={`${row.rowNumber}-${row.rollNumber}`} className="border-t">
                              <td className="px-3 py-2">{row.rowNumber}</td>
                              <td className="px-3 py-2">{row.rollNumber}</td>
                              <td className="px-3 py-2">{row.firstName} {row.lastName}</td>
                              <td className="px-3 py-2">{row.className}</td>
                              <td className="px-3 py-2">{row.sectionName}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {importPreview.errors.length > 0 && (
                  <div className="rounded-lg border border-red-200 bg-red-50/60 p-3">
                    <div className="text-sm font-medium text-red-700">Validation Errors</div>
                    <div className="mt-2 max-h-48 space-y-1 overflow-auto text-sm text-red-700">
                      {importPreview.errors.slice(0, 50).map((error, index) => (
                        <p key={`${error.rowNumber}-${error.field}-${index}`}>
                          Row {error.rowNumber} - {error.field}: {error.message}
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Close</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl overflow-y-auto max-h-[90vh]">
          <DialogHeader><DialogTitle>{editingStudent ? 'Edit Student' : 'Enroll Student'}</DialogTitle></DialogHeader>
          {!editingStudent && <CampusBadge />}
          <div className="grid gap-6 py-4">

            {/* Academic Info */}
            <div className="space-y-4 border-b pb-4">
              <h3 className="font-semibold">Academic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {!editingStudent && (
                  <div className="grid gap-2">
                    <Label htmlFor="rollNumber">Roll Number *</Label>
                    <Input id="rollNumber" value={form.rollNumber} onChange={(e) => setForm({ ...form, rollNumber: e.target.value })} placeholder="STU-001" />
                  </div>
                )}

                <div className="grid gap-2">
                  <Label>Class *</Label>
                  <Select value={form.classId} onValueChange={(v) => setForm({ ...form, classId: v, sectionId: '' })}>
                    <SelectTrigger><SelectValue placeholder="Select Class" /></SelectTrigger>
                    <SelectContent>
                      {classes.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>Section *</Label>
                  <Select value={form.sectionId} onValueChange={(v) => setForm({ ...form, sectionId: v })} disabled={!form.classId}>
                    <SelectTrigger><SelectValue placeholder="Select Section" /></SelectTrigger>
                    <SelectContent>
                      {sections.map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>Group</Label>
                  <Select value={form.group} onValueChange={(v) => setForm({ ...form, group: v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Science">Science</SelectItem>
                      <SelectItem value="Arts">Arts</SelectItem>
                      <SelectItem value="Commerce">Commerce</SelectItem>
                      <SelectItem value="General">General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ACTIVE">Active</SelectItem>
                      <SelectItem value="INACTIVE">Inactive</SelectItem>
                      <SelectItem value="LEFT">Left School</SelectItem>
                      <SelectItem value="TRANSFERRED">Transferred</SelectItem>
                      <SelectItem value="GRADUATED">Graduated</SelectItem>
                      <SelectItem value="SUSPENDED">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Fee Discount */}
            <div className="space-y-4 border-b pb-4">
              <h3 className="font-semibold">Fee Discount</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>Discount Type</Label>
                  <Select value={form.discountType} onValueChange={(v) => setForm({ ...form, discountType: v as '' | 'PERCENTAGE' | 'FIXED', discountValue: '' })}>
                    <SelectTrigger><SelectValue placeholder="No Discount" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">No Discount</SelectItem>
                      <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                      <SelectItem value="FIXED">Fixed Amount (Rs)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {form.discountType && form.discountType !== 'NONE' && (
                  <div className="grid gap-2">
                    <Label>{form.discountType === 'PERCENTAGE' ? 'Discount (%)' : 'Discount (Rs)'}</Label>
                    <Input
                      type="number"
                      min="0"
                      max={form.discountType === 'PERCENTAGE' ? '100' : undefined}
                      step={form.discountType === 'PERCENTAGE' ? '0.1' : '1'}
                      value={form.discountValue}
                      onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
                      placeholder={form.discountType === 'PERCENTAGE' ? 'e.g. 10' : 'e.g. 1000'}
                    />
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
                <div className="grid gap-2"><Label>Date of Birth</Label><Input type="date" value={form.dateOfBirth} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} /></div>
                <div className="grid gap-2">
                  <Label>Gender</Label>
                  <Select value={form.gender} onValueChange={(v) => setForm({ ...form, gender: v })}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>{genderOptions.map((g) => <SelectItem key={g} value={g}>{g.charAt(0) + g.slice(1).toLowerCase()}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2"><Label>CNIC / B-Form</Label><Input value={form.cnic} onChange={(e) => setForm({ ...form, cnic: e.target.value })} placeholder="12345-6789012-3" /></div>
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
                <div className="grid gap-2"><Label>Phone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+923001234567" /></div>
                <div className="grid gap-2 md:col-span-2"><Label>Address</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
              </div>
            </div>

            {/* Parent / Guardian */}
            <div className="space-y-4 border-b pb-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Parent / Guardian</h3>
                <div className="flex gap-1 rounded-lg border bg-muted p-1 text-sm font-medium">
                  <button
                    type="button"
                    className={`px-4 py-1.5 rounded-md transition-all ${parentMode === 'search' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                    onClick={() => setParentMode('search')}
                  >
                    Search Existing
                  </button>
                  <button
                    type="button"
                    className={`px-4 py-1.5 rounded-md transition-all ${parentMode === 'create' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                    onClick={() => { setParentMode('create'); setForm({ ...form, parentId: '' }); setSelectedParentName(''); setParentDuplicateMsg('') }}
                  >
                    Create New
                  </button>
                </div>
              </div>

              {parentMode === 'search' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                  <div className="grid gap-2" ref={parentDropdownRef} style={{ position: 'relative' }}>
                    <Label>Link Parent Account</Label>
                    {form.parentId ? (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-md border bg-primary/5 border-primary/30">
                        <div className="flex-1">
                          <span className="text-sm font-medium">{selectedParentName}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setForm({ ...form, parentId: '' })
                            setSelectedParentName('')
                            setParentSearch('')
                          }}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <Input
                          value={parentSearch}
                          onChange={(e) => {
                            const val = e.target.value
                            setParentSearch(val)
                            if (val.trim().length >= 2) {
                              setParentDropdownOpen(true)
                              searchParents(val)
                            } else {
                              setParentDropdownOpen(false)
                            }
                          }}
                          placeholder="Search by name, phone, CNIC..."
                        />
                        {parentDropdownOpen && parentSearch.trim().length >= 2 && (
                          <div className="absolute top-[calc(100%+2px)] left-0 right-0 z-50 max-h-52 overflow-y-auto bg-popover border rounded-md shadow-lg">
                            {parentSearching ? (
                              <div className="p-3 text-sm text-muted-foreground text-center">Searching...</div>
                            ) : parents.length === 0 ? (
                              <div className="p-3 text-sm text-muted-foreground text-center">
                                No parents found
                              </div>
                            ) : (
                              parents.map(p => (
                                <button
                                  key={p.id}
                                  type="button"
                                  className="w-full text-left px-3 py-2.5 hover:bg-accent hover:text-accent-foreground text-sm transition-colors border-b last:border-b-0"
                                  onClick={() => {
                                    setForm({ ...form, parentId: p.id })
                                    setSelectedParentName(`${p.firstName} ${p.lastName}`)
                                    setParentSearch('')
                                    setParentDropdownOpen(false)
                                  }}
                                >
                                  <div className="font-medium">{p.firstName} {p.lastName}</div>
                                  <div className="text-xs text-muted-foreground flex gap-3 mt-0.5">
                                    {p.phone && <span>{p.phone}</span>}
                                    {p.cnic && <span>CNIC: {p.cnic}</span>}
                                    {p.profession && <span>{p.profession}</span>}
                                  </div>
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </>
                    )}
                    <p className="text-xs text-muted-foreground">Search and select an existing parent to link</p>
                  </div>
                  <div className="grid gap-2">
                    <Label>Relationship <span className="text-red-500">*</span></Label>
                    <Select value={parentForm.relationship} onValueChange={v => setParentForm({ ...parentForm, relationship: v })}>
                      <SelectTrigger><SelectValue placeholder="Select relationship" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FATHER">Father</SelectItem>
                        <SelectItem value="MOTHER">Mother</SelectItem>
                        <SelectItem value="GUARDIAN">Guardian</SelectItem>
                        <SelectItem value="OTHER">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                /* Create New Parent inline */
                <div className="space-y-3">
                  {parentDuplicateMsg && (
                    <div className="flex items-start gap-2 p-3 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-sm">
                      <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                      <span>{parentDuplicateMsg}</span>
                    </div>
                  )}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="grid gap-1">
                      <Label>Parent First Name *</Label>
                      <Input value={parentForm.firstName} onChange={e => setParentForm({ ...parentForm, firstName: e.target.value })} />
                    </div>
                    <div className="grid gap-1">
                      <Label>Parent Last Name *</Label>
                      <Input value={parentForm.lastName} onChange={e => setParentForm({ ...parentForm, lastName: e.target.value })} />
                    </div>
                    <div className="grid gap-1">
                      <Label>Parent CNIC</Label>
                      <Input
                        value={parentForm.cnic}
                        onChange={e => {
                          const val = e.target.value
                          setParentForm({ ...parentForm, cnic: val })
                          checkParentDuplicate(val, parentForm.phone)
                        }}
                        placeholder="12345-6789012-3"
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label>Parent Phone</Label>
                      <Input
                        value={parentForm.phone}
                        onChange={e => {
                          const val = e.target.value
                          setParentForm({ ...parentForm, phone: val })
                          checkParentDuplicate(parentForm.cnic, val)
                        }}
                        placeholder="+923001234567"
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label>Gender</Label>
                      <Select value={parentForm.gender} onValueChange={v => setParentForm({ ...parentForm, gender: v })}>
                        <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MALE">Male</SelectItem>
                          <SelectItem value="FEMALE">Female</SelectItem>
                          <SelectItem value="OTHER">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-1">
                      <Label>Relationship <span className="text-red-500">*</span></Label>
                      <Select value={parentForm.relationship} onValueChange={v => setParentForm({ ...parentForm, relationship: v })}>
                        <SelectTrigger><SelectValue placeholder="Select relationship" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="FATHER">Father</SelectItem>
                          <SelectItem value="MOTHER">Mother</SelectItem>
                          <SelectItem value="GUARDIAN">Guardian</SelectItem>
                          <SelectItem value="OTHER">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-1">
                      <Label>Profession</Label>
                      <Input value={parentForm.profession} onChange={e => setParentForm({ ...parentForm, profession: e.target.value })} />
                    </div>
                    <div className="grid gap-1">
                      <Label>Qualification</Label>
                      <Input value={parentForm.qualification} onChange={e => setParentForm({ ...parentForm, qualification: e.target.value })} />
                    </div>
                    <div className="grid gap-1">
                      <Label>Parent Address</Label>
                      <Input value={parentForm.address} onChange={e => setParentForm({ ...parentForm, address: e.target.value })} />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">A new parent account will be created and linked to this student automatically.</p>
                </div>
              )}
            </div>

            {/* Admission Note */}
            <div className="space-y-4 border-b pb-4">
              <h3 className="font-semibold">Additional</h3>
              <div className="grid gap-2">
                <Label>Admission Note</Label>
                <Input value={form.admissionNote} onChange={(e) => setForm({ ...form, admissionNote: e.target.value })} placeholder="Optional notes about admission" />
              </div>
            </div>

            {/* Documents Checklist */}
            <div className="space-y-4">
              <h3 className="font-semibold">Documents Submitted</h3>
              <p className="text-xs text-muted-foreground -mt-2">Check the documents that have been submitted by the student</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { value: 'B_FORM', label: 'B-Form' },
                  { value: 'STUDENT_CNIC', label: 'Student CNIC' },
                  { value: 'FATHER_CNIC', label: 'Father CNIC' },
                  { value: 'GUARDIAN_CNIC', label: 'Guardian CNIC' },
                  { value: 'NOC', label: 'NOC' },
                  { value: 'MATRIC_RC', label: 'Matric Result Card' },
                  { value: 'INTER_RC', label: 'Inter Result Card' },
                  { value: 'GRADUATE_RC', label: 'Graduate Result Card' },
                  { value: 'SCHOOL_LC', label: 'School Leaving Certificate' },
                  { value: 'OTHER_DOC', label: 'Other Document' },
                ].map(doc => (
                  <label key={doc.value} className="flex items-center gap-2 cursor-pointer">
                    <Checkbox
                      checked={form.documents.includes(doc.value)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setForm({ ...form, documents: [...form.documents, doc.value] })
                        } else {
                          setForm({ ...form, documents: form.documents.filter((d: string) => d !== doc.value) })
                        }
                      }}
                    />
                    <span className="text-sm">{doc.label}</span>
                  </label>
                ))}
              </div>
            </div>

          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleSave} disabled={saving || !form.firstName || !form.lastName || !form.classId}>
              {saving ? 'Saving...' : editingStudent ? 'Update' : 'Enroll'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Promote Students Dialog ── */}
      <Dialog open={promoteDialogOpen} onOpenChange={setPromoteDialogOpen}>
        <DialogContent className="max-w-2xl overflow-y-auto max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUpRight className="h-5 w-5" />
              Promote Students
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 py-4">
            {/* Summary */}
            <div className="rounded-lg border bg-muted/50 p-4">
              <p className="text-sm font-medium">
                Promoting <span className="text-primary font-bold">{Object.keys(rowSelection).length}</span> student{Object.keys(rowSelection).length > 1 ? 's' : ''} from <span className="font-bold">{selectedYear?.name || '—'}</span>
              </p>
            </div>

            {/* Target Academic Year */}
            <div className="grid gap-2">
              <Label className="font-semibold">Target Academic Year *</Label>
              <Select value={targetYearId} onValueChange={setTargetYearId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select target year" />
                </SelectTrigger>
                <SelectContent>
                  {academicYears
                    .filter(y => y.id !== selectedYear?.id && new Date(y.startDate) > new Date(selectedYear?.startDate || 0))
                    .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
                    .map(y => (
                      <SelectItem key={y.id} value={y.id}>
                        {y.name} {y.isCurrent ? '(Current)' : ''}
                      </SelectItem>
                    ))
                  }
                </SelectContent>
              </Select>
              {academicYears.filter(y => y.id !== selectedYear?.id && new Date(y.startDate) > new Date(selectedYear?.startDate || 0)).length === 0 && (
                <div className="flex items-center gap-2 mt-2 rounded-md border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-3">
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-800 dark:text-amber-400">No target year available</p>
                    <p className="text-amber-700 dark:text-amber-500 mt-0.5">You need to create a new academic year before promoting students.</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2"
                      onClick={() => {
                        setPromoteDialogOpen(false)
                        router.push('/dashboard/academics/years')
                      }}
                    >
                      <Plus className="mr-1 h-3 w-3" /> Create Academic Year
                    </Button>
                  </div>
                </div>
              )}
            </div>

            {/* Class Mappings */}
            {Object.keys(classMappings).length > 0 && (
              <div className="grid gap-4">
                <Label className="font-semibold">Class Promotion Mapping</Label>
                <p className="text-xs text-muted-foreground -mt-2">Choose which class each group of students will be promoted to.</p>
                {Object.entries(classMappings).map(([fromClassId, mapping]) => {
                  const fromClass = allClassesWithSections.find(c => c.id === fromClassId)
                  const selectedStudentCount = Object.keys(rowSelection)
                    .map(idx => students[parseInt(idx)])
                    .filter(s => s?.class?.id === fromClassId).length
                  const targetSections = getTargetSections(mapping.toClassId)

                  return (
                    <div key={fromClassId} className="rounded-lg border p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium text-sm">{fromClass?.name || 'Unknown Class'}</span>
                          <span className="text-xs text-muted-foreground ml-2">({selectedStudentCount} student{selectedStudentCount > 1 ? 's' : ''})</span>
                        </div>
                        <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="grid gap-1.5">
                          <Label className="text-xs">Promote to Class *</Label>
                          <Select
                            value={mapping.toClassId}
                            onValueChange={(v) => setClassMappings(prev => ({
                              ...prev,
                              [fromClassId]: { ...prev[fromClassId], toClassId: v, toSectionId: '' },
                            }))}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Select class" />
                            </SelectTrigger>
                            <SelectContent>
                              {allClassesWithSections.map(c => (
                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="grid gap-1.5">
                          <Label className="text-xs">Section (optional)</Label>
                          <Select
                            value={mapping.toSectionId}
                            onValueChange={(v) => setClassMappings(prev => ({
                              ...prev,
                              [fromClassId]: { ...prev[fromClassId], toSectionId: v },
                            }))}
                            disabled={!mapping.toClassId || targetSections.length === 0}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Keep same / Any" />
                            </SelectTrigger>
                            <SelectContent>
                              {targetSections.map(s => (
                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Pending Fee Info (non-blocking — arrears carry forward automatically) */}
            {pendingFeePreview && pendingFeePreview.studentsWithPendingCount > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-800 p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-sm text-amber-800 dark:text-amber-300">
                      {pendingFeePreview.studentsWithPendingCount} of {Object.keys(rowSelection).length} student{Object.keys(rowSelection).length > 1 ? 's' : ''} have pending fees
                    </p>
                    <p className="text-xs text-amber-700 dark:text-amber-400 mt-0.5">
                      Total outstanding: <span className="font-bold">{pendingFeePreview.totalPending.toLocaleString()} PKR</span>
                    </p>
                    <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                      These dues will carry forward as arrears into the next academic year.
                    </p>
                  </div>
                </div>
                <div className="max-h-32 overflow-y-auto space-y-1.5">
                  {pendingFeePreview.studentsWithPending.map((s) => (
                    <div key={s.studentId} className="flex items-center justify-between text-xs px-2 py-1.5 rounded bg-amber-100/50 dark:bg-amber-900/20">
                      <span className="text-amber-800 dark:text-amber-300">
                        {s.rollNumber ? `${s.rollNumber} — ` : ''}{s.name}
                      </span>
                      <span className="font-semibold text-amber-700 dark:text-amber-400">
                        {s.pendingAmount.toLocaleString()} PKR
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button
              onClick={handlePromote}
              disabled={promoting || !targetYearId || Object.values(classMappings).some(m => !m.toClassId)}
            >
              {promoting ? 'Promoting...' : `Promote ${Object.keys(rowSelection).length} Student${Object.keys(rowSelection).length > 1 ? 's' : ''}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Mark as Left Dialog ── */}
      <Dialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LogOut className="h-5 w-5 text-orange-500" />
              Mark Student as Left
            </DialogTitle>
          </DialogHeader>
          {leavingStudent && (
            <div className="space-y-4">
              <div className="rounded-lg border p-3 bg-muted/50">
                <p className="font-medium">{leavingStudent.firstName} {leavingStudent.lastName}</p>
                <p className="text-sm text-muted-foreground">
                  {leavingStudent.class?.name || 'N/A'} &middot; {leavingStudent.section?.name || 'N/A'} &middot; Reg# {leavingStudent.rollNumber}
                </p>
              </div>
              <div className="space-y-3">
                <div className="grid gap-1.5">
                  <Label htmlFor="leaveDate">Leave Date</Label>
                  <Input
                    id="leaveDate"
                    type="date"
                    value={leaveForm.leaveDate}
                    onChange={(e) => setLeaveForm(f => ({ ...f, leaveDate: e.target.value }))}
                  />
                </div>
                <div className="grid gap-1.5">
                  <Label htmlFor="leaveReason">Reason (optional)</Label>
                  <Input
                    id="leaveReason"
                    placeholder="e.g. Family relocated, Financial reasons..."
                    value={leaveForm.leaveReason}
                    onChange={(e) => setLeaveForm(f => ({ ...f, leaveReason: e.target.value }))}
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                This will change the student&apos;s status to &quot;Left&quot; and stop future fee generation. Historical records (attendance, exams, payments) will be preserved.
              </p>
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button
              variant="destructive"
              onClick={handleMarkAsLeft}
              disabled={markingAsLeft}
            >
              {markingAsLeft ? 'Processing...' : 'Mark as Left'}
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
    </ProtectedRoute>
  )
}
