'use client'

import { ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './dropdown-menu'

export interface MultiSelectDropdownOption {
  value: string
  label: string
  description?: string
}

interface MultiSelectDropdownProps {
  label: string
  placeholder: string
  options: MultiSelectDropdownOption[]
  selectedValues: string[]
  onToggle: (value: string) => void
  onClear?: () => void
  onSelectAll?: () => void
  clearLabel?: string
  selectAllLabel?: string
  emptyText?: string
  disabled?: boolean
  className?: string
}

function buildTriggerLabel(
  options: MultiSelectDropdownOption[],
  selectedValues: string[],
  placeholder: string,
) {
  if (selectedValues.length === 0) {
    return placeholder
  }

  const selectedOptions = options.filter((option) => selectedValues.includes(option.value))
  if (selectedOptions.length === 1) {
    return selectedOptions[0].label
  }

  return `${selectedOptions.length} selected`
}

export function MultiSelectDropdown({
  label,
  placeholder,
  options,
  selectedValues,
  onToggle,
  onClear,
  onSelectAll,
  clearLabel = 'Clear selection',
  selectAllLabel = 'Select all',
  emptyText = 'No options available',
  disabled = false,
  className,
}: MultiSelectDropdownProps) {
  const triggerLabel = buildTriggerLabel(options, selectedValues, placeholder)

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          className={cn('h-10 w-full justify-between px-3 font-normal', className)}
        >
          <span className="truncate text-sm">{triggerLabel}</span>
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {onClear ? (
          <>
            <DropdownMenuCheckboxItem
              checked={selectedValues.length === 0}
              onCheckedChange={(checked) => {
                if (checked) {
                  onClear()
                }
              }}
            >
              {clearLabel}
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
          </>
        ) : null}
        {onSelectAll && options.length > 0 ? (
          <>
            <DropdownMenuCheckboxItem
              checked={selectedValues.length === options.length}
              onCheckedChange={(checked) => {
                if (checked) {
                  onSelectAll()
                }
              }}
            >
              {selectAllLabel}
            </DropdownMenuCheckboxItem>
            <DropdownMenuSeparator />
          </>
        ) : null}
        {options.length === 0 ? (
          <div className="px-2 py-3 text-sm text-muted-foreground">{emptyText}</div>
        ) : (
          <div className="max-h-64 overflow-y-auto">
            {options.map((option) => (
              <DropdownMenuCheckboxItem
                key={option.value}
                checked={selectedValues.includes(option.value)}
                onCheckedChange={() => onToggle(option.value)}
                className="items-start"
              >
                <div className="flex flex-col">
                  <span>{option.label}</span>
                  {option.description ? (
                    <span className="text-xs text-muted-foreground">{option.description}</span>
                  ) : null}
                </div>
              </DropdownMenuCheckboxItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}