'use client'

import { Search, FilterX } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SelectEmptyItem, SelectLoadingItem } from '@/components/ui/select-state-items'

interface OptionItem {
  id: string
  name: string
}

interface ExamResultsFiltersBarProps {
  search: string
  onSearchChange: (value: string) => void
  classId: string
  onClassChange: (value: string) => void
  sectionId: string
  onSectionChange: (value: string) => void
  classes: OptionItem[]
  sections: OptionItem[]
  classesLoading?: boolean
  sectionsLoading?: boolean
  onReset: () => void
}

export function ExamResultsFiltersBar(props: ExamResultsFiltersBarProps) {
  const {
    search,
    onSearchChange,
    classId,
    onClassChange,
    sectionId,
    onSectionChange,
    classes,
    sections,
    classesLoading = false,
    sectionsLoading = false,
    onReset,
  } = props

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center">
      <div className="relative w-full md:max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search by student name or roll number"
          className="pl-9"
        />
      </div>

      <Select
        value={classId || 'all'}
        onValueChange={(value) => onClassChange(value === 'all' ? '' : value)}
        disabled={classesLoading}
      >
        <SelectTrigger className="w-full md:w-44">
          <SelectValue placeholder="All Classes" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Classes</SelectItem>
          {classesLoading ? (
            <SelectLoadingItem label="Loading classes..." />
          ) : classes.length > 0 ? (
            classes.map((item) => (
              <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
            ))
          ) : (
            <SelectEmptyItem label="No classes available" />
          )}
        </SelectContent>
      </Select>

      <Select
        value={sectionId || 'all'}
        onValueChange={(value) => onSectionChange(value === 'all' ? '' : value)}
        disabled={sectionsLoading}
      >
        <SelectTrigger className="w-full md:w-44">
          <SelectValue placeholder="All Sections" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Sections</SelectItem>
          {sectionsLoading ? (
            <SelectLoadingItem label="Loading sections..." />
          ) : sections.length > 0 ? (
            sections.map((item) => (
              <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
            ))
          ) : (
            <SelectEmptyItem label="No sections available" />
          )}
        </SelectContent>
      </Select>

      <Button variant="outline" onClick={onReset}>
        <FilterX className="mr-2 h-4 w-4" />
        Reset
      </Button>
    </div>
  )
}
