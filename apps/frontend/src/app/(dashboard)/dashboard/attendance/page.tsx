'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { ProtectedRoute } from '@/components/auth'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'
import { SelectEmptyItem, SelectLoadingItem } from '@/components/ui/select-state-items'
import { api } from '@/lib/api-client'
import { ChevronLeft, ChevronRight, UserCheck, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { useSession } from '@/context/session-context'
import { useAuth } from '@/context/auth-context'
import { teachersService } from '@/services/teachers.service'
import useCampusRefetch from '@/hooks/useCampusRefetch'

interface AttendanceRecord {
  id: string
  date: string
  status: string
  remarks?: string
  student?: { id: string; firstName: string; lastName: string; rollNumber: string }
}

interface Student { id: string; firstName: string; lastName: string; rollNumber: string }
interface Section { id: string; name: string; classId: string }
interface ClassItem { id: string; name: string; code: string }

export default function AttendancePage() {
  const { selectedCampus } = useSession()
  const { user } = useAuth()
  const isTeacher = !!user?.teacherId
  const [classes, setClasses] = useState<ClassItem[]>([])
  const [sections, setSections] = useState<Section[]>([])
  const [teacherAssignments, setTeacherAssignments] = useState<any[]>([])
  const [referencesLoading, setReferencesLoading] = useState(true)
  const [sectionsLoading, setSectionsLoading] = useState(false)
  const [selectedClassId, setSelectedClassId] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('attendance_selectedClassId') || ''
    return ''
  })
  const [selectedSectionId, setSelectedSectionId] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem('attendance_selectedSectionId') || ''
    return ''
  })
  const [loading, setLoading] = useState(false)

  // Daily Marking state
  const [students, setStudents] = useState<Student[]>([])
  // Map: studentId -> date -> status
  const [attendanceMap, setAttendanceMap] = useState<Record<string, Record<string, string>>>({})
  // Map: studentId -> date -> remarks
  const [remarksMap, setRemarksMap] = useState<Record<string, Record<string, string>>>({})
  const [savingCell, setSavingCell] = useState<{ studentId: string, date: string } | null>(null)

  // Navigation state
  const [focusedRowIndex, setFocusedRowIndex] = useState(0)
  const [focusedColIndex, setFocusedColIndex] = useState(0) // 0: Roll, 1: Name, 2-7: Mon-Sat, 8: P, 9: A, 10: L, 11: Remarks
  const [activeSelect, setActiveSelect] = useState<string | null>(null)
  const tableContainerRef = useRef<HTMLDivElement>(null)
  const rowRefs = useRef<Record<number, HTMLTableRowElement | null>>({})

  // Helper to get YYYY-MM-DD in local time
  const formatDateKey = (d: Date) => {
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  const getStartOfWeek = (d: Date) => {
    const date = new Date(d)
    date.setHours(0, 0, 0, 0) // Normalize to local midnight
    const day = date.getDay()
    const diff = date.getDate() - day + (day === 0 ? -6 : 1)
    const result = new Date(date.setDate(diff))
    result.setHours(0, 0, 0, 0)
    return result
  }

  const [startOfWeek, setStartOfWeek] = useState(() => getStartOfWeek(new Date()))

  // Generate 6 working days (Mon-Sat)
  const weekDays = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(startOfWeek)
    d.setDate(startOfWeek.getDate() + i)
    return formatDateKey(d)
  })

  // State for Mobile specific single-day view
  const [mobileSelectedDate, setMobileSelectedDate] = useState(() => formatDateKey(new Date()))

  useEffect(() => {
    const days = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(startOfWeek)
      d.setDate(startOfWeek.getDate() + i)
      return formatDateKey(d)
    })
    if (!days.includes(mobileSelectedDate)) {
      const todayStr = formatDateKey(new Date())
      setMobileSelectedDate(days.includes(todayStr) ? todayStr : days[0])
    }
  }, [startOfWeek])

  const fetchClasses = useCallback(async () => {
    setReferencesLoading(true)
    try {
      if (isTeacher) {
        // Only show classes where the teacher has class-teacher rows (subject=null)
        const assignmentsRes = await teachersService.getMyClasses()
        if (assignmentsRes.success && assignmentsRes.data) {
          const assignments = Array.isArray(assignmentsRes.data) ? assignmentsRes.data : (assignmentsRes.data as any).data || []
          const classTeacherAssignments = assignments.filter((a: any) => !a.subjectId && !a.subject?.id)
          setTeacherAssignments(classTeacherAssignments)
          const classMap = new Map<string, ClassItem>()
          for (const a of classTeacherAssignments) {
            if (a.class) classMap.set(a.class.id, { id: a.class.id, name: a.class.name, code: a.class.code || '' })
          }
          setClasses(Array.from(classMap.values()))
        }
      } else {
        const res = await api.get<{ data: ClassItem[] }>('/academics/classes', { params: { pageSize: 100 } })
        if (res.success && res.data) setClasses(res.data.data || [])
      }
    } finally {
      setReferencesLoading(false)
    }
  }, [selectedCampus, isTeacher])

  const fetchSections = useCallback(async (classId: string) => {
    if (!classId) { setSections([]); setSectionsLoading(false); return }
    setSectionsLoading(true)
    try {
      if (isTeacher) {
        // Check if teacher has specific section assignments for this class
        const filtered = teacherAssignments
          .filter((a: any) => a.class?.id === classId && a.section)
          .map((a: any) => ({ id: a.section.id, name: a.section.name, classId }))
        const seen = new Set<string>()
        const unique: Section[] = []
        for (const s of filtered) {
          if (!seen.has(s.id)) { seen.add(s.id); unique.push(s) }
        }
        if (unique.length > 0) {
          setSections(unique)
        } else {
          // Whole-class assignment (no specific sections) → fetch all sections from API
          const hasClassAssignment = teacherAssignments.some((a: any) => a.class?.id === classId)
          if (hasClassAssignment) {
            const res = await api.get<Section[]>(`/academics/sections/class/${classId}`)
            if (res.success && res.data) setSections(Array.isArray(res.data) ? res.data : [])
            else setSections([])
          } else {
            setSections([])
          }
        }
      } else {
        const res = await api.get<Section[]>(`/academics/sections/class/${classId}`)
        if (res.success && res.data) setSections(Array.isArray(res.data) ? res.data : [])
        else setSections([])
      }
    } finally {
      setSectionsLoading(false)
    }
  }, [isTeacher, teacherAssignments])

  const fetchDailyData = useCallback(async () => {
    if (!selectedSectionId) return
    try {
      const studentRes = await api.get<Student[]>('/attendance/section-students', {
        params: { sectionId: selectedSectionId }
      })
      const fetchedStudents = Array.isArray(studentRes.data) ? studentRes.data : (studentRes.data as any)?.data || []
      setStudents(fetchedStudents)

      const endDate = new Date(startOfWeek)
      endDate.setDate(startOfWeek.getDate() + 5)

      const recordRes = await api.get<{ data: AttendanceRecord[] }>('/attendance', {
        params: {
          sectionId: selectedSectionId,
          startDate: formatDateKey(startOfWeek),
          endDate: formatDateKey(endDate),
          pageSize: 1000
        },
      })
      const fetchedRecords = recordRes.data?.data || (Array.isArray(recordRes.data) ? recordRes.data : [])

      const attMap: Record<string, Record<string, string>> = {}
      const remMap: Record<string, Record<string, string>> = {}

      fetchedRecords.forEach(r => {
        const student = r.student || (r as any).studentId ? { id: (r as any).studentId } : null
        if (student?.id) {
          const sId = student.id
          // Robustly get YYYY-MM-DD whether it's an ISO string or plain date
          const d = r.date.substring(0, 10)
          if (!attMap[sId]) attMap[sId] = {}
          if (!remMap[sId]) remMap[sId] = {}
          attMap[sId][d] = r.status
          if (r.remarks) remMap[sId][d] = r.remarks
        }
      })
      setAttendanceMap(attMap)
      setRemarksMap(remMap)

    } catch (err) {
      toast.error('Failed to load attendance data')
    }
  }, [selectedSectionId, startOfWeek])

  useEffect(() => { fetchClasses() }, [fetchClasses])
  useEffect(() => { if (selectedClassId) fetchSections(selectedClassId) }, [selectedClassId, fetchSections])

  // Auto-select first class if current selection is invalid
  useEffect(() => {
    if (classes.length > 0) {
      setSelectedClassId(prev => {
        if (classes.find(c => c.id === prev)) return prev
        setSelectedSectionId('')
        return classes[0].id
      })
    }
  }, [classes])

  // Auto-select first section if current selection is invalid
  useEffect(() => {
    if (sections.length > 0) {
      setSelectedSectionId(prev =>
        sections.find(s => s.id === prev) ? prev : sections[0].id
      )
    }
  }, [sections])

  // Reset class/section selection when campus changes
  useCampusRefetch(() => {
    setSelectedClassId('')
    setSelectedSectionId('')
    setSections([])
    setStudents([])
    setAttendanceMap({})
  }, [])

  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem('attendance_selectedClassId', selectedClassId)
  }, [selectedClassId])

  useEffect(() => {
    if (typeof window !== 'undefined') localStorage.setItem('attendance_selectedSectionId', selectedSectionId)
  }, [selectedSectionId])

  useEffect(() => {
    const fetchAll = async () => {
      if (!selectedSectionId) return
      setLoading(true)
      try {
        await fetchDailyData()
      } finally {
        setLoading(false)
      }
    }
    fetchAll()
  }, [selectedSectionId, startOfWeek, fetchDailyData])

  const autoSaveMark = async (studentId: string, date: string, status: string, remarks?: string) => {
    setSavingCell({ studentId, date })

    // Optimistic update
    const prevStatus = attendanceMap[studentId]?.[date]
    const prevRemarks = remarksMap[studentId]?.[date]

    setAttendanceMap(prev => ({
      ...prev,
      [studentId]: { ...(prev[studentId] || {}), [date]: status }
    }))
    if (remarks !== undefined) {
      setRemarksMap(prev => ({
        ...prev,
        [studentId]: { ...(prev[studentId] || {}), [date]: remarks }
      }))
    }

    try {
      const res = await api.post('/attendance', {
        date,
        classId: selectedClassId,
        sectionId: selectedSectionId,
        records: [{
          studentId,
          status,
          remarks: remarks !== undefined ? remarks : remarksMap[studentId]?.[date]
        }]
      })

      if (res.success) {
        toast.success(`Attendance updated`, { duration: 1000 })
      } else {
        toast.error(res.message || 'Failed to save')
        // Rollback
        setAttendanceMap(prev => ({
          ...prev,
          [studentId]: { ...(prev[studentId] || {}), [date]: prevStatus || '' }
        }))
        if (remarks !== undefined) {
          setRemarksMap(prev => ({
            ...prev,
            [studentId]: { ...(prev[studentId] || {}), [date]: prevRemarks || '' }
          }))
        }
      }
    } catch (err) {
      toast.error('Connection error')
      // Rollback logic...
    } finally {
      setSavingCell(null)
    }
  }

  // Keyboard Navigation logic (called from container onKeyDown)
  const handleGridKeyDown = (e: React.KeyboardEvent) => {
    if (!students.length) return

    // If typing in a remark, skip grid shortcuts
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      if (e.key === 'Escape') {
        (e.target as HTMLElement).blur()
      }
      return
    }

    // Guard: Bail if ANY dropdown is open. 
    // This prevents grid shortcuts from interfering with Section selectors OR the attendance dropdowns themselves.
    if (document.querySelector('[data-radix-popper-content-wrapper]')) {
      return
    }

    // Claim the event
    e.stopPropagation()

    const totalRows = students.length
    const totalCols = 1 + 1 + 6 // Roll + Name + Mon-Sat (Summary columns P/A/L are read-only)

    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault()
        setFocusedRowIndex(prev => Math.max(0, prev - 1))
        break
      case 'ArrowDown':
        e.preventDefault()
        setFocusedRowIndex(prev => Math.min(totalRows - 1, prev + 1))
        break
      case 'ArrowLeft':
        e.preventDefault()
        setFocusedColIndex(prev => Math.max(0, prev - 1))
        break
      case 'ArrowRight':
        e.preventDefault()
        setFocusedColIndex(prev => Math.min(totalCols - 1, prev + 1))
        break
      default: {
        const key = e.key.toUpperCase()
        const statusShortcut: Record<string, string> = { 'P': 'PRESENT', 'A': 'ABSENT', 'L': 'LATE', 'E': 'EXCUSED' }
        const isAttendanceCol = focusedColIndex >= 2 && focusedColIndex <= 7

        if (isAttendanceCol) {
          const studentId = students[focusedRowIndex].id
          const date = weekDays[focusedColIndex - 2]

          if (statusShortcut[key]) {
            autoSaveMark(studentId, date, statusShortcut[key])
            setFocusedRowIndex(prev => Math.min(totalRows - 1, prev + 1))
          } else if (e.key === 'Enter') {
            e.preventDefault()
            setActiveSelect(`${studentId}-${date}`)
          }
        }
        break
      }
    }
  }

  // Scroll into view logic
  useEffect(() => {
    const focusedRow = rowRefs.current[focusedRowIndex]
    if (focusedRow && tableContainerRef.current) {
      const container = tableContainerRef.current
      const rowTop = focusedRow.offsetTop
      const rowBottom = rowTop + focusedRow.offsetHeight
      const containerTop = container.scrollTop
      const containerBottom = containerTop + container.offsetHeight

      if (rowTop < containerTop) {
        container.scrollTo({ top: rowTop, behavior: 'smooth' })
      } else if (rowBottom > containerBottom) {
        container.scrollTo({ top: rowBottom - container.offsetHeight, behavior: 'smooth' })
      }
    }
  }, [focusedRowIndex])

  const bulkMarkAsPresent = async () => {
    // Current date for bulk action (often today)
    const todayStr = formatDateKey(new Date())
    if (!weekDays.includes(todayStr)) {
      toast.error("Can only bulk mark for current week")
      return
    }
    const unmarked = students.filter(s => !attendanceMap[s.id]?.[todayStr])
    if (unmarked.length === 0) { toast.info('All marked for today'); return }
    setLoading(true)
    try {
      const recordsToSave = unmarked.map(s => ({ studentId: s.id, status: 'PRESENT' }))
      const res = await api.post('/attendance', { date: todayStr, classId: selectedClassId, sectionId: selectedSectionId, records: recordsToSave })
      if (res.success) {
        toast.success(`Marked ${unmarked.length} as present for today`)
        fetchDailyData()
      }
    } finally { setLoading(false) }
  }

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newStart = new Date(startOfWeek)
    newStart.setDate(startOfWeek.getDate() + (direction === 'next' ? 7 : -7))
    setStartOfWeek(newStart)
  }

  return (
    <ProtectedRoute permission="attendance:read">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Attendance</h1>
            <p className="mt-1 text-sm text-muted-foreground">Professional Grading Sheet & Summary</p>
          </div>
        </div>

        {/* Filters & Actions */}
        <div className="flex flex-wrap items-center gap-4 bg-card p-4 rounded-lg border border-border shadow-sm">
          <Select value={selectedClassId} onValueChange={(v) => { setSelectedClassId(v); setSelectedSectionId('') }} disabled={referencesLoading}>
            <SelectTrigger className="w-40 h-10 rounded-md"><SelectValue placeholder={referencesLoading ? 'Loading...' : 'Grade'} /></SelectTrigger>
            <SelectContent>
              {referencesLoading ? (
                <SelectLoadingItem label="Loading classes..." />
              ) : classes.length > 0 ? (
                classes.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)
              ) : (
                <SelectEmptyItem label="No classes available" />
              )}
            </SelectContent>
          </Select>
          <Select value={selectedSectionId} onValueChange={setSelectedSectionId} disabled={!selectedClassId || sectionsLoading}>
            <SelectTrigger className="w-40 h-10 rounded-md"><SelectValue placeholder={sectionsLoading ? 'Loading...' : 'Section'} /></SelectTrigger>
            <SelectContent>
              {!selectedClassId ? (
                <SelectEmptyItem label="Select a class first" />
              ) : sectionsLoading ? (
                <SelectLoadingItem label="Loading sections..." />
              ) : sections.length > 0 ? (
                sections.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)
              ) : (
                <SelectEmptyItem label="No sections available" />
              )}
            </SelectContent>
          </Select>
          <div className="h-6 w-[1px] bg-slate-200" />
          <div className="flex items-center gap-3">
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => navigateWeek('prev')} aria-label="Previous week"><ChevronLeft className="h-4 w-4" /></Button>
            <div className="text-sm font-bold text-foreground bg-muted/50 px-4 py-1.5 rounded-lg border border-border min-w-[240px] text-center">
              {startOfWeek.toLocaleDateString('en-US', { day: '2-digit', month: 'short' })} - {(() => {
                const end = new Date(startOfWeek)
                end.setDate(startOfWeek.getDate() + 5)
                return end.toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
              })()}
            </div>
            {loading && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Spinner size="sm" />
                <span>Loading attendance...</span>
              </div>
            )}
            <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => navigateWeek('next')} aria-label="Next week"><ChevronRight className="h-4 w-4" /></Button>
          </div>
          {selectedSectionId && (
            <>
              <div className="h-6 w-[1px] bg-slate-200 hidden sm:block" />
              <Button variant="secondary" size="sm" onClick={bulkMarkAsPresent} disabled={loading} className="h-9 font-semibold hidden sm:flex">
                Mark All Present (Today)
              </Button>
            </>
          )}
        </div>

        {/* Mobile Date Strip (Only visible on mobile) */}
        {selectedSectionId && (
          <div className="sm:hidden flex flex-col gap-3 animate-in fade-in duration-300">
            <div className="flex overflow-x-auto pb-2 gap-2 snap-x scrollbar-none">
              {weekDays.map(date => {
                const isSelected = mobileSelectedDate === date
                const dateObj = new Date(date)
                return (
                  <button
                    key={date}
                    onClick={() => setMobileSelectedDate(date)}
                    className={`flex flex-col items-center justify-center min-w-[64px] rounded-lg p-2 snap-center transition-colors border active:scale-95 ${isSelected ? 'bg-primary text-primary-foreground border-primary shadow-md' : 'bg-card text-muted-foreground border-border active:bg-muted'}`}
                  >
                    <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">{dateObj.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                    <span className="text-sm font-black mt-0.5">{dateObj.getDate()}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {selectedSectionId ? (
          <div className="space-y-8 pb-10">
            {/* Grid Section */}
            <div className="space-y-4 animate-in slide-in-from-bottom-2 duration-500">
              
              {/* DESKTOP TABLE */}
              <div className="hidden sm:block space-y-4">
                <div
                ref={tableContainerRef}
                tabIndex={0}
                onKeyDown={handleGridKeyDown}
                className="bg-card rounded-lg border border-border shadow-md overflow-hidden overflow-y-auto max-h-[600px] relative scrollbar-thin outline-none focus:ring-1 focus:ring-primary/20"
              >
                <table className="w-full text-sm border-collapse table-fixed">
                  <thead className="bg-[#1E1E2D] text-white sticky top-0 z-20">
                    <tr>
                      <th className="p-3 text-left font-semibold w-20 border-b border-white/5">Roll #</th>
                      <th className="p-3 text-left font-semibold w-48 border-b border-white/5 border-l border-white/5">Student Name</th>
                      {weekDays.map(date => (
                        <th key={date} className="p-2 text-center border-l border-white/5 w-24">
                          <div className="text-[9px] uppercase opacity-60 font-black">{new Date(date).toLocaleDateString('en-US', { weekday: 'short' })}</div>
                          <div className="text-[11px]">{new Date(date).toLocaleDateString('en-US', { day: '2-digit', month: '2-digit' })}</div>
                        </th>
                      ))}
                      <th className="p-2 text-center border-l border-white/5 w-12 text-[10px] bg-white/5">P</th>
                      <th className="p-2 text-center border-l border-white/5 w-12 text-[10px] bg-white/5">A</th>
                      <th className="p-2 text-center border-l border-white/5 w-12 text-[10px] bg-white/5 text-amber-400">L</th>
                      <th className="p-2 text-center border-l border-white/5 w-12 text-[10px] bg-white/5 text-blue-400">Lv</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {students.map((s, idx) => (
                      <tr
                        key={s.id}
                        ref={(el: HTMLTableRowElement | null) => { rowRefs.current[idx] = el }}
                        className={`group transition-colors hover:bg-muted/30 ${focusedRowIndex === idx ? 'bg-primary/5' : ''}`}
                      >
                        <td className={`p-2 sticky left-0 z-10 border-r border-border/50 transition-all font-mono font-bold text-muted-foreground text-center text-[10px] ${focusedRowIndex === idx && focusedColIndex === 0 ? 'ring-2 ring-inset ring-primary bg-primary/10 z-20' : focusedRowIndex === idx ? 'bg-muted/50' : 'bg-card group-hover:bg-muted/30'}`} onClick={() => { setFocusedRowIndex(idx); setFocusedColIndex(0); tableContainerRef.current?.focus() }}>
                          {s.rollNumber}
                        </td>
                        <td className={`p-2 sticky left-20 z-10 border-r border-border/50 transition-all ${focusedRowIndex === idx && focusedColIndex === 1 ? 'ring-2 ring-inset ring-primary bg-primary/10 z-20' : focusedRowIndex === idx ? 'bg-muted/50' : 'bg-card group-hover:bg-muted/30'}`} onClick={() => { setFocusedRowIndex(idx); setFocusedColIndex(1); tableContainerRef.current?.focus() }}>
                          <div className="truncate font-semibold text-foreground text-[11px]">{s.firstName} {s.lastName}</div>
                        </td>
                        {weekDays.map((date, colIdx) => {
                          const status = attendanceMap[s.id]?.[date]
                          const isFocused = focusedRowIndex === idx && focusedColIndex === (colIdx + 2)
                          return (
                            <td key={date} className={`p-1 border-l border-border/50 transition-all ${isFocused ? 'ring-2 ring-inset ring-primary bg-primary/10 z-40 relative' : ''}`}>
                              <Select
                                open={activeSelect === `${s.id}-${date}`}
                                onOpenChange={(open) => setActiveSelect(open ? `${s.id}-${date}` : null)}
                                value={status || 'UNMARKED'}
                                onValueChange={(v) => {
                                  autoSaveMark(s.id, date, v);
                                  setActiveSelect(null);
                                  setFocusedRowIndex(prev => Math.min(students.length - 1, prev + 1));
                                }}
                              >                                  <SelectTrigger
                                    tabIndex={-1}
                                    onKeyDown={(e) => {
                                      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
                                        e.preventDefault()
                                      }
                                    }}
                                    onPointerDown={() => {
                                      setFocusedRowIndex(idx)
                                      setFocusedColIndex(colIdx + 2)
                                      tableContainerRef.current?.focus()
                                    }}
                                    className={`h-8 w-full border-none font-bold text-[10px] rounded transition-all flex justify-center p-0 align-middle [&>svg]:hidden hover:opacity-85 hover:scale-[0.98]
                                    ${status === 'PRESENT' ? 'bg-surface-emerald text-emerald-500' :
                                       status === 'ABSENT' ? 'bg-surface-rose text-rose-500' :
                                         status === 'LATE' ? 'bg-surface-amber text-amber-500' :
                                         status === 'EXCUSED' ? 'bg-surface-blue text-blue-500' : 'bg-muted text-muted-foreground/50'}`}>

                                  {savingCell?.studentId === s.id && savingCell?.date === date ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <div className="flex-1 text-center">
                                      <SelectValue placeholder="—" />
                                    </div>
                                  )}
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="UNMARKED">—</SelectItem>
                                  <SelectItem value="PRESENT">Present (P)</SelectItem>
                                  <SelectItem value="ABSENT">Absent (A)</SelectItem>
                                  <SelectItem value="LATE">Late (L)</SelectItem>
                                  <SelectItem value="EXCUSED">Leave (E)</SelectItem>
                                </SelectContent>
                              </Select>
                            </td>
                          )
                        })}
                        {/* Summary Columns */}
                        {(() => {
                          const studentRecords = attendanceMap[s.id] || {}
                          let p = 0, a = 0, l = 0, lv = 0
                          weekDays.forEach(d => {
                            const status = studentRecords[d]
                            if (status === 'PRESENT') p++
                            if (status === 'ABSENT') a++
                            if (status === 'LATE') l++
                            if (status === 'EXCUSED') lv++
                          })
                          return (
                            <>
                              <td className="p-2 text-center text-[11px] font-bold text-emerald-500 border-l border-border/50 bg-muted/20">{p}</td>
                              <td className="p-2 text-center text-[11px] font-bold text-rose-500 border-l border-border/50 bg-muted/20">{a}</td>
                              <td className="p-2 text-center text-[11px] font-bold text-amber-500 border-l border-border/50 bg-muted/20">{l}</td>
                              <td className="p-2 text-center text-[11px] font-bold text-blue-500 border-l border-border/50 bg-muted/20">{lv}</td>
                            </>
                          )
                        })()}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* MOBILE CARD LIST */}
            <div className="sm:hidden flex flex-col gap-3 pb-24">
              {students.map(s => {
                  const status = attendanceMap[s.id]?.[mobileSelectedDate] || 'UNMARKED'
                  const isSaving = savingCell?.studentId === s.id && savingCell?.date === mobileSelectedDate

                  return (
                    <div key={s.id} className="bg-card p-4 rounded-xl border border-border shadow-[0_2px_10px_-4px_rgba(0,0,0,0.05)] flex flex-col gap-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-bold text-sm shrink-0 border border-border">
                          {s.firstName?.[0]}{s.lastName?.[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-foreground text-base truncate leading-tight">{s.firstName} {s.lastName}</h3>
                          <p className="text-xs text-muted-foreground font-mono mt-0.5">Roll: {s.rollNumber}</p>
                        </div>
                        {isSaving && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
                      </div>
                      
                      {/* One-Tap Action Pills */}
                      <div className="grid grid-cols-4 gap-2">
                        <button
                          onClick={() => status !== 'PRESENT' && autoSaveMark(s.id, mobileSelectedDate, 'PRESENT')}
                          className={`h-11 rounded-lg font-black text-sm flex items-center justify-center transition-all active:scale-[0.97] ${status === 'PRESENT' ? 'bg-emerald-500 text-white shadow-[0_4px_12px_-4px_rgba(16,185,129,0.5)]' : 'bg-muted text-muted-foreground hover:bg-muted/80 border border-border'}`}
                        >
                          P
                        </button>
                        <button
                          onClick={() => status !== 'ABSENT' && autoSaveMark(s.id, mobileSelectedDate, 'ABSENT')}
                          className={`h-11 rounded-lg font-black text-sm flex items-center justify-center transition-all active:scale-[0.97] ${status === 'ABSENT' ? 'bg-rose-500 text-white shadow-[0_4px_12px_-4px_rgba(244,63,94,0.5)]' : 'bg-muted text-muted-foreground hover:bg-muted/80 border border-border'}`}
                        >
                          A
                        </button>
                        <button
                          onClick={() => status !== 'LATE' && autoSaveMark(s.id, mobileSelectedDate, 'LATE')}
                          className={`h-11 rounded-lg font-black text-sm flex items-center justify-center transition-all active:scale-[0.97] ${status === 'LATE' ? 'bg-amber-500 text-white shadow-[0_4px_12px_-4px_rgba(245,158,11,0.5)]' : 'bg-muted text-muted-foreground hover:bg-muted/80 border border-border'}`}
                        >
                          L
                        </button>
                        <button
                          onClick={() => status !== 'EXCUSED' && autoSaveMark(s.id, mobileSelectedDate, 'EXCUSED')}
                          className={`h-11 rounded-lg font-black text-sm flex items-center justify-center transition-all active:scale-[0.97] ${status === 'EXCUSED' ? 'bg-blue-500 text-white shadow-[0_4px_12px_-4px_rgba(59,130,246,0.5)]' : 'bg-muted text-muted-foreground hover:bg-muted/80 border border-border'}`}
                        >
                          Lv
                        </button>
                      </div>
                    </div>
                  )
                })}

                {students.length === 0 && (
                  <div className="text-center p-8 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-800 border-dashed text-slate-500 dark:text-slate-400">
                    No students configured.
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center p-32 opacity-30 gap-4">
            <UserCheck className="h-16 w-16" />
            <div className="font-bold">Select Section to Load Grid</div>
          </div>
        )}
      </div>

      {/* STICKY BOTTOM ACTION BAR (MOBILE ONLY) */}
      {selectedSectionId && (
        <div className="sm:hidden fixed bottom-0 left-0 right-0 p-4 bg-card/90 backdrop-blur-md border-t border-border shadow-[0_-10px_30px_-15px_rgba(0,0,0,0.15)] z-50 animate-in slide-in-from-bottom flex justify-between items-center pb-[env(safe-area-inset-bottom,16px)]">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Mark All</span>
            <span className="font-black text-sm text-foreground">{new Date(mobileSelectedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
          </div>
          <Button onClick={bulkMarkAsPresent} disabled={loading} className="rounded-md font-bold shadow-md truncate h-11 px-6 active:scale-[0.98] transition-transform">
            Present
          </Button>
        </div>
      )}
    </ProtectedRoute>
  )
}
