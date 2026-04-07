'use client'

import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { CreditCard, DollarSign, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api-client'
import { toast } from 'sonner'

/* ─── Types ─────────────────────────────────────────────────── */

export interface PayableInvoice {
  id: string
  invoiceNo: string
  totalAmount: number
  paidAmount: number
  status: string
  dueDate: string
  notes?: string | null
  feeStructure?: { name: string } | null
  student?: { firstName: string; lastName: string } | null
}

function getInvoiceFeeTypeLabel(invoice: Pick<PayableInvoice, 'feeStructure' | 'notes' | 'invoiceNo'>): string {
  if (invoice.feeStructure?.name) return invoice.feeStructure.name
  const notes = invoice.notes?.trim()
  if (notes) {
    const fromFeePattern = notes.match(/fee:\s*([^—-]+?)(?:\s+[—-]\s+|$)/i)
    if (fromFeePattern?.[1]?.trim()) return fromFeePattern[1].trim()
    const fromBatchPattern = notes.match(/batch generated:\s*([^—-]+?)(?:\s+[—-]\s+|$)/i)
    if (fromBatchPattern?.[1]?.trim()) return fromBatchPattern[1].trim()
  }
  return invoice.invoiceNo
}

interface PayFeeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** List of unpaid/partial invoices available for payment */
  invoices: PayableInvoice[]
  /** Pre-selected invoice ID (e.g. from a "Pay" button on a row) */
  preSelectedInvoiceId?: string | null
  /** Student name shown in the dialog title. If omitted, uses invoice student data. */
  studentName?: string
  /** Called after a successful payment so the parent can refresh data */
  onSuccess?: () => void
}

/* ─── Component ─────────────────────────────────────────────── */

