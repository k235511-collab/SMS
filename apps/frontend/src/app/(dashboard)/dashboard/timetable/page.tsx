'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useSession } from '@/context/session-context'
import { useAuth } from '@/context/auth-context'
import { teachersService } from '@/services/teachers.service'
import useCampusRefetch from '@/hooks/useCampusRefetch'
import { ProtectedRoute, PermissionGate } from '@/components/auth'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardBody } from '@/components/ui/card'
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
import { Spinner } from '@/components/ui/spinner'
import { SelectEmptyItem, SelectLoadingItem } from '@/components/ui/select-state-items'
import { api } from '@/lib/api-client'
import { Plus, X, Settings, RotateCcw, Trash2, Pencil, User, CalendarClock, Printer } from 'lucide-react'
import * as XLSX from 'xlsx'
import { toast } from 'sonner'
import { CampusBadge } from '@/components/campus-badge'
import { useConfirmDialog } from '@/hooks/useConfirmDialog'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

const WEEK_DAYS = [
  { index: 1, short: 'Mon', full: 'Monday' },
  { index: 2, short: 'Tue', full: 'Tuesday' },
  { index: 3, short: 'Wed', full: 'Wednesday' },
  { index: 4, short: 'Thu', full: 'Thursday' },
  { index: 5, short: 'Fri', full: 'Friday' },
  { index: 6, short: 'Sat', full: 'Saturday' },
]

const ALL_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const SUBJECT_COLORS = [
  { bg: 'bg-surface-blue', border: 'border-blue-500/20', text: 'text-blue-500', badge: 'bg-blue-500/10 text-blue-500' },
  { bg: 'bg-surface-emerald', border: 'border-emerald-500/20', text: 'text-emerald-500', badge: 'bg-emerald-500/10 text-emerald-500' },
  { bg: 'bg-surface-violet', border: 'border-violet-500/20', text: 'text-violet-500', badge: 'bg-violet-500/10 text-violet-500' },
  { bg: 'bg-surface-amber', border: 'border-amber-500/20', text: 'text-amber-500', badge: 'bg-amber-500/10 text-amber-500' },
  { bg: 'bg-surface-rose', border: 'border-rose-500/20', text: 'text-rose-500', badge: 'bg-rose-500/10 text-rose-500' },
  { bg: 'bg-surface-sky', border: 'border-sky-500/20', text: 'text-sky-500', badge: 'bg-sky-500/10 text-sky-500' },
  { bg: 'bg-surface-blue', border: 'border-indigo-500/20', text: 'text-indigo-500', badge: 'bg-indigo-500/10 text-indigo-500' },
  { bg: 'bg-surface-rose', border: 'border-pink-500/20', text: 'text-pink-500', badge: 'bg-pink-500/10 text-pink-500' },
  { bg: 'bg-surface-emerald', border: 'border-teal-500/20', text: 'text-teal-500', badge: 'bg-teal-500/10 text-teal-500' },
]

interface PeriodTemplate {
  id: string; label: string; startTime: string; endTime: string; sortOrder: number; isBreak: boolean
}
interface TimetableSlot {
  id: string; dayOfWeek: number; startTime: string; endTime: string; room?: string
  subject?: { id: string; name: string; code: string }
  teacher?: { id: string; firstName: string; lastName: string }
  section?: { id: string; name: string; class?: { id: string; name: string } }
}
interface ClassItem { id: string; name: string; code: string; sections?: SectionItem[] }
interface SectionItem { id: string; name: string }
interface SubjectItem { id: string; name: string; code: string; classId?: string | null }
interface TeacherItem { id: string; firstName: string; lastName: string; employeeId: string; isFree?: boolean }
interface PaginatedResponse<T> { data: T[]; meta: { total: number; page: number; pageSize: number; totalPages: number } }

type ViewMode = 'class' | 'teacher' | 'today'

interface TeacherAssignment {
  id: string
  classId: string
  class: { id: string; name: string }
  section?: { id: string; name: string }
  subject?: { id: string; name: string }
}

