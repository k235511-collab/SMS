'use client'

import { Search, FilterX } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

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

      <Select value={classId || 'all'} onValueChange={(value) => onClassChange(value === 'all' ? '' : value)}>
        <SelectTrigger className="w-full md:w-44">
          <SelectValue placeholder="All Classes" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Classes</SelectItem>
          {classes.map((item) => (
            <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={sectionId || 'all'} onValueChange={(value) => onSectionChange(value === 'all' ? '' : value)}>
        <SelectTrigger className="w-full md:w-44">
          <SelectValue placeholder="All Sections" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Sections</SelectItem>
          {sections.map((item) => (
            <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button variant="outline" onClick={onReset}>
        <FilterX className="mr-2 h-4 w-4" />
        Reset
      </Button>
    </div>
  )
}
