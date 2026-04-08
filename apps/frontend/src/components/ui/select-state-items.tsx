import { SelectItem } from '@/components/ui/select'
import { Spinner } from '@/components/ui/spinner'

interface SelectStateItemProps {
  label: string
  value?: string
}

export function SelectLoadingItem({
  label,
  value = '__loading__',
}: SelectStateItemProps) {
  return (
    <SelectItem value={value} disabled>
      <span className="flex items-center gap-2 text-muted-foreground">
        <Spinner size="sm" />
        <span>{label}</span>
      </span>
    </SelectItem>
  )
}

export function SelectEmptyItem({
  label,
  value = '__empty__',
}: SelectStateItemProps) {
  return (
    <SelectItem value={value} disabled>
      <span className="text-muted-foreground">{label}</span>
    </SelectItem>
  )
}