export function PayFeeDialog({
  open,
  onOpenChange,
  invoices,
  preSelectedInvoiceId,
  studentName,
  onSuccess,
}: PayFeeDialogProps) {
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>(
    preSelectedInvoiceId ? [preSelectedInvoiceId] : [],
  )
  const [payMethod, setPayMethod] = useState('CASH')
  const [payReference, setPayReference] = useState('')
  const [paying, setPaying] = useState(false)
  const [customAmount, setCustomAmount] = useState<string>('')

  // Reset state when dialog opens/closes
  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      setSelectedInvoiceIds(preSelectedInvoiceId ? [preSelectedInvoiceId] : [])
      setPayMethod('CASH')
      setPayReference('')
      setCustomAmount('')
    }
    onOpenChange(nextOpen)
  }

  const unpaidInvoices = useMemo(
    () => invoices.filter((i) => i.status !== 'PAID' && i.status !== 'CANCELLED'),
    [invoices],
  )

  const selectedInvoices = useMemo(
    () => unpaidInvoices.filter((i) => selectedInvoiceIds.includes(i.id)),
    [unpaidInvoices, selectedInvoiceIds],
  )

  const totalPayable = useMemo(
    () => selectedInvoices.reduce((sum, i) => sum + (i.totalAmount - i.paidAmount), 0),
    [selectedInvoices],
  )

  const payAmount = useMemo(() => {
    const parsed = parseFloat(customAmount)
    if (!customAmount || isNaN(parsed) || parsed <= 0) return totalPayable
    return Math.min(parsed, totalPayable)
  }, [customAmount, totalPayable])

  const remainingAfterPay = totalPayable - payAmount

  const availableForDropdown = useMemo(
    () => unpaidInvoices.filter((i) => !selectedInvoiceIds.includes(i.id)),
    [unpaidInvoices, selectedInvoiceIds],
  )

  const addInvoice = (invoiceId: string) => {
    if (!selectedInvoiceIds.includes(invoiceId)) {
      setSelectedInvoiceIds((prev) => [...prev, invoiceId])
    }
  }

  const removeInvoice = (invoiceId: string) => {
    setSelectedInvoiceIds((prev) => prev.filter((id) => id !== invoiceId))
  }

  // Derive a display title
  const dialogTitle = studentName
    ? `Pay Fee — ${studentName}`
    : selectedInvoices.length === 1 && selectedInvoices[0].student
      ? `Pay Fee — ${selectedInvoices[0].student.firstName} ${selectedInvoices[0].student.lastName}`
      : 'Pay Fee'

  const handlePayFee = async () => {
    if (selectedInvoiceIds.length === 0) {
      toast.error('Please select at least one fee voucher')
      return
    }
    if (payAmount <= 0) {
      toast.error('Payment amount must be greater than 0')
      return
    }
    setPaying(true)
    try {
      // Sort selected invoices by due date (oldest first) for partial distribution
      const sortedInvoices = [...selectedInvoices].sort(
        (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
      )

      let remainingToPay = payAmount
      let successCount = 0
      let failCount = 0

      for (const inv of sortedInvoices) {
        if (remainingToPay <= 0) break
        const invoiceOutstanding = inv.totalAmount - inv.paidAmount
        const amountForThisInvoice = Math.min(remainingToPay, invoiceOutstanding)

        const res = await api.post('/finance/payments', {
          invoiceId: inv.id,
          amount: amountForThisInvoice,
          method: payMethod,
          referenceNo: payReference || undefined,
        })
        if (res.success) {
          successCount++
          remainingToPay -= amountForThisInvoice
        } else {
          failCount++
          toast.error(`Failed for ${inv.invoiceNo}: ${(res as any).message || 'Error'}`)
        }
      }
      if (successCount > 0) {
        toast.success(`Rs. ${payAmount.toLocaleString()} payment recorded across ${successCount} fee voucher(s)`)
        onOpenChange(false)
        onSuccess?.()
      }
    } finally {
      setPaying(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            {dialogTitle}
          </DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {/* Invoice dropdown */}
          <div className="grid gap-2">
            <Label>Select Fee Voucher(s) *</Label>
            <Select value="" onValueChange={(v) => addInvoice(v)}>
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    availableForDropdown.length > 0
                      ? `Add fee voucher (${availableForDropdown.length} available)`
                      : 'All fee vouchers selected'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {availableForDropdown.map((inv) => {
                  const remaining = inv.totalAmount - inv.paidAmount
                  const monthLabel = new Date(inv.dueDate).toLocaleString('default', {
                    month: 'short',
                    year: 'numeric',
                  })
                  return (
                    <SelectItem key={inv.id} value={inv.id}>
                      {getInvoiceFeeTypeLabel(inv)} — {monthLabel} (Rs.{' '}
                      {remaining.toLocaleString()}) [{inv.status}]
                    </SelectItem>
                  )
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Selected invoices chips */}
          {selectedInvoices.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">
                Selected ({selectedInvoices.length})
              </Label>
              <div className="flex flex-wrap gap-2">
                {selectedInvoices.map((inv) => {
                  const remaining = inv.totalAmount - inv.paidAmount
                  const monthLabel = new Date(inv.dueDate).toLocaleString('default', {
                    month: 'short',
                    year: 'numeric',
                  })
                  return (
                    <div
                      key={inv.id}
                      className={cn(
                        'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm',
                        inv.status === 'OVERDUE'
                          ? 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950'
                          : 'border-border bg-muted/50',
                      )}
                    >
                      <div>
                        <span className="font-medium">{getInvoiceFeeTypeLabel(inv)}</span>
                        <span className="ml-1 text-xs text-muted-foreground">{monthLabel}</span>
                        <span className="ml-1 text-red-600 font-semibold">
                          Rs. {remaining.toLocaleString()}
                        </span>
                      </div>
                      <button
                        onClick={() => removeInvoice(inv.id)}
                        className="rounded-full p-0.5 hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )
                })}
              </div>
              <div className="flex items-center justify-between rounded-md bg-primary/5 border border-primary/20 px-3 py-2">
                <span className="text-sm font-medium">Total Payable</span>
                <span className="text-lg font-bold text-primary">
                  Rs. {totalPayable.toLocaleString()}
                </span>
              </div>

              {/* Custom amount input */}
              <div className="grid gap-2">
                <Label className="text-xs">Pay Amount <span className="text-muted-foreground">(leave empty to pay full)</span></Label>
                <Input
                  type="number"
                  min={1}
                  max={totalPayable}
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder={`Full amount: Rs. ${totalPayable.toLocaleString()}`}
                />
                {customAmount && payAmount < totalPayable && (
                  <div className="flex items-center justify-between rounded-md bg-yellow-50 border border-yellow-200 dark:bg-yellow-950 dark:border-yellow-800 px-3 py-2">
                    <span className="text-xs font-medium text-yellow-700 dark:text-yellow-400">Remaining after payment</span>
                    <span className="text-sm font-bold text-yellow-700 dark:text-yellow-400">
                      Rs. {remainingAfterPay.toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Payment details */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Payment Method</Label>
              <Select value={payMethod} onValueChange={setPayMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                  <SelectItem value="ONLINE">Online</SelectItem>
                  <SelectItem value="CARD">Card</SelectItem>
                  <SelectItem value="CHEQUE">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Reference No (optional)</Label>
              <Input
                value={payReference}
                onChange={(e) => setPayReference(e.target.value)}
                placeholder="Receipt / transaction number"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">Cancel</Button>
          </DialogClose>
          <Button
            onClick={handlePayFee}
            disabled={paying || selectedInvoiceIds.length === 0 || payAmount <= 0}
          >
            <DollarSign className="mr-2 h-4 w-4" />
            {paying ? 'Processing...' : `Pay Rs. ${payAmount.toLocaleString()}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
