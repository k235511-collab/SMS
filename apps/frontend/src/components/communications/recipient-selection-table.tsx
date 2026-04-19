'use client'

import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { RawInput } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatPakistaniPhone, validatePakistaniPhone } from './phone-utils'
import { RecipientItem, TriggerKey } from './types'

interface RecipientSelectionTableProps {
  trigger: TriggerKey
  recipients: RecipientItem[]
  selectedStudentIds: string[]
  loading: boolean
  recipientDate: string
  onRefresh: () => void
  onToggleSelected: (studentId: string, checked: boolean) => void
  onToggleMany: (studentIds: string[], checked: boolean) => void
}

const ALL_CLASSES = '__ALL_CLASSES__'
const ALL_SECTIONS = '__ALL_SECTIONS__'
const NOT_SET = 'Not set'

function normalizeGroupValue(value?: string | null) {
  return value?.trim() || NOT_SET
}

function formatDateForDisplay(input: string) {
  const parts = input.split('-')
  if (parts.length !== 3) return input

  const [year, month, day] = parts.map((value) => Number(value))
  if (!year || !month || !day) return input
  return new Date(year, month - 1, day).toLocaleDateString()
}

export function RecipientSelectionTable({
  trigger,
  recipients,
  selectedStudentIds,
  loading,
  recipientDate,
  onRefresh,
  onToggleSelected,
  onToggleMany,
}: RecipientSelectionTableProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedClass, setSelectedClass] = useState(ALL_CLASSES)
  const [selectedSection, setSelectedSection] = useState(ALL_SECTIONS)

  const classOptions = useMemo(
    () =>
      Array.from(new Set(recipients.map((item) => normalizeGroupValue(item.className)))).sort((a, b) =>
        a.localeCompare(b),
      ),
    [recipients],
  )

  const sectionOptions = useMemo(() => {
    const scoped = recipients.filter((item) =>
      selectedClass === ALL_CLASSES
        ? true
        : normalizeGroupValue(item.className) === selectedClass,
    )

    return Array.from(new Set(scoped.map((item) => normalizeGroupValue(item.sectionName)))).sort((a, b) =>
      a.localeCompare(b),
    )
  }, [recipients, selectedClass])

  useEffect(() => {
    if (selectedSection === ALL_SECTIONS) return
    if (!sectionOptions.includes(selectedSection)) {
      setSelectedSection(ALL_SECTIONS)
    }
  }, [sectionOptions, selectedSection])

  const filteredRecipients = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()

    return recipients.filter((item) => {
      const classLabel = normalizeGroupValue(item.className)
      const sectionLabel = normalizeGroupValue(item.sectionName)

      if (selectedClass !== ALL_CLASSES && classLabel !== selectedClass) {
        return false
      }

      if (selectedSection !== ALL_SECTIONS && sectionLabel !== selectedSection) {
        return false
      }

      if (!query) return true

      const searchable = [
        item.fullName,
        item.rollNumber || '',
        item.studentPhone || '',
        item.studentPhoneNormalized || '',
        classLabel,
        sectionLabel,
      ]
        .join(' ')
        .toLowerCase()

      return searchable.includes(query)
    })
  }, [recipients, searchQuery, selectedClass, selectedSection])

  const filteredRecipientIds = useMemo(
    () => filteredRecipients.map((item) => item.studentId),
    [filteredRecipients],
  )

  const classSectionRecipientIds = useMemo(
    () =>
      recipients
        .filter((item) => {
          if (selectedClass === ALL_CLASSES) return false

          const classMatch = normalizeGroupValue(item.className) === selectedClass
          const sectionMatch =
            selectedSection === ALL_SECTIONS ||
            normalizeGroupValue(item.sectionName) === selectedSection

          return classMatch && sectionMatch
        })
        .map((item) => item.studentId),
    [recipients, selectedClass, selectedSection],
  )

  const allChecked =
    filteredRecipientIds.length > 0 &&
    filteredRecipientIds.every((studentId) => selectedStudentIds.includes(studentId))

  const selectedInViewCount = filteredRecipientIds.filter((studentId) =>
    selectedStudentIds.includes(studentId),
  ).length

  const validInViewCount = filteredRecipients.filter((item) => {
    const validation = validatePakistaniPhone(item.studentPhone)
    return typeof item.phoneValid === 'boolean' ? item.phoneValid : validation.isValid
  }).length

  const handleSelectVisible = (checked: boolean) => {
    onToggleMany(filteredRecipientIds, checked)
  }

  const handleClassSectionSelection = (checked: boolean) => {
    onToggleMany(classSectionRecipientIds, checked)
  }

  const resetFilters = () => {
    setSearchQuery('')
    setSelectedClass(ALL_CLASSES)
    setSelectedSection(ALL_SECTIONS)
  }

  const hasActiveFilters =
    searchQuery.trim().length > 0 ||
    selectedClass !== ALL_CLASSES ||
    selectedSection !== ALL_SECTIONS

  const classSectionLabel =
    selectedClass === ALL_CLASSES
      ? 'Select class/section'
      : selectedSection === ALL_SECTIONS
        ? `${selectedClass} (all sections)`
        : `${selectedClass} / ${selectedSection}`

  const heading =
    trigger === 'ABSENT'
      ? 'Today\'s absent student list'
      : trigger === 'FEE_DEFAULTER'
        ? 'Fee reminder list'
        : 'Announcement list'

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-semibold">{heading}</p>
          <p className="text-xs text-muted-foreground">
            {trigger === 'ABSENT'
              ? 'This list is always for today. Select students and review phone numbers before sending.'
              : 'Select students and review phone numbers before sending.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {trigger === 'ABSENT' ? (
            <span className="rounded-md border border-primary-100 bg-primary-50/70 px-3 py-2 text-sm text-primary-800">
              Date: {formatDateForDisplay(recipientDate)}
            </span>
          ) : null}
          <Button size="sm" variant="secondary" onClick={onRefresh}>
            Refresh list
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading recipients...</p>
      ) : recipients.length === 0 ? (
        <p className="text-sm text-muted-foreground">No recipients found for this trigger.</p>
      ) : (
        <>
          <div className="space-y-3 rounded-md border border-primary-100/70 bg-primary-50/40 p-3">
            <div className="grid gap-2 md:grid-cols-[1.4fr_0.8fr_0.8fr_auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <RawInput
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search student, roll, phone, class, section"
                  className="pl-9"
                />
              </div>

              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="Class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_CLASSES}>All classes</SelectItem>
                  {classOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                value={selectedSection}
                onValueChange={setSelectedSection}
                disabled={selectedClass === ALL_CLASSES}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Section" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_SECTIONS}>All sections</SelectItem>
                  {sectionOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="flex items-center justify-end gap-2">
                <Button size="sm" variant="secondary" onClick={() => handleClassSectionSelection(true)} disabled={classSectionRecipientIds.length === 0}>
                  Select class/section
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleClassSectionSelection(false)} disabled={classSectionRecipientIds.length === 0}>
                  Clear class/section
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary">{filteredRecipients.length} visible</Badge>
              <Badge variant="success">{validInViewCount} valid numbers</Badge>
              <Badge variant="primary">{selectedInViewCount} selected in view</Badge>
              <Badge variant="outline">{selectedStudentIds.length} selected total</Badge>
              <Badge variant="outline">{classSectionLabel}</Badge>
              {hasActiveFilters ? (
                <Button size="sm" variant="ghost" onClick={resetFilters}>
                  Reset filters
                </Button>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={allChecked} onCheckedChange={(checked) => handleSelectVisible(!!checked)} />
              Select visible
            </label>
            <span className="text-xs text-muted-foreground">
              Bulk actions work with current search/filter view.
            </span>
          </div>

          {filteredRecipients.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No students match your current search/filter. Try resetting filters.
            </p>
          ) : (
            <Table className="rounded-lg border border-primary-100 bg-background">
              <TableHeader className="bg-primary-50/70 [&_tr]:border-primary-100">
                <TableRow className="hover:bg-primary-50/70">
                  <TableHead className="w-[80px] text-primary-800">Select</TableHead>
                  <TableHead className="text-primary-800">Student</TableHead>
                  <TableHead className="text-primary-800">Class</TableHead>
                  <TableHead className="text-primary-800">Student phone</TableHead>
                  <TableHead className="text-primary-800">Number status</TableHead>
                  {trigger === 'ABSENT' ? (
                    <TableHead className="text-primary-800">Date</TableHead>
                  ) : trigger === 'FEE_DEFAULTER' ? (
                    <>
                      <TableHead className="text-primary-800">Outstanding</TableHead>
                      <TableHead className="text-primary-800">Overdue days</TableHead>
                    </>
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRecipients.map((item) => {
                  const validation = validatePakistaniPhone(item.studentPhone)
                  const isPhoneValid =
                    typeof item.phoneValid === 'boolean' ? item.phoneValid : validation.isValid
                  const normalizedPhone = item.studentPhoneNormalized || validation.normalized
                  return (
                    <TableRow key={item.studentId}>
                      <TableCell>
                        <Checkbox
                          checked={selectedStudentIds.includes(item.studentId)}
                          onCheckedChange={(checked) => onToggleSelected(item.studentId, !!checked)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{item.fullName}</div>
                        {item.rollNumber ? (
                          <div className="text-xs text-muted-foreground">Roll: {item.rollNumber}</div>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        {item.className || '-'}
                        {item.sectionName ? ` / ${item.sectionName}` : ''}
                      </TableCell>
                      <TableCell>{formatPakistaniPhone(normalizedPhone || item.studentPhone)}</TableCell>
                      <TableCell>
                        <Badge variant={isPhoneValid ? 'success' : 'warning'}>
                          {isPhoneValid ? 'Valid' : 'Check number'}
                        </Badge>
                      </TableCell>
                      {trigger === 'ABSENT' ? (
                        <TableCell>{formatDateForDisplay(recipientDate)}</TableCell>
                      ) : trigger === 'FEE_DEFAULTER' ? (
                        <>
                          <TableCell>PKR {item.outstandingAmount ?? 0}</TableCell>
                          <TableCell>{item.maxOverdueDays ?? 0}</TableCell>
                        </>
                      ) : null}
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </>
      )}
    </div>
  )
}
