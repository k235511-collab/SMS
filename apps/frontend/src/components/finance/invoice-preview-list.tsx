'use client'

import { useMemo } from 'react'
import { Checkbox } from '@/components/ui/checkbox'
import { Spinner } from '@/components/ui/spinner'
import { Users } from 'lucide-react'
import { InvoicePreviewRow, type PreviewStudent } from './invoice-preview-row'

interface InvoicePreviewListProps {
  students: PreviewStudent[]
  loading: boolean
  selectedIds: Set<string>
  applyDiscounts: boolean
  onToggle: (studentId: string) => void
  onToggleAll: () => void
  emptyMessage?: string
}

export function InvoicePreviewList({
  students,
  loading,
  selectedIds,
  applyDiscounts,
  onToggle,
  onToggleAll,
  emptyMessage = 'Select a fee structure to preview students',
}: InvoicePreviewListProps) {
  const filtered = useMemo(() => students, [students])

  const selectableStudents = filtered.filter(s => !s.alreadyInvoiced)
  const allSelectableSelected = selectableStudents.length > 0 && selectableStudents.every(s => selectedIds.has(s.studentId))
  const someSelected = selectableStudents.some(s => selectedIds.has(s.studentId))

  if (loading) {
    return (
      <div className="flex h-full min-h-[260px] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <Spinner size="md" />
          <p className="text-sm">Loading students...</p>
        </div>
      </div>
    )
  }

  if (students.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center py-12 text-muted-foreground">
        <Users className="h-10 w-10 mb-3 opacity-40" />
        <p className="text-sm">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full gap-3">
      {/* Select All */}
      <div className="flex items-center gap-2 px-1">
        <Checkbox
          checked={allSelectableSelected}
          ref={(el) => {
            if (el) {
              const input = el.querySelector('input[type="checkbox"]') as HTMLInputElement | null
              if (input) {
                input.indeterminate = someSelected && !allSelectableSelected
              } else {
                // Radix Checkbox uses a button — fall back to data attribute
                ;(el as HTMLElement).dataset.indeterminate = String(someSelected && !allSelectableSelected)
              }
            }
          }}
          onCheckedChange={onToggleAll}
          aria-label="Select all students"
        />
        <span className="text-sm text-muted-foreground">
          Select All ({selectedIds.size}/{selectableStudents.length} students)
        </span>
      </div>

      {/* Student list */}
      <div className="finance-hover-scrollbar flex-1 overflow-y-auto [scrollbar-gutter:stable] space-y-1.5 min-h-0 pr-1">
        {filtered.map(student => (
          <InvoicePreviewRow
            key={student.studentId}
            student={student}
            selected={selectedIds.has(student.studentId)}
            applyDiscounts={applyDiscounts}
            onToggle={onToggle}
          />
        ))}
      </div>
    </div>
  )
}
