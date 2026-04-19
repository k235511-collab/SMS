'use client'

import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface SettingsIncompleteDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  missingFields: string[]
  onOpenSettings: () => void
}

export function SettingsIncompleteDialog({
  open,
  onOpenChange,
  missingFields,
  onOpenSettings,
}: SettingsIncompleteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning-600" />
            Complete WhatsApp settings first
          </DialogTitle>
          <DialogDescription>
            Messages cannot be sent until the required WhatsApp details are configured.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border border-warning-200 bg-warning-50/60 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-warning-700">Missing fields</p>
          <ul className="mt-2 space-y-1 text-sm text-warning-900">
            {(missingFields.length > 0 ? missingFields : ['Required WhatsApp settings']).map((field) => (
              <li key={field}>- {field}</li>
            ))}
          </ul>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={onOpenSettings}>Open WhatsApp settings</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}