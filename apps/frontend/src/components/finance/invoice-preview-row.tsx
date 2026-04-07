'use client'

import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export interface PreviewStudent {
  studentId: string
  firstName: string
  lastName: string
  rollNumber: string
  className: string | null
  sectionName: string | null
  discountType: string | null
  discountValue: number | null
  grossAmount: number
  discountAmount: number
  netAmount: number
  outstandingBalance: number
  alreadyInvoiced: boolean
}

interface InvoicePreviewRowProps {
  student: PreviewStudent
  selected: boolean
  applyDiscounts: boolean
  onToggle: (studentId: string) => void
}

export function InvoicePreviewRow({ student, selected, applyDiscounts, onToggle }: InvoicePreviewRowProps) {
  const disabled = student.alreadyInvoiced
  const effectiveDiscount = applyDiscounts ? student.discountAmount : 0
  const effectiveNet = applyDiscounts ? student.netAmount : student.grossAmount

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors',
        disabled ? 'opacity-50 bg-muted/30' : selected ? 'border-primary/30 bg-primary/5' : 'hover:bg-muted/50'
      )}
    >
      <Checkbox
        checked={selected}
        disabled={disabled}
        onCheckedChange={() => onToggle(student.studentId)}
        aria-label={`Select fee voucher for ${student.firstName} ${student.lastName}`}
      />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm truncate">
            {student.firstName} {student.lastName}
          </span>
          <span className="text-xs text-muted-foreground shrink-0">{student.rollNumber}</span>
          {student.className && (
            <span className="text-xs text-muted-foreground shrink-0">
              · {student.className}{student.sectionName ? `-${student.sectionName}` : ''}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
          <span>Fee: <span className="text-foreground font-medium">Rs. {student.grossAmount.toLocaleString()}</span></span>
          {student.outstandingBalance > 0 && (
            <span>Outstanding: <span className="text-destructive font-medium">Rs. {student.outstandingBalance.toLocaleString()}</span></span>
          )}
          {applyDiscounts && effectiveDiscount > 0 && (
            <span className="flex items-center gap-1">
              Discount: <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                {student.discountType === 'PERCENTAGE' ? `${student.discountValue}%` : 'Fixed'}
              </Badge>
              <span className="text-green-600 font-medium">−Rs. {effectiveDiscount.toLocaleString()}</span>
            </span>
          )}
          <span className="ml-auto font-medium text-foreground">
            Fee Voucher: Rs. {effectiveNet.toLocaleString()}
          </span>
        </div>

        {disabled && (
          <span className="text-[10px] text-amber-600 font-medium">Already has fee voucher for this period</span>
        )}
      </div>
    </div>
  )
}
