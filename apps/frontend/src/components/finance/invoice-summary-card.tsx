'use client'

import { Card } from '@/components/ui/card'

interface InvoiceSummaryCardProps {
  count: number
  grossTotal: number
  discountTotal: number
  netTotal: number
}

export function InvoiceSummaryCard({ count, grossTotal, discountTotal, netTotal }: InvoiceSummaryCardProps) {
  if (count === 0) return null

  return (
    <Card className="p-3 bg-muted/50">
      <p className="text-xs font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Fee Voucher Summary</p>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Students</span>
          <span className="font-medium">{count}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Gross Total</span>
          <span className="font-medium">Rs. {grossTotal.toLocaleString()}</span>
        </div>
        {discountTotal > 0 && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Discount</span>
            <span className="font-medium text-green-600">−Rs. {discountTotal.toLocaleString()}</span>
          </div>
        )}
        <div className="flex justify-between border-t pt-1 mt-1">
          <span className="font-semibold">Net Total</span>
          <span className="font-bold">Rs. {netTotal.toLocaleString()}</span>
        </div>
      </div>
    </Card>
  )
}
