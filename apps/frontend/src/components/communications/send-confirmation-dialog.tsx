'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { formatPakistaniPhone, validatePakistaniPhone } from './phone-utils'
import { RecipientItem, TriggerKey } from './types'

interface SendConfirmationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  trigger: TriggerKey
  recipients: RecipientItem[]
  isSending: boolean
  onConfirm: () => void
}

export function SendConfirmationDialog({
  open,
  onOpenChange,
  trigger,
  recipients,
  isSending,
  onConfirm,
}: SendConfirmationDialogProps) {
  const rows = recipients.map((recipient) => {
    const check = validatePakistaniPhone(recipient.studentPhone)
    const isValid = typeof recipient.phoneValid === 'boolean' ? recipient.phoneValid : check.isValid
    return {
      ...recipient,
      isValid,
      normalized: recipient.studentPhoneNormalized || check.normalized,
      reason: recipient.phoneValidationReason || check.reason,
    }
  })

  const validCount = rows.filter((item) => item.isValid).length
  const invalidCount = rows.length - validCount
  const triggerLabel =
    trigger === 'ABSENT'
      ? 'absent updates'
      : trigger === 'FEE_DEFAULTER'
        ? 'fee reminders'
        : 'announcements'

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Confirm send</DialogTitle>
          <DialogDescription>
            You are about to send {triggerLabel} to {rows.length} selected student guardian(s).
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border">
          <div className="grid grid-cols-[1.3fr_1fr_0.7fr] gap-2 border-b bg-muted/40 p-2 text-xs font-medium text-muted-foreground">
            <span>Student</span>
            <span>Student phone</span>
            <span>Status</span>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {rows.map((item) => (
              <div
                key={item.studentId}
                className="grid grid-cols-[1.3fr_1fr_0.7fr] gap-2 border-b p-2 text-sm last:border-b-0"
              >
                <span>{item.fullName}</span>
                <span>{formatPakistaniPhone(item.normalized || item.studentPhone)}</span>
                <span>
                  <Badge variant={item.isValid ? 'success' : 'warning'}>
                    {item.isValid ? 'Ready' : 'Invalid'}
                  </Badge>
                </span>
              </div>
            ))}
          </div>
        </div>

        {invalidCount > 0 ? (
          <p className="text-xs text-warning-700">
            {invalidCount} recipient(s) have invalid numbers and will be skipped automatically.
          </p>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onConfirm} disabled={isSending || validCount === 0}>
            {isSending ? 'Sending...' : `Send to ${validCount} recipient(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
