'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Search, Zap, Users } from 'lucide-react'
import { api } from '@/lib/api-client'
import { toast } from 'sonner'
import { useSession } from '@/context/session-context'
import { InvoicePreviewList } from './invoice-preview-list'
import { InvoiceSummaryCard } from './invoice-summary-card'
import type { PreviewStudent } from './invoice-preview-row'
import type { AcademicYear } from '@/lib/types'

interface FeeStructure {
  id: string
  name: string
  amount: number
  frequency: string
  isActive: boolean
  classId?: string | null
}

interface ClassItem {
  id: string
  name: string
}

interface GenerateInvoiceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  fees: FeeStructure[]
  classes: ClassItem[]
  onSuccess: () => void
}

function getDefaultDueDate(selectedYear?: Pick<AcademicYear, 'startDate' | 'endDate'> | null): string {
  const today = new Date()
  let candidate = new Date(today.getFullYear(), today.getMonth() + 1, 0)

  if (selectedYear) {
    const yearStart = new Date(selectedYear.startDate)
    const yearEnd = new Date(selectedYear.endDate)

    if (Number.isFinite(yearStart.getTime()) && Number.isFinite(yearEnd.getTime())) {
      yearStart.setHours(0, 0, 0, 0)
      yearEnd.setHours(23, 59, 59, 999)

      if (candidate < yearStart) candidate = new Date(yearStart)
      if (candidate > yearEnd) candidate = new Date(yearEnd)
    }
  }

  return candidate.toISOString().slice(0, 10)
}

