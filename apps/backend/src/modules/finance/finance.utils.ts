import type { DiscountType } from '@prisma/client'

export interface EnrollmentDiscountInput {
  discountType?: DiscountType | null
  discountValue?: number | null
}

export interface InvoiceDiscountFields {
  grossAmount: number
  discountType: DiscountType | null
  discountValue: number | null
  discountAmount: number
  totalAmount: number
}

export function calculateInvoiceDiscountFields(
  feeAmount: number,
  enrollment?: EnrollmentDiscountInput | null,
): InvoiceDiscountFields {
  if (
    !enrollment?.discountType ||
    enrollment.discountValue == null ||
    enrollment.discountValue <= 0
  ) {
    return {
      grossAmount: feeAmount,
      discountType: null,
      discountValue: null,
      discountAmount: 0,
      totalAmount: feeAmount,
    }
  }

  const discountAmount =
    enrollment.discountType === 'PERCENTAGE'
      ? Math.round((feeAmount * Math.min(enrollment.discountValue, 100)) / 100)
      : Math.min(enrollment.discountValue, feeAmount)

  return {
    grossAmount: feeAmount,
    discountType: enrollment.discountType,
    discountValue: enrollment.discountValue,
    discountAmount,
    totalAmount: feeAmount - discountAmount,
  }
}

export function calculateInvoiceStatus(
  paidAmount: number,
  totalAmount: number,
  isOverdue = false,
): 'PAID' | 'PARTIAL' | 'UNPAID' | 'OVERDUE' {
  if (paidAmount >= totalAmount) {
    return 'PAID'
  }

  if (isOverdue) {
    return 'OVERDUE'
  }

  if (paidAmount > 0) {
    return 'PARTIAL'
  }

  return 'UNPAID'
}