export default function TimetablePage() {
  const { user } = useAuth()
  const { selectedCampus, selectedYear } = useSession()
  const isTeacher = !!user?.teacherId
  
  // ── Shared state ──────────────────────────────────────────────────────────
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [allSubjects, setAllSubjects] = useState<SubjectItem[]>([])
  const [allTeachers, setAllTeachers] = useState<TeacherItem[]>([])
  const [periods, setPeriods] = useState<PeriodTemplate[]>([])
  const [referencesLoading, setReferencesLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>(isTeacher ? 'today' : 'class')
  const [assignments, setAssignments] = useState<TeacherAssignment[]>([])

  // ── Class timetable state ─────────────────────────────────────────────────
  const [selectedClassId, setSelectedClassId] = useState('')
  const [selectedSectionId, setSelectedSectionId] = useState('')
  const [sections, setSections] = useState<SectionItem[]>([])
  const [sectionsLoading, setSectionsLoading] = useState(false)
  const [slots, setSlots] = useState<TimetableSlot[]>([])
  const [loading, setLoading] = useState(false)

  // ── Teacher view state ────────────────────────────────────────────────────
  const [selectedTeacherId, setSelectedTeacherId] = useState(isTeacher ? user?.teacherId || '' : '')
  const [classTeacherOfId, setClassTeacherOfId] = useState<string | null>(null)
  const [teacherSlots, setTeacherSlots] = useState<TimetableSlot[]>([])
  const [teacherLoading, setTeacherLoading] = useState(false)

  // ── Slot dialog state ─────────────────────────────────────────────────────
  const [slotDialogOpen, setSlotDialogOpen] = useState(false)
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [availableTeachers, setAvailableTeachers] = useState<TeacherItem[]>([])
  const [availableTeachersLoading, setAvailableTeachersLoading] = useState(false)
  const [form, setForm] = useState({
    dayOfWeek: '1', startTime: '08:00', endTime: '08:45',
    subjectId: '', teacherId: '', room: '',
  })

  // ── Period settings dialog ────────────────────────────────────────────────
  const [periodDialogOpen, setPeriodDialogOpen] = useState(false)
  const [editingPeriod, setEditingPeriod] = useState<PeriodTemplate | null>(null)
  const [periodForm, setPeriodForm] = useState({ label: '', startTime: '', endTime: '', isBreak: false })
  const [periodSaving, setPeriodSaving] = useState(false)

  // ── Mobile day state ──────────────────────────────────────────────────────
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(() => {
    const day = new Date().getDay()
    return day === 0 ? 1 : day // Map Sunday to Monday
  })

  // ── Computed ──────────────────────────────────────────────────────────────
  const selectedClassName = classes.find(c => c.id === selectedClassId)?.name
  const selectedSectionName = sections.find(s => s.id === selectedSectionId)?.name
  const selectedTeacherName = allTeachers.find((t) => t.id === selectedTeacherId)
  const printDate = new Date().toLocaleString()

  // Filtered classes for teachers
  const availableClasses = useMemo(() => {
    if (!isTeacher) return classes
    // Combine everything we know about the teacher's classes
    const classMap = new Map<string, any>()
    
    // 1. From active teaching assignments
    assignments.forEach(a => {
      const cls = (a as any).class
      if (cls?.id) {
        classMap.set(cls.id, { ...cls })
      } else if (a.classId) {
        // Fallback to searching in 'classes' list if we have it
        const found = classes.find(c => c.id === a.classId)
        if (found) classMap.set(found.id, found)
      }
    })

    // 2. From Class Teacher role
    const ctId = classTeacherOfId || user?.classTeacherOfId
    if (ctId) {
      const found = classes.find(c => c.id === ctId)
      if (found) {
        classMap.set(found.id, found)
      } else {
        // Find in assignments just in case it's there but missed
        const asgn = assignments.find(a => a.classId === ctId || (a as any).class?.id === ctId)
        if ((asgn as any)?.class) classMap.set((asgn as any).class.id, (asgn as any).class)
      }
    }

    return Array.from(classMap.values())
  }, [isTeacher, classes, assignments, classTeacherOfId, user?.classTeacherOfId])

  // Filter subjects for the selected class (classId matches or classId is null for school-wide)
  const classSubjects = useMemo(() => {
    if (!selectedClassId) return allSubjects
    return allSubjects.filter(s => s.classId === selectedClassId || !s.classId)
  }, [allSubjects, selectedClassId])

  const subjectColorMap = useMemo(() => {
    const activeSlots = viewMode === 'class' ? slots : teacherSlots
    const map: Record<string, typeof SUBJECT_COLORS[0]> = {}
    const ids = [...new Set(activeSlots.map(s => s.subject?.id).filter(Boolean))] as string[]
    ids.forEach((id, i) => { map[id] = SUBJECT_COLORS[i % SUBJECT_COLORS.length] })
    return map
  }, [slots, teacherSlots, viewMode])

  // Slot lookup for class view: dayIndex-start-end → slot (single)
  const slotLookup = useMemo(() => {
    const map: Record<string, TimetableSlot> = {}
    slots.forEach(s => {
      const key = `${s.dayOfWeek}-${s.startTime}-${s.endTime}`
      map[key] = s // only keep last (should be 1 per cell)
    })
    return map
  }, [slots])

  // Slot lookup for teacher view
  const teacherSlotLookup = useMemo(() => {
    const map: Record<string, TimetableSlot> = {}
    teacherSlots.forEach(s => {
      const key = `${s.dayOfWeek}-${s.startTime}-${s.endTime}`
      map[key] = s
    })
    return map
  }, [teacherSlots])

  // Get current day's slots for "Today" view
  const todaySlots = useMemo(() => {
    const todayNum = new Date().getDay()
    // Map JS 0-6 (Sun-Sat) to Timetable 1-6 (Mon-Sat). Sunday maps to 0 or 1.
    // Assuming weekend is handled, we'll just use the number if it's 1-6.
    if (todayNum === 0) return [] // Sunday
    return teacherSlots
      .filter(s => s.dayOfWeek === todayNum)
      .sort((a, b) => a.startTime.localeCompare(b.startTime))
  }, [teacherSlots])

  // ── Data fetching ─────────────────────────────────────────────────────────

  const fetchReferences = useCallback(async () => {
    setReferencesLoading(true)
    try {
      const [classRes, subRes, teachRes, periodRes] = await Promise.all([
        api.get<PaginatedResponse<ClassItem>>('/academics/classes', { params: { pageSize: 100 } }),
        api.get<PaginatedResponse<SubjectItem>>('/academics/subjects', { params: { pageSize: 100 } }),
        api.get<PaginatedResponse<TeacherItem>>('/teachers', { params: { pageSize: 100 } }),
        api.get<PeriodTemplate[]>('/timetable/periods'),
      ])
      if (classRes.success && classRes.data) {
        const cls = classRes.data.data || classRes.data
        setClasses(Array.isArray(cls) ? cls : [])
      }
      if (subRes.success && subRes.data) {
        const subs = subRes.data.data || subRes.data
        setAllSubjects(Array.isArray(subs) ? subs : [])
      }
      if (teachRes.success && teachRes.data) {
        const t = teachRes.data.data || teachRes.data
        setAllTeachers(Array.isArray(t) ? t : [])
      }
      if (periodRes.success && periodRes.data) {
        setPeriods(Array.isArray(periodRes.data) ? periodRes.data : [])
      }

      // Fetch teacher assignments and profile if role matches
      if (isTeacher) {
        const [assignRes, profileRes] = await Promise.all([
          teachersService.getMyClasses(),
          teachersService.getMyProfile()
        ])
        
        if (assignRes.success && assignRes.data) {
          const assignData = Array.isArray(assignRes.data) ? assignRes.data : (assignRes.data as any).data || []
          setAssignments(assignData)
          
          // Merge missing classes from assignments into the main 'classes' state
          setClasses(prev => {
            const newClasses = [...prev]
            assignData.forEach((a: any) => {
              if (a.class && !newClasses.some(c => c.id === a.class.id)) {
                newClasses.push(a.class)
              }
            })
            return newClasses
          })
        }
        if (profileRes.success && profileRes.data) {
          const profile = profileRes.data.data || profileRes.data
          const ctId = profile.classTeacherOfId || null
          setClassTeacherOfId(ctId)
          
          // If classTeacherOf is an object, add it to classes
          if (profile.classTeacherOf && typeof profile.classTeacherOf === 'object') {
            setClasses(prev => {
              if (!prev.some(c => c.id === profile.classTeacherOf.id)) {
                return [...prev, profile.classTeacherOf]
              }
              return prev
            })
          } else if (ctId) {
            // If we only have the ID, try to fetch class details specifically with sections
            const res = await api.get<any>(`/academics/classes/${ctId}`, { params: { include: 'sections' } })
            if (res.success && res.data) {
              const cls = res.data.data || res.data
              setClasses(prev => {
                if (!prev.some(c => c.id === cls.id)) return [...prev, cls]
                // If it already exists but doesn't have sections, update it
                return prev.map(c => c.id === cls.id ? { ...c, ...cls } : c)
              })
            }
          }
        }
      }
    } finally {
      setReferencesLoading(false)
    }
  }, [selectedCampus?.id, isTeacher])

  // Sync selectedTeacherId for teachers
  useEffect(() => {
    if (isTeacher && user?.teacherId && !selectedTeacherId) {
      setSelectedTeacherId(user.teacherId)
    }
  }, [isTeacher, user?.teacherId, selectedTeacherId])

  // Use shared hook to refetch references when campus changes
  useCampusRefetch(() => { fetchReferences() }, [])

  // Fetch sections when class changes
  useEffect(() => {
    if (!selectedClassId) {
      setSections([])
      setSelectedSectionId('')
      setSectionsLoading(false)
      return
    }

    const fetchAllSections = async () => {
      setSectionsLoading(true)
      try {
        const cls = classes.find(c => c.id === selectedClassId)
        if (cls?.sections && cls.sections.length > 0) {
          setSections(cls.sections)
          return
        }

        const res = await api.get<SectionItem[]>(`/academics/sections/class/${selectedClassId}`)
        if (res.success && res.data) {
          const data = Array.isArray(res.data) ? res.data : (res.data as any).data || []
          setSections(data)
          return
        }

        // If general API fails, try to see if assignments have anything
        const assignedSections = assignments
          .filter(a => (a.classId === selectedClassId || (a as any).class?.id === selectedClassId) && (a as any).section)
          .map(a => (a as any).section!)

        if (assignedSections.length > 0) {
          const uniqueSections = assignedSections.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i)
          setSections(uniqueSections)
        } else {
          console.error('Failed to fetch sections:', res.message)
        }
      } catch (err) {
        console.error('Error in fetchAllSections:', err)
      } finally {
        setSectionsLoading(false)
      }
    }

    if (isTeacher) {
      const assignedSectionsForThisClass = assignments
        .filter(a => (a.classId === selectedClassId || (a as any).class?.id === selectedClassId) && (a as any).section)
        .map(a => (a as any).section!)

      const uniqueAssigned = assignedSectionsForThisClass.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i)

      const isAssigned = uniqueAssigned.length > 0 ||
                        classTeacherOfId === selectedClassId ||
                        user?.classTeacherOfId === selectedClassId

      if (isAssigned) {
        fetchAllSections().then(() => {
          setSections(prev => {
            if (prev.length === 0 && uniqueAssigned.length > 0) return uniqueAssigned
            return prev
          })
        })
      } else {
        setSections([])
        setSectionsLoading(false)
      }
      return
    }

    fetchAllSections()
  }, [selectedClassId, classes, isTeacher, assignments, classTeacherOfId, user?.classTeacherOfId])

  // Fetch section timetable
  useEffect(() => {
    if (!selectedSectionId) { setSlots([]); return }
    setLoading(true)
    api.get<TimetableSlot[]>(`/timetable/section/${selectedSectionId}`).then(res => {
      if (res.success && res.data) setSlots(Array.isArray(res.data) ? res.data : [])
      setLoading(false)
    })
  }, [selectedSectionId])

  // Fetch teacher timetable
  useEffect(() => {
    if (!selectedTeacherId) { setTeacherSlots([]); return }
    setTeacherLoading(true)
    api.get<any>(`/timetable/teacher/${selectedTeacherId}/schedule`).then(res => {
      if (res.success && res.data) {
        setTeacherSlots(Array.isArray(res.data.slots) ? res.data.slots : [])
      }
      setTeacherLoading(false)
    })
  }, [selectedTeacherId])

  const refetchSlots = async () => {
    const fresh = await api.get<TimetableSlot[]>(`/timetable/section/${selectedSectionId}`)
    if (fresh.success && fresh.data) setSlots(Array.isArray(fresh.data) ? fresh.data : [])
  }

  // ── Fetch teacher availability when form day/time changes ─────────────────
  useEffect(() => {
    if (!slotDialogOpen || !form.dayOfWeek || !form.startTime || !form.endTime) {
      setAvailableTeachers([])
      setAvailableTeachersLoading(false)
      return
    }

    let cancelled = false
    setAvailableTeachersLoading(true)
    api.get<TeacherItem[]>('/timetable/teachers/availability', {
      params: { dayOfWeek: form.dayOfWeek, startTime: form.startTime, endTime: form.endTime }
    }).then(res => {
      if (cancelled) return
      if (res.success && res.data) setAvailableTeachers(Array.isArray(res.data) ? res.data : [])
      else setAvailableTeachers([])
    }).finally(() => {
      if (!cancelled) setAvailableTeachersLoading(false)
    })

    return () => {
      cancelled = true
    }
  }, [slotDialogOpen, form.dayOfWeek, form.startTime, form.endTime])

  // ── Slot Dialog Handlers ──────────────────────────────────────────────────

  const openAddDialog = (dayIndex: number, start: string, end: string) => {
    setEditingSlotId(null)
    setForm({ dayOfWeek: String(dayIndex), startTime: start, endTime: end, subjectId: '', teacherId: '', room: '' })
    setSlotDialogOpen(true)
  }

  const openEditDialog = (slot: TimetableSlot) => {
    setEditingSlotId(slot.id)
    setForm({
      dayOfWeek: String(slot.dayOfWeek),
      startTime: slot.startTime,
      endTime: slot.endTime,
      subjectId: slot.subject?.id || '',
      teacherId: slot.teacher?.id || '',
      room: slot.room || '',
    })
    setSlotDialogOpen(true)
  }

  const handleSaveSlot = async () => {
    if (!selectedSectionId) return
    setSaving(true)
    try {
      if (editingSlotId) {
        // Update
        const res = await api.patch(`/timetable/${editingSlotId}`, {
          dayOfWeek: parseInt(form.dayOfWeek),
          startTime: form.startTime,
          endTime: form.endTime,
          subjectId: form.subjectId,
          teacherId: form.teacherId || null,
          room: form.room || null,
        })
        if (res.success) {
          toast.success('Slot updated')
          setSlotDialogOpen(false)
          await refetchSlots()
        } else {
          toast.error(res.message || 'Failed to update slot')
        }
      } else {
        // Create
        const res = await api.post('/timetable', {
          dayOfWeek: parseInt(form.dayOfWeek),
          startTime: form.startTime,
          endTime: form.endTime,
          sectionId: selectedSectionId,
          subjectId: form.subjectId,
          teacherId: form.teacherId || undefined,
          room: form.room || undefined,
        })
        if (res.success) {
          toast.success('Slot added')
          setSlotDialogOpen(false)
          await refetchSlots()
        } else {
          toast.error(res.message || 'Failed to add slot')
        }
      }
    } finally {
      setSaving(false)
    }
  }

  const confirmDialog = useConfirmDialog()

  const handleDeleteSlot = async (id: string) => {
    confirmDialog.showConfirm('Delete Timetable Slot', 'Are you sure you want to delete this timetable slot?', async () => {
      const res = await api.delete(`/timetable/${id}`)
      if (res.success) {
        toast.success('Slot deleted')
        setSlots(prev => prev.filter(s => s.id !== id))
      } else {
        toast.error(res.message || 'Failed to delete')
      }
    }, true)
  }

  // ── Period Template Handlers ──────────────────────────────────────────────

  const fetchPeriods = async () => {
    const res = await api.get<PeriodTemplate[]>('/timetable/periods')
    if (res.success && res.data) setPeriods(Array.isArray(res.data) ? res.data : [])
  }

  const openAddPeriod = () => {
    setEditingPeriod(null)
    setPeriodForm({ label: '', startTime: '', endTime: '', isBreak: false })
    setPeriodDialogOpen(true)
  }

  const openEditPeriod = (p: PeriodTemplate) => {
    setEditingPeriod(p)
    setPeriodForm({ label: p.label, startTime: p.startTime, endTime: p.endTime, isBreak: p.isBreak })
    setPeriodDialogOpen(true)
  }

  const handleSavePeriod = async () => {
    setPeriodSaving(true)
    try {
      if (editingPeriod) {
        const res = await api.patch(`/timetable/periods/${editingPeriod.id}`, periodForm)
        if (res.success) { toast.success('Period updated'); setPeriodDialogOpen(false); await fetchPeriods() }
        else toast.error(res.message || 'Failed')
      } else {
        const res = await api.post('/timetable/periods', periodForm)
        if (res.success) { toast.success('Period added'); setPeriodDialogOpen(false); await fetchPeriods() }
        else toast.error(res.message || 'Failed')
      }
    } finally { setPeriodSaving(false) }
  }

  const handleDeletePeriod = async (id: string) => {
    confirmDialog.showConfirm('Delete Period', 'Are you sure you want to delete this period?', async () => {
      const res = await api.delete(`/timetable/periods/${id}`)
      if (res.success) { toast.success('Period deleted'); await fetchPeriods() }
      else toast.error(res.message || 'Failed')
    }, true)
  }

  const handleResetPeriods = async () => {
    confirmDialog.showConfirm('Reset Periods', 'Reset all periods to defaults? This will remove custom periods.', async () => {
      const res = await api.post('/timetable/periods/reset', {})
      if (res.success) { toast.success('Periods reset'); await fetchPeriods() }
      else toast.error(res.message || 'Failed')
    }, true)
  }

  // ── Period Settings Panel (inline) ────────────────────────────────────────
  const [showPeriodSettings, setShowPeriodSettings] = useState(false)
  const handlePrint = () => window.print()

  const buildSlotSummary = (slot: TimetableSlot | undefined) => {
    if (!slot) return ''
    const parts = [
      slot.subject?.name || '',
      slot.teacher ? `${slot.teacher.firstName} ${slot.teacher.lastName}` : '',
      slot.room ? `Room: ${slot.room}` : '',
    ].filter(Boolean)
    return parts.join(' | ')
  }

  const sanitizeSheetName = (name: string) => name.replace(/[\\/?*[\]:]/g, '_').slice(0, 31) || 'Timetable'

  const handleExportExcel = () => {
    const workbook = XLSX.utils.book_new()
    const data: (string | number)[][] = []

    const contextLine = [
      `Campus: ${selectedCampus?.name || 'All'}`,
      `Academic Year: ${selectedYear?.name || 'N/A'}`,
      `Printed At: ${printDate}`,
    ].join(' | ')

    data.push(['Timetable Export'])
    data.push([contextLine])
    data.push([`View: ${viewMode === 'class' ? 'Class' : viewMode === 'teacher' ? 'Weekly Teacher' : 'Today'}`])
    data.push([])

    if (viewMode === 'class') {
      if (!selectedSectionId) {
        toast.error('Please select class and section before exporting')
        return
      }

      data.push(['Class', selectedClassName || '-'])
      data.push(['Section', selectedSectionName || '-'])
      data.push([])
      data.push(['Time', ...WEEK_DAYS.map((day) => day.full)])

      for (const period of periods) {
        if (period.isBreak) {
          data.push([`${period.label} (${period.startTime}-${period.endTime})`, 'BREAK', '', '', '', '', ''])
          continue
        }

        const row: (string | number)[] = [`${period.label} (${period.startTime}-${period.endTime})`]
        for (const day of WEEK_DAYS) {
          const key = `${day.index}-${period.startTime}-${period.endTime}`
          row.push(buildSlotSummary(slotLookup[key]))
        }
        data.push(row)
      }
    } else if (viewMode === 'teacher') {
      if (!selectedTeacherId) {
        toast.error('Please select a teacher before exporting')
        return
      }

      const teacherName = selectedTeacherName
        ? `${selectedTeacherName.firstName} ${selectedTeacherName.lastName}`
        : 'Unknown Teacher'

      data.push(['Teacher', teacherName])
      data.push([])
      data.push(['Time', ...WEEK_DAYS.map((day) => day.full)])

      for (const period of periods) {
        if (period.isBreak) {
          data.push([`${period.label} (${period.startTime}-${period.endTime})`, 'BREAK', '', '', '', '', ''])
          continue
        }

        const row: (string | number)[] = [`${period.label} (${period.startTime}-${period.endTime})`]
        for (const day of WEEK_DAYS) {
          const key = `${day.index}-${period.startTime}-${period.endTime}`
          const slot = teacherSlotLookup[key]
          if (!slot) {
            row.push('')
            continue
          }

          const extraClassInfo = slot.section?.class?.name && slot.section?.name
            ? `${slot.section.class.name} - ${slot.section.name}`
            : ''

          row.push([buildSlotSummary(slot), extraClassInfo].filter(Boolean).join(' | '))
        }
        data.push(row)
      }
    } else {
      data.push(['Day', ALL_DAYS[new Date().getDay()]])
      data.push([])
      data.push(['Time', 'Subject', 'Teacher', 'Class', 'Section', 'Room'])

      for (const slot of todaySlots) {
        data.push([
          `${slot.startTime}-${slot.endTime}`,
          slot.subject?.name || '',
          slot.teacher ? `${slot.teacher.firstName} ${slot.teacher.lastName}` : '',
          slot.section?.class?.name || '',
          slot.section?.name || '',
          slot.room || '',
        ])
      }

      if (todaySlots.length === 0) {
        data.push(['No classes scheduled for today'])
      }
    }

    const worksheet = XLSX.utils.aoa_to_sheet(data)
    worksheet['!cols'] = [
      { wch: 28 },
      { wch: 24 },
      { wch: 24 },
      { wch: 24 },
      { wch: 24 },
      { wch: 24 },
      { wch: 24 },
    ]

    const fileBase =
      viewMode === 'class'
        ? `timetable-${selectedClassName || 'class'}-${selectedSectionName || 'section'}`
        : viewMode === 'teacher'
          ? `timetable-teacher-${selectedTeacherName?.firstName || 'unknown'}`
          : 'timetable-today'

    XLSX.utils.book_append_sheet(workbook, worksheet, sanitizeSheetName('Timetable'))
    XLSX.writeFile(workbook, `${fileBase}.xlsx`)
    toast.success('Timetable exported to Excel')
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const renderSlotCell = (slot: TimetableSlot | undefined, dayIndex: number, period: PeriodTemplate, isMobile = false) => {
    if (slot) {
      const colors = subjectColorMap[slot.subject?.id || ''] || SUBJECT_COLORS[0]
      return (
        <div className={`group/slot relative rounded-lg border ${colors.border} ${colors.bg} p-2 transition-all hover:shadow-md cursor-pointer active:scale-[0.98] ${isMobile ? 'min-h-[56px] flex items-center shadow-sm w-full' : ''}`}
          onClick={() => viewMode === 'class' && openEditDialog(slot)}
        >
          <div className={`flex w-full items-start justify-between ${isMobile ? 'gap-3' : 'gap-1'}`}>
            <div className="min-w-0 flex-1">
              <p className={`font-semibold ${colors.text} truncate ${isMobile ? 'text-sm mb-0.5' : 'text-xs'}`}>
                {slot.subject?.name || 'Unknown'}
              </p>
              {slot.teacher && (
                <p className={`text-muted-foreground truncate flex items-center gap-1 ${isMobile ? 'text-xs' : 'text-[10px] mt-0.5'}`}>
                  {isMobile && <User className="h-3 w-3 inline opacity-70" />}
                  {slot.teacher.firstName} {slot.teacher.lastName}
                </p>
              )}
              {viewMode === 'teacher' && slot.section && (
                <p className={`text-muted-foreground truncate ${isMobile ? 'text-xs' : 'text-[10px] mt-0.5'}`}>
                  {slot.section.class?.name} — {slot.section.name}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end justify-between h-full gap-2 shrink-0">
              {slot.room && (
                <span className={`inline-block rounded font-medium ${colors.badge} ${isMobile ? 'px-2 py-0.5 text-xs' : 'px-1 py-0.5 mt-1 text-[9px]'}`}>
                  {slot.room}
                </span>
              )}
              {viewMode === 'class' && (
                <PermissionGate permission="academics:delete">
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteSlot(slot.id) }}
                    className={`no-print rounded text-muted-foreground/60 hover:bg-destructive/10 hover:text-destructive transition-colors ${isMobile ? 'p-1.5 bg-card/50 backdrop-blur-sm active:scale-[0.90]' : 'p-0.5 invisible group-hover/slot:visible'}`}
                    title="Delete slot"
                  >
                    <X className={isMobile ? "h-4 w-4" : "h-3 w-3"} />
                  </button>
                </PermissionGate>
              )}
            </div>
          </div>
        </div>
      )
    }

    // Empty cell — show add button (only in class view)
    if (viewMode === 'class') {
      return (
        <PermissionGate permission="academics:create">
          <button
            onClick={() => openAddDialog(dayIndex, period.startTime, period.endTime)}
            className={`no-print flex w-full items-center justify-center rounded-lg border border-dashed text-muted-foreground/40 transition-all hover:border-primary/50 hover:bg-primary/5 hover:text-primary active:scale-[0.98] ${isMobile ? 'min-h-[56px] border-border bg-muted/20' : 'h-full min-h-[3.5rem] border-transparent'}`}
          >
            <Plus className={isMobile ? "h-5 w-5" : "h-4 w-4"} />
            {isMobile && <span className="ml-2 text-sm font-medium">Add Class</span>}
          </button>
        </PermissionGate>
      )
    }

    // Teacher view — free period
    return (
      <div className={`flex items-center justify-center rounded-lg bg-surface-emerald/30 border border-dashed border-emerald-500/20 ${isMobile ? 'min-h-[50px] w-full' : 'h-full min-h-[3.5rem]'}`}>
        <span className="text-xs text-emerald-500 font-medium tracking-wide">Free</span>
      </div>
    )
  }

  const renderDesktopGrid = (lookup: Record<string, TimetableSlot>) => (
    <div className="hidden sm:block print:block overflow-x-auto print:overflow-visible rounded-xl print:rounded-none border border-border print:border-0 bg-card print:bg-transparent shadow-sm print:shadow-none">
      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 w-28 border-b border-r border-border bg-muted/50 px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Time
            </th>
            {WEEK_DAYS.map(day => (
              <th key={day.index} className="border-b border-border bg-muted/50 px-2 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground" style={{ minWidth: '140px' }}>
                <span>{day.full}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {periods.map(period => {
            if (period.isBreak) {
              return (
                <tr key={period.id}>
                  <td colSpan={WEEK_DAYS.length + 1} className="border-b border-border bg-surface-amber/30 px-3 py-2 text-center">
                    <span className="text-xs font-bold text-amber-500">
                      {period.label} ({period.startTime} – {period.endTime})
                    </span>
                  </td>
                </tr>
              )
            }

            return (
              <tr key={period.id} className="group hover:bg-muted/30 transition-colors">
                <td className="sticky left-0 z-10 border-b border-r border-border bg-card px-3 py-2 group-hover:bg-muted/30 transition-colors">
                  <div className="text-xs font-medium text-foreground">{period.label}</div>
                  <div className="text-[10px] text-muted-foreground">{period.startTime} – {period.endTime}</div>
                </td>
                {WEEK_DAYS.map(day => {
                  const key = `${day.index}-${period.startTime}-${period.endTime}`
                  const slot = lookup[key]
                  return (
                    <td key={day.index} className="border-b border-border px-1.5 py-1.5 align-top" style={{ minWidth: '140px' }}>
                      {renderSlotCell(slot, day.index, period, false)}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )

  const renderMobileGrid = (lookup: Record<string, TimetableSlot>) => (
    <div className="sm:hidden print:hidden space-y-5 -mx-4 px-4 pb-8">
      <div className="flex space-x-2 overflow-x-auto pb-3 scrollbar-hide pt-1">
        {WEEK_DAYS.map(day => (
          <button
            key={day.index}
            onClick={() => setSelectedDayIndex(day.index)}
            className={`whitespace-nowrap px-4 py-2.5 text-sm font-bold transition-all min-w-[56px] min-h-[44px] rounded-full active:scale-[0.96] shadow-sm border ${
              selectedDayIndex === day.index
                ? 'bg-primary text-primary-foreground border-primary ring-2 ring-primary/20 ring-offset-1'
                : 'bg-card text-muted-foreground border-border active:bg-muted'
            }`}
          >
            {day.full}
          </button>
        ))}
      </div>
      
      <div className="space-y-3.5">
        {periods.map(period => {
          if (period.isBreak) {
            return (
              <div key={period.id} className="rounded-xl border border-amber-500/20 bg-surface-amber/30 p-3 flex flex-col items-center justify-center min-h-[44px] shadow-sm">
                 <span className="text-sm font-bold text-amber-500">{period.label}</span>
                 <span className="text-xs text-amber-500/80 mt-0.5">{period.startTime} – {period.endTime}</span>
              </div>
            )
          }

          const key = `${selectedDayIndex}-${period.startTime}-${period.endTime}`
          const slot = lookup[key]

          return (
            <div key={period.id} className="flex gap-4">
               <div className="w-16 flex-shrink-0 pt-2.5 text-right">
                 <div className="text-sm font-bold text-foreground">{period.startTime}</div>
                 <div className="text-[10px] text-muted-foreground mt-0.5 font-medium">{period.endTime}</div>
               </div>
               <div className="flex-1 min-w-0">
                 {renderSlotCell(slot, selectedDayIndex, period, true)}
               </div>
            </div>
          )
        })}
      </div>
    </div>
  )

  const renderTodaySchedule = () => {
    if (teacherLoading) {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex gap-4">
                <div className="w-10 pt-1"><Skeleton className="h-4 w-full" /></div>
                <div className="flex-1"><Skeleton className="h-16 w-full rounded-xl" /></div>
              </div>
            ))}
          </div>
        </div>
      )
    }

    if (todaySlots.length === 0) {
      return (
        <Card>
          <CardBody className="py-16 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <CalendarClock className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">No classes today</p>
            <p className="mt-1 text-xs text-muted-foreground">Enjoy your free time!</p>
          </CardBody>
        </Card>
      )
    }

    const now = new Date()
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-lg font-semibold text-foreground">Today&apos;s Timeline</h2>
          <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider">
            {ALL_DAYS[new Date().getDay()]}
          </Badge>
        </div>
        <div className="relative space-y-4 before:absolute before:left-[17px] before:top-2 before:h-[calc(100%-16px)] before:w-[2px] before:bg-border">
          {todaySlots.map((slot, idx) => {
            const colors = subjectColorMap[slot.subject?.id || ''] || SUBJECT_COLORS[0]
            const isActive = currentTime >= slot.startTime && currentTime <= slot.endTime
            const isPast = currentTime > slot.endTime

            return (
              <div key={slot.id} className="relative pl-10">
                {/* Timeline Dot */}
                <div className={`absolute left-0 top-3 h-[36px] w-[36px] rounded-full border-4 border-card flex items-center justify-center z-10 transition-colors ${
                  isActive ? 'bg-primary text-primary-foreground' : 
                  isPast ? 'bg-muted text-muted-foreground' : 'bg-border text-foreground'
                }`}>
                   <span className="text-[10px] font-bold">{idx + 1}</span>
                </div>

                <Card className={`transition-all duration-300 ${isActive ? 'ring-2 ring-primary ring-offset-2 scale-[1.01] shadow-lg' : isPast ? 'opacity-60 saturate-50' : 'hover:shadow-md'}`}>
                  <CardBody className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className={`font-bold text-base truncate ${colors.text}`}>{slot.subject?.name}</h3>
                          {isActive && (
                            <Badge className="bg-primary text-primary-foreground animate-pulse text-[10px]">CURRENT</Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <CalendarClock className="h-3 w-3" />
                            {slot.startTime} – {slot.endTime}
                          </span>
                          <span className="flex items-center gap-1 font-medium bg-muted/50 px-2 py-0.5 rounded">
                            {slot.section?.class?.name} — {slot.section?.name}
                          </span>
                        </div>
                      </div>
                      {slot.room && (
                        <div className={`rounded-lg px-2.5 py-1 text-xs font-bold shrink-0 ${colors.badge}`}>
                          {slot.room}
                        </div>
                      )}
                    </div>
                  </CardBody>
                </Card>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const renderGrid = (lookup: Record<string, TimetableSlot>, isLoading: boolean) => {
    if (isLoading) {
      return (
        <div className="flex justify-center py-12">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary-600 border-t-transparent" />
        </div>
      )
    }

    return (
      <div className="w-full">
        {renderDesktopGrid(lookup)}
        {renderMobileGrid(lookup)}
      </div>
    )
  }

  return (
    <ProtectedRoute permission="timetable:read">
      <div className="print-target space-y-6 print:space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between no-print">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Timetable</h1>
            <p className="mt-1 text-sm text-muted-foreground">View and manage class timetables</p>
          </div>
          <div className="flex items-center gap-2">
            {/* View Toggle */}
            <div className="flex rounded-lg border border-border bg-muted/30 p-0.5">
              {isTeacher && (
                <button
                  onClick={() => setViewMode('today')}
                  className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === 'today' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  <CalendarClock className="h-3.5 w-3.5" />
                  Today
                </button>
              )}
              <button
                onClick={() => setViewMode('class')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === 'class' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <Plus className="h-3.5 w-3.5" />
                Class
              </button>
              <button
                onClick={() => setViewMode('teacher')}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${viewMode === 'teacher' ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              >
                <User className="h-3.5 w-3.5" />
                Weekly
              </button>
            </div>
            {/* Period Settings */}
            <PermissionGate permission="academics:update">
              <Button variant="outline" size="sm" onClick={() => setShowPeriodSettings(!showPeriodSettings)}>
                <Settings className="mr-1.5 h-3.5 w-3.5" />
                Periods
              </Button>
            </PermissionGate>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer className="mr-1.5 h-3.5 w-3.5" />
              Print
            </Button>
            <Button variant="outline" size="sm" onClick={handleExportExcel}>
              Export Excel
            </Button>
          </div>
        </div>

        <div className="hidden print:block border-b pb-3">
          <h1 className="text-xl font-bold">Timetable</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Campus: {selectedCampus?.name || 'All'} | Academic Year: {selectedYear?.name || 'N/A'}
          </p>
          <p className="text-xs text-muted-foreground">
            View: {viewMode === 'class' ? 'Class' : viewMode === 'teacher' ? 'Weekly Teacher' : 'Today'}
            {viewMode === 'class' && selectedClassName && selectedSectionName
              ? ` | ${selectedClassName} - Section ${selectedSectionName}`
              : ''}
            {viewMode === 'teacher' && selectedTeacherName
              ? ` | ${selectedTeacherName.firstName} ${selectedTeacherName.lastName}`
              : ''}
          </p>
          <p className="text-xs text-muted-foreground">Printed: {printDate}</p>
        </div>

        {/* Period Settings Panel */}
        {showPeriodSettings && (
          <Card className="no-print">
            <CardBody className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Period Configuration</h3>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleResetPeriods}>
                    <RotateCcw className="mr-1.5 h-3 w-3" /> Reset Defaults
                  </Button>
                  <Button size="sm" onClick={openAddPeriod}>
                    <Plus className="mr-1.5 h-3 w-3" /> Add Period
                  </Button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="px-3 py-2 text-xs font-medium text-muted-foreground">Label</th>
                      <th className="px-3 py-2 text-xs font-medium text-muted-foreground">Start</th>
                      <th className="px-3 py-2 text-xs font-medium text-muted-foreground">End</th>
                      <th className="px-3 py-2 text-xs font-medium text-muted-foreground">Type</th>
                      <th className="px-3 py-2 text-xs font-medium text-muted-foreground w-20">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {periods.map(p => (
                      <tr key={p.id} className="border-b border-border/50 last:border-0">
                        <td className="px-3 py-2 font-medium">{p.label}</td>
                        <td className="px-3 py-2 text-muted-foreground">{p.startTime}</td>
                        <td className="px-3 py-2 text-muted-foreground">{p.endTime}</td>
                        <td className="px-3 py-2">
                          {p.isBreak ? (
                            <Badge variant="secondary" className="text-[10px]">Break</Badge>
                          ) : (
                            <Badge className="bg-primary-100 text-primary-700 text-[10px]">Class</Badge>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex gap-1">
                            <button onClick={() => openEditPeriod(p)} className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
                              <Pencil className="h-3 w-3" />
                            </button>
                            <button onClick={() => handleDeletePeriod(p.id)} className="rounded p-1 text-muted-foreground hover:bg-red-50 hover:text-red-600">
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </Card>
        )}

        {/* ── CLASS VIEW ─────────────────────────────────────────────────────── */}
        {viewMode === 'class' && (
          <>
            <div className="flex flex-wrap items-end gap-4">
              <div className="w-full sm:w-52">
                <Label className="mb-2">Class</Label>
                <Select value={selectedClassId} onValueChange={v => { setSelectedClassId(v); setSelectedSectionId('') }} disabled={referencesLoading}>
                  <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                   <SelectContent>
                    {referencesLoading ? (
                      <SelectLoadingItem label="Loading classes..." />
                    ) : availableClasses.length > 0 ? (
                      availableClasses.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)
                    ) : (
                      <SelectEmptyItem label="No classes available" />
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className="w-full sm:w-52">
                <Label className="mb-2">Section</Label>
                <Select value={selectedSectionId} onValueChange={setSelectedSectionId} disabled={!selectedClassId || sectionsLoading}>
                  <SelectTrigger><SelectValue placeholder={sectionsLoading ? 'Loading sections...' : 'Select section'} /></SelectTrigger>
                  <SelectContent>
                    {!selectedClassId ? (
                      <SelectEmptyItem label="Select a class first" />
                    ) : sectionsLoading ? (
                      <SelectLoadingItem label="Loading sections..." />
                    ) : sections.length > 0 ? (
                      sections.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)
                    ) : (
                      <SelectEmptyItem label="No sections available" />
                    )}
                  </SelectContent>
                </Select>
              </div>
              {selectedClassName && selectedSectionName && (
                <Badge variant="secondary" className="mb-0.5 text-xs">{selectedClassName} — Section {selectedSectionName}</Badge>
              )}
            </div>

            {!selectedSectionId ? (
          <Card className="no-print">
                <CardBody className="py-16 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                    <CalendarClock className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-foreground">No timetable selected</p>
                  <p className="mt-1 text-xs text-muted-foreground">Select a class and section above to view or create a timetable</p>
                </CardBody>
              </Card>
            ) : (
              renderGrid(slotLookup, loading)
            )}
          </>
        )}

        {/* ── TEACHER VIEW ───────────────────────────────────────────────────── */}
        {viewMode === 'teacher' && (
          <>
            {!isTeacher && (
              <div className="no-print flex flex-wrap items-end gap-4 mb-6">
                <div className="w-full sm:w-64">
                  <Label className="mb-2">Teacher</Label>
                  <Select value={selectedTeacherId} onValueChange={setSelectedTeacherId} disabled={referencesLoading}>
                    <SelectTrigger><SelectValue placeholder="Select teacher" /></SelectTrigger>
                    <SelectContent>
                      {referencesLoading ? (
                        <SelectLoadingItem label="Loading teachers..." />
                      ) : allTeachers.length > 0 ? (
                        allTeachers.map(t => (
                          <SelectItem key={t.id} value={t.id}>{t.firstName} {t.lastName} ({t.employeeId})</SelectItem>
                        ))
                      ) : (
                        <SelectEmptyItem label="No teachers available" />
                      )}
                    </SelectContent>
                  </Select>
                </div>
                {selectedTeacherId && (
                  <Badge variant="secondary" className="mb-0.5 text-xs">
                    {allTeachers.find(t => t.id === selectedTeacherId)?.firstName} {allTeachers.find(t => t.id === selectedTeacherId)?.lastName}
                  </Badge>
                )}
              </div>
            )}

            {!selectedTeacherId ? (
              <Card>
                <CardBody className="py-16 text-center">
                  <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                    <User className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-foreground">Select a teacher</p>
                  <p className="mt-1 text-xs text-muted-foreground">Choose a teacher to view their weekly schedule and free periods</p>
                </CardBody>
              </Card>
            ) : (
              renderGrid(teacherSlotLookup, teacherLoading)
            )}
          </>
        )}

        {/* ── TODAY VIEW ───────────────────────────────────────────────────── */}
        {viewMode === 'today' && (
           <div className="max-w-2xl mx-auto">
             {renderTodaySchedule()}
           </div>
        )}
      </div>

      {/* ── Add/Edit Slot Dialog ─────────────────────────────────────────────── */}
      <Dialog open={slotDialogOpen} onOpenChange={setSlotDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingSlotId ? 'Edit Timetable Slot' : 'Add Timetable Slot'}</DialogTitle>
            <p className="text-sm text-muted-foreground">
              {ALL_DAYS[parseInt(form.dayOfWeek)]}, {form.startTime} – {form.endTime}
            </p>
          </DialogHeader>
          {(referencesLoading || availableTeachersLoading) && (
            <div className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              <Spinner size="sm" />
              <span>{referencesLoading ? 'Loading timetable references...' : 'Checking teacher availability...'}</span>
            </div>
          )}
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Day *</Label>
              <Select value={form.dayOfWeek} onValueChange={v => setForm({ ...form, dayOfWeek: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ALL_DAYS.map((day, i) => <SelectItem key={i} value={String(i)}>{day}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Start Time *</Label>
                <Input type="time" value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>End Time *</Label>
                <Input type="time" value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Subject *</Label>
              <Select value={form.subjectId} onValueChange={v => setForm({ ...form, subjectId: v })} disabled={referencesLoading}>
                <SelectTrigger><SelectValue placeholder={referencesLoading ? 'Loading subjects...' : 'Select subject'} /></SelectTrigger>
                <SelectContent>
                  {referencesLoading ? (
                    <SelectLoadingItem label="Loading subjects..." />
                  ) : classSubjects.length > 0 ? (
                    classSubjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name} ({s.code})</SelectItem>)
                  ) : (
                    <SelectEmptyItem label="No subjects available" />
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Teacher</Label>
              <Select value={form.teacherId} onValueChange={v => setForm({ ...form, teacherId: v })} disabled={availableTeachersLoading}>
                <SelectTrigger><SelectValue placeholder={availableTeachersLoading ? 'Loading teachers...' : 'Select teacher (optional)'} /></SelectTrigger>
                <SelectContent>
                  {availableTeachersLoading ? (
                    <SelectLoadingItem label="Loading teachers..." />
                  ) : availableTeachers.length > 0 ? (
                    availableTeachers.map(t => (
                      <SelectItem key={t.id} value={t.id} disabled={!t.isFree && t.id !== form.teacherId}>
                        <span className={!t.isFree && t.id !== form.teacherId ? 'text-muted-foreground line-through' : ''}>
                          {t.firstName} {t.lastName}
                        </span>
                        {!t.isFree && t.id !== form.teacherId && (
                          <span className="ml-2 text-[10px] text-red-500">(Busy)</span>
                        )}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectEmptyItem label="No teachers available" />
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Room</Label>
              <Input value={form.room} onChange={e => setForm({ ...form, room: e.target.value })} placeholder="e.g. Room 101" />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleSaveSlot} isLoading={saving} disabled={!form.subjectId || !form.startTime || !form.endTime}>
              {saving ? 'Saving...' : editingSlotId ? 'Update Slot' : 'Add Slot'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add/Edit Period Dialog ───────────────────────────────────────────── */}
      <Dialog open={periodDialogOpen} onOpenChange={setPeriodDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{editingPeriod ? 'Edit Period' : 'Add Period'}</DialogTitle>
          </DialogHeader>
          {!editingPeriod && <CampusBadge />}
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Label *</Label>
              <Input value={periodForm.label} onChange={e => setPeriodForm({ ...periodForm, label: e.target.value })} placeholder="e.g. Period 9" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Start Time *</Label>
                <Input type="time" value={periodForm.startTime} onChange={e => setPeriodForm({ ...periodForm, startTime: e.target.value })} />
              </div>
              <div className="grid gap-2">
                <Label>End Time *</Label>
                <Input type="time" value={periodForm.endTime} onChange={e => setPeriodForm({ ...periodForm, endTime: e.target.value })} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox" id="isBreak" checked={periodForm.isBreak}
                onChange={e => setPeriodForm({ ...periodForm, isBreak: e.target.checked })}
                className="h-4 w-4 rounded border-border"
              />
              <Label htmlFor="isBreak" className="text-sm cursor-pointer">This is a break / lunch period</Label>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
            <Button onClick={handleSavePeriod} isLoading={periodSaving} disabled={!periodForm.label || !periodForm.startTime || !periodForm.endTime}>
              {periodSaving ? 'Saving...' : editingPeriod ? 'Update' : 'Add'}
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

      <style jsx global>{`
        @media print {
          aside,
          header {
            display: none !important;
          }

          main > * {
            display: none !important;
          }

          .print-target {
            display: block !important;
            width: 100% !important;
          }

          .no-print {
            display: none !important;
          }

          html,
          body {
            background: #fff !important;
          }

          @page {
            size: A4 landscape;
            margin: 10mm;
          }
        }
      `}</style>
    </ProtectedRoute>
  )
}
