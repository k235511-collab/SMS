'use client'

import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SETTINGS_FIELD_LABELS } from './constants'
import { validatePakistaniPhone } from './phone-utils'

export interface WhatsAppSettingsFormValue {
  providerMode: 'CENTRAL_WABA' | 'OWN_WABA'
  businessAccountId: string
  appId: string
  phoneNumberId: string
  whatsappNumber: string
  displayName: string
  accessToken: string
  webhookVerifyToken: string
  isVerified: boolean
  isActive: boolean
}

interface WhatsAppSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  value: WhatsAppSettingsFormValue
  onChange: (value: WhatsAppSettingsFormValue) => void
  onSave: () => void
  isSaving: boolean
}

export function WhatsAppSettingsDialog({
  open,
  onOpenChange,
  value,
  onChange,
  onSave,
  isSaving,
}: WhatsAppSettingsDialogProps) {
  const phoneValidation = validatePakistaniPhone(value.whatsappNumber)
  const shouldShowPhoneError = !!value.whatsappNumber && !phoneValidation.isValid

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>WhatsApp settings</DialogTitle>
          <DialogDescription>
            Keep these details updated so messages can be delivered.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label={SETTINGS_FIELD_LABELS.displayName}
            placeholder="Campus WhatsApp"
            value={value.displayName}
            onChange={(event) => onChange({ ...value, displayName: event.target.value })}
          />

          <Input
            label={SETTINGS_FIELD_LABELS.whatsappNumber}
            placeholder="03XXXXXXXXX"
            value={value.whatsappNumber}
            onChange={(event) => onChange({ ...value, whatsappNumber: event.target.value })}
            error={shouldShowPhoneError ? phoneValidation.reason || undefined : undefined}
          />

          <Input
            label={SETTINGS_FIELD_LABELS.phoneNumberId}
            value={value.phoneNumberId}
            onChange={(event) => onChange({ ...value, phoneNumberId: event.target.value })}
          />

          <Input
            label={SETTINGS_FIELD_LABELS.businessAccountId}
            value={value.businessAccountId}
            onChange={(event) => onChange({ ...value, businessAccountId: event.target.value })}
          />

          <Input
            label={SETTINGS_FIELD_LABELS.appId}
            value={value.appId}
            onChange={(event) => onChange({ ...value, appId: event.target.value })}
          />

          <Input
            label={SETTINGS_FIELD_LABELS.webhookVerifyToken}
            value={value.webhookVerifyToken}
            onChange={(event) => onChange({ ...value, webhookVerifyToken: event.target.value })}
          />

          <div className="md:col-span-2">
            <Input
              label={SETTINGS_FIELD_LABELS.accessToken}
              type="password"
              value={value.accessToken}
              onChange={(event) => onChange({ ...value, accessToken: event.target.value })}
            />
          </div>

          <div className="md:col-span-2 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Label className="flex items-center gap-2 font-normal">
              <Checkbox
                checked={value.isVerified}
                onCheckedChange={(checked) => onChange({ ...value, isVerified: !!checked })}
              />
              Verified
            </Label>
            <Label className="flex items-center gap-2 font-normal">
              <Checkbox
                checked={value.isActive}
                onCheckedChange={(checked) => onChange({ ...value, isActive: !!checked })}
              />
              Active
            </Label>
            <Label className="flex items-center gap-2 font-normal">
              <Checkbox
                checked={value.providerMode === 'OWN_WABA'}
                onCheckedChange={(checked) =>
                  onChange({
                    ...value,
                    providerMode: checked ? 'OWN_WABA' : 'CENTRAL_WABA',
                  })
                }
              />
              Use your own connected account
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSave} disabled={isSaving || shouldShowPhoneError}>
            {isSaving ? 'Saving...' : 'Save settings'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