export function GenerateInvoiceDialog({ open, onOpenChange, fees, classes, onSuccess }: GenerateInvoiceDialogProps) {
  const { selectedYear, selectedCampus } = useSession()
  const defaultDueDate = useMemo(
    () => getDefaultDueDate(selectedYear),
    [selectedYear],
  )

  // Form state
  const [feeStructureId, setFeeStructureId] = useState('')
  const [classId, setClassId] = useState('all')
  const [dueDate, setDueDate] = useState(() => defaultDueDate)
  const [applyDiscounts, setApplyDiscounts] = useState(true)

  // Preview state
  const [previewStudents, setPreviewStudents] = useState<PreviewStudent[]>([])
  const [previewLoading, setPreviewLoading] = useState(false)
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set())
  const [generating, setGenerating] = useState(false)
  const [studentQuery, setStudentQuery] = useState('')

  // Reset when dialog closes
  useEffect(() => {
    if (!open) {
      setFeeStructureId('')
      setClassId('all')
      setDueDate(defaultDueDate)
      setApplyDiscounts(true)
      setPreviewStudents([])
      setSelectedStudentIds(new Set())
      setStudentQuery('')
    }
  }, [open, defaultDueDate])

  useEffect(() => {
    if (!open) return
    setDueDate(defaultDueDate)
  }, [open, defaultDueDate])

  // Auto-lock class when fee structure is class-specific
  const selectedFee = fees.find(f => f.id === feeStructureId)
  const isClassLocked = !!selectedFee?.classId

  useEffect(() => {
    if (selectedFee?.classId) {
      setClassId(selectedFee.classId)
    }
  }, [selectedFee])

  // Fetch preview when relevant fields change
  const fetchPreview = useCallback(async () => {
    if (!feeStructureId) {
      setPreviewStudents([])
      setSelectedStudentIds(new Set())
      return
    }

    setPreviewLoading(true)
    try {
      const params: Record<string, string> = {
        feeStructureId,
      }
      if (classId && classId !== 'all') params.classId = classId
      if (selectedYear?.id) params.academicYearId = selectedYear.id
      if (selectedCampus?.id) params.campusId = selectedCampus.id

      const res = await api.get<PreviewStudent[]>('/finance/invoices/preview', { params })
      if (res.success && res.data) {
        const students = Array.isArray(res.data) ? res.data : []
        setPreviewStudents(students)
        // Auto-select all non-already-invoiced students
        const selectable = students.filter(s => !s.alreadyInvoiced).map(s => s.studentId)
        setSelectedStudentIds(new Set(selectable))
      } else {
        setPreviewStudents([])
        setSelectedStudentIds(new Set())
      }
    } catch (error: any) {
      toast.error(error?.message || 'Failed to load student preview')
      setPreviewStudents([])
      setSelectedStudentIds(new Set())
    } finally {
      setPreviewLoading(false)
    }
  }, [feeStructureId, classId, selectedYear, selectedCampus])

  useEffect(() => {
    fetchPreview()
  }, [fetchPreview])

  // Filter preview to specific student query (results remain in right panel)
  const displayStudents = useMemo(() => {
    const q = studentQuery.trim().toLowerCase()
    if (!q) return previewStudents
    return previewStudents.filter((s) =>
      `${s.firstName} ${s.lastName}`.toLowerCase().includes(q) ||
      s.rollNumber.toLowerCase().includes(q),
    )
  }, [previewStudents, studentQuery])

  // Toggle individual student
  const handleToggle = useCallback((studentId: string) => {
    setSelectedStudentIds(prev => {
      const next = new Set(prev)
      if (next.has(studentId)) next.delete(studentId)
      else next.add(studentId)
      return next
    })
  }, [])

  // Toggle all selectable in view
  const handleToggleAll = useCallback(() => {
    const selectable = displayStudents.filter(s => !s.alreadyInvoiced)
    const allSelected = selectable.every(s => selectedStudentIds.has(s.studentId))
    if (allSelected) {
      setSelectedStudentIds(new Set())
    } else {
      setSelectedStudentIds(new Set(selectable.map(s => s.studentId)))
    }
  }, [displayStudents, selectedStudentIds])

  // Summary calculation
  const summary = useMemo(() => {
    const selected = displayStudents.filter(s => selectedStudentIds.has(s.studentId))
    const count = selected.length
    const grossTotal = selected.reduce((sum, s) => sum + s.grossAmount, 0)
    const discountTotal = applyDiscounts ? selected.reduce((sum, s) => sum + s.discountAmount, 0) : 0
    const netTotal = grossTotal - discountTotal
    return { count, grossTotal, discountTotal, netTotal }
  }, [displayStudents, selectedStudentIds, applyDiscounts])

  // Generate invoices
  const handleGenerate = async () => {
    if (selectedStudentIds.size === 0) {
      toast.error('No students selected')
      return
    }

    setGenerating(true)
    try {
      const body: Record<string, unknown> = {
        feeStructureId,
        studentIds: Array.from(selectedStudentIds),
        applyDiscounts,
      }
      if (classId && classId !== 'all') body.classId = classId
      if (dueDate) body.dueDate = dueDate
      if (selectedYear?.id) body.academicYearId = selectedYear.id
      if (selectedCampus?.id) body.campusId = selectedCampus.id

      const res = await api.post<{ generated: number; skipped: number; total: number }>('/finance/invoices/batch-generate', body)
      if (res.success && res.data) {
        const { generated, skipped } = res.data
        if (generated === 0 && skipped > 0) {
          toast.info('Selected students already have fee vouchers for this period')
        } else {
          toast.success(`Generated ${generated} fee voucher(s)${skipped > 0 ? ` (${skipped} already existed)` : ''}`)
          onOpenChange(false)
        }
        onSuccess()
      } else {
        toast.error(res.message || 'Batch generation failed')
      }
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />Generate Fee Voucher
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 grid grid-cols-5 gap-6 overflow-hidden py-2 min-h-0">
          {/* Left Panel — Form */}
          <div className="col-span-2 space-y-4 overflow-y-auto pl-1 pr-3 finance-hover-scrollbar">
            <div className="grid gap-2">
              <Label>Fee Structure *</Label>
              <Select value={feeStructureId} onValueChange={(v) => {
                setFeeStructureId(v)
                const fee = fees.find(f => f.id === v)
                if (fee?.classId) {
                  setClassId(fee.classId)
                } else {
                  setClassId('all')
                }
              }}>
                <SelectTrigger><SelectValue placeholder="Select fee structure" /></SelectTrigger>
                <SelectContent>
                  {fees.filter(f => f.isActive).map(f => (
                    <SelectItem key={f.id} value={f.id}>{f.name} — Rs. {f.amount}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Class (optional)</Label>
              <Select
                value={classId}
                onValueChange={(v) => setClassId(v)}
                disabled={isClassLocked}
              >
                <SelectTrigger><SelectValue placeholder="All classes" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classes.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {isClassLocked && (
                <p className="text-[10px] text-primary italic font-medium">This fee is class-specific. Class selection is locked.</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label>Specific Student (optional)</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={studentQuery}
                  onChange={(e) => setStudentQuery(e.target.value)}
                  placeholder="Type name or roll number..."
                  className="pl-9"
                />
              </div>
              <p className="text-xs text-muted-foreground">Leave blank to generate for all students below</p>
            </div>

            <div className="grid gap-2">
              <Label>Due Date</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              <p className="text-xs text-muted-foreground">Defaults inside selected academic year</p>
            </div>

            <div className="flex items-center gap-2 pt-1">
              <Checkbox
                id="apply-discounts"
                checked={applyDiscounts}
                onCheckedChange={(checked) => setApplyDiscounts(checked === true)}
              />
              <Label htmlFor="apply-discounts" className="text-sm font-normal cursor-pointer">
                Apply discounts
              </Label>
            </div>

            <InvoiceSummaryCard {...summary} />
          </div>

          {/* Right Panel — Student Preview List */}
          <div className="col-span-3 flex flex-col min-h-0 overflow-hidden border-l pl-6">
            <p className="text-sm font-medium text-muted-foreground mb-3">
              Student Preview
            </p>
            <div className="flex-1 min-h-0">
              <InvoicePreviewList
                students={displayStudents}
                loading={previewLoading}
                selectedIds={selectedStudentIds}
                applyDiscounts={applyDiscounts}
                onToggle={handleToggle}
                onToggleAll={handleToggleAll}
                emptyMessage={
                  !feeStructureId
                    ? 'Select a fee structure to preview students'
                    : 'No enrolled students found for the selected criteria'
                }
              />
            </div>
          </div>
        </div>

        <DialogFooter className="pt-2">
          <DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose>
          <Button onClick={handleGenerate} disabled={generating || selectedStudentIds.size === 0}>
            <Users className="mr-2 h-4 w-4" />
            {generating ? 'Generating...' : `Generate ${summary.count} Fee Voucher${summary.count !== 1 ? 's' : ''}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
