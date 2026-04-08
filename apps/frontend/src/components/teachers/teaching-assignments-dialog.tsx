'use client'

import { useMemo, useState } from 'react'
import { Search, Plus, X, BookOpen, GraduationCap, ChevronRight, ShieldCheck, ClipboardCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { MultiSelectDropdown } from '@/components/ui/multi-select-dropdown'
import { Spinner } from '@/components/ui/spinner'
import { Skeleton } from '@/components/ui/skeleton'

export interface SubjectOption {
  id: string
  name: string
  code?: string
}

export interface TeachingAssignmentClass {
  id: string
  name: string
  sections: Array<{ id: string; name: string }>
  subjects: SubjectOption[]
}

export interface TeachingAssignmentSelection {
  sectionIds: Set<string>
  subjectIds: Set<string>
  isClassTeacher: boolean
  isSubjectTeacher: boolean
}

interface TeachingAssignmentsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  teacherName: string
  academicYearName?: string
  availableClasses: TeachingAssignmentClass[]
  selectedMap: Record<string, TeachingAssignmentSelection>
  saving: boolean
  loading: boolean
  onToggleClass: (classId: string) => void
  onToggleSection: (classId: string, sectionId: string) => void
  onToggleSubject: (classId: string, subjectId: string) => void
  onToggleClassTeacher: (classId: string) => void
  onToggleSubjectTeacher: (classId: string) => void
  onSave: () => void
}

function LoadingSkeleton() {
  return (
    <div className="grid min-h-[420px] grid-cols-1 md:grid-cols-2">
      <div className="space-y-4 bg-primary-50/40 p-5">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-5 rounded" />
          <Skeleton className="h-5 w-28" />
          <Skeleton className="ml-auto h-4 w-16 rounded-full" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
      </div>
      <div className="space-y-4 border-l p-5">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="ml-auto h-7 w-40 rounded-md" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      </div>
    </div>
  )
}

export function TeachingAssignmentsDialog({
  open,
  onOpenChange,
  teacherName,
  academicYearName,
  availableClasses,
  selectedMap,
  saving,
  loading,
  onToggleClass,
  onToggleSection,
  onToggleSubject,
  onToggleClassTeacher,
  onToggleSubjectTeacher,
  onSave,
}: TeachingAssignmentsDialogProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const selectedClassIds = Object.keys(selectedMap)
  const normalizedQuery = searchQuery.trim().toLowerCase()

  const selectedClasses = useMemo(
    () => availableClasses.filter((c) => selectedClassIds.includes(c.id)),
    [availableClasses, selectedClassIds],
  )

  const unselectedClasses = useMemo(() => {
    const classes = availableClasses.filter((c) => !selectedClassIds.includes(c.id))
    if (!normalizedQuery) return classes
    return classes.filter((item) => {
      const text = `${item.name} ${item.sections.map((s) => s.name).join(' ')} ${item.subjects.map((s) => s.name).join(' ')}`
      return text.toLowerCase().includes(normalizedQuery)
    })
  }, [availableClasses, selectedClassIds, normalizedQuery])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl overflow-hidden p-0">
        {/* ── Header ── */}
        <div className="border-b bg-muted/30 px-6 py-4">
          <DialogHeader className="space-y-1">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-100 text-primary-600">
                <GraduationCap className="h-4 w-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold text-foreground">Teaching Assignments</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Configure {teacherName}&apos;s teaching load for {academicYearName || 'the selected academic year'}.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* ── Body ── */}
        {loading ? (
          <LoadingSkeleton />
        ) : availableClasses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <BookOpen className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">No classes available</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Create classes in Academics first.</p>
          </div>
        ) : (
          <div className="grid min-h-[420px] grid-cols-1 md:grid-cols-2">
            {/* ── Left: Selected Classes ── */}
            <div className="flex flex-col bg-primary-50/30">
              <div className="flex h-11 items-center gap-2 border-b bg-primary-50/50 px-5">
                <span className="text-xs font-semibold uppercase tracking-wider text-primary-700">Assigned</span>
                <Badge className="h-5 rounded-full bg-primary-600 px-2 text-[10px] font-semibold text-white">
                  {selectedClasses.length}
                </Badge>
                <span className="ml-auto rounded-full bg-primary-100 px-2.5 py-0.5 text-[10px] font-medium text-primary-700">
                  {academicYearName}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-4" style={{ maxHeight: '55vh' }}>
                {selectedClasses.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-14 text-center">
                    <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary-100/60">
                      <BookOpen className="h-4 w-4 text-primary-400" />
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">No classes assigned</p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground/60">
                      Add from the right panel <ChevronRight className="h-3 w-3" />
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {selectedClasses.map((item) => {
                      const selection = selectedMap[item.id]
                      const sectionValues = selection ? Array.from(selection.sectionIds) : []
                      const subjectValues = selection ? Array.from(selection.subjectIds) : []
                      const selectedSectionNames = item.sections
                        .filter((s) => sectionValues.includes(s.id))
                        .map((s) => s.name)
                      const selectedSubjectNames = item.subjects
                        .filter((s) => subjectValues.includes(s.id))
                        .map((s) => s.name)

                      return (
                        <div key={item.id} className="rounded-xl border border-primary-200 bg-white p-3.5 shadow-sm">
                          <div className="mb-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary-100 text-[10px] font-bold text-primary-700">
                                {item.name.replace(/\D/g, '') || item.name.charAt(0)}
                              </div>
                              <span className="text-sm font-semibold text-foreground">{item.name}</span>
                            </div>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 rounded-md text-muted-foreground hover:bg-danger-50 hover:text-danger-600"
                              onClick={() => onToggleClass(item.id)}
                            >
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>

                          {/* ── Role Toggles ── */}
                          <div className="mb-3 flex gap-2">
                            <button
                              type="button"
                              onClick={() => onToggleClassTeacher(item.id)}
                              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-all ${
                                selection?.isClassTeacher
                                  ? 'border-primary-300 bg-primary-50 text-primary-700 shadow-sm'
                                  : 'border-border bg-muted/30 text-muted-foreground hover:border-primary-200 hover:bg-primary-50/50'
                              }`}
                            >
                              <ShieldCheck className="h-3.5 w-3.5" />
                              Class Teacher
                            </button>
                            <button
                              type="button"
                              onClick={() => onToggleSubjectTeacher(item.id)}
                              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-medium transition-all ${
                                selection?.isSubjectTeacher
                                  ? 'border-success-500 bg-success-50 text-success-700 shadow-sm'
                                  : 'border-border bg-muted/30 text-muted-foreground hover:border-success-500/50 hover:bg-success-50/50'
                              }`}
                            >
                              <BookOpen className="h-3.5 w-3.5" />
                              Subject Teacher
                            </button>
                          </div>

                          {/* Class Teacher info strip */}
                          {selection?.isClassTeacher && (
                            <div className="mb-3 flex items-center gap-2 rounded-lg bg-primary-50/80 px-3 py-2 text-[11px] text-primary-700">
                              <ClipboardCheck className="h-3.5 w-3.5 shrink-0" />
                              <span>Full access: attendance, report cards, all subject marks &amp; results</span>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-3">
                            {/* Sections */}
                            <div className="space-y-1.5">
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Sections</span>
                              <MultiSelectDropdown
                                label={`${item.name} sections`}
                                placeholder="All sections"
                                clearLabel="All sections"
                                selectAllLabel="Select all"
                                options={item.sections.map((s) => ({ value: s.id, label: s.name }))}
                                selectedValues={sectionValues}
                                onToggle={(id) => onToggleSection(item.id, id)}
                                onClear={() => { for (const id of sectionValues) onToggleSection(item.id, id) }}
                                onSelectAll={() => {
                                  for (const s of item.sections) {
                                    if (!sectionValues.includes(s.id)) onToggleSection(item.id, s.id)
                                  }
                                }}
                                emptyText="No sections"
                              />
                              <div className="flex flex-wrap gap-1">
                                {(selectedSectionNames.length > 0 ? selectedSectionNames : ['All']).map((n) => (
                                  <Badge key={n} className="border-primary-200 bg-primary-50 text-[10px] font-normal text-primary-700">{n}</Badge>
                                ))}
                              </div>
                            </div>

                            {/* Subjects */}
                            <div className={`space-y-1.5 ${!selection?.isSubjectTeacher ? 'pointer-events-none opacity-40' : ''}`}>
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Subjects</span>
                              <MultiSelectDropdown
                                label={`${item.name} subjects`}
                                placeholder="Select subjects"
                                selectAllLabel="Select all"
                                options={item.subjects.map((s) => ({ value: s.id, label: s.name, description: s.code || undefined }))}
                                selectedValues={subjectValues}
                                onToggle={(id) => onToggleSubject(item.id, id)}
                                onSelectAll={() => {
                                  for (const s of item.subjects) {
                                    if (!subjectValues.includes(s.id)) onToggleSubject(item.id, s.id)
                                  }
                                }}
                                emptyText="No subjects"
                              />
                              <div className="flex flex-wrap gap-1">
                                {selectedSubjectNames.length > 0
                                  ? selectedSubjectNames.map((n) => (
                                      <Badge key={n} className="border-success-50 bg-success-50 text-[10px] font-normal text-success-700">{n}</Badge>
                                    ))
                                  : <span className="text-[10px] italic text-warning-600">None selected</span>}
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* ── Right: Available Classes ── */}
            <div className="flex flex-col border-l">
              <div className="flex h-11 items-center gap-3 border-b px-5">
                <span className="shrink-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Available</span>
                <div className="relative ml-auto w-full max-w-[180px]">
                  <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search classes..."
                    className="h-7 rounded-md border-border bg-muted/40 pl-8 text-xs focus:bg-white"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4" style={{ maxHeight: '55vh' }}>
                {unselectedClasses.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-14 text-center">
                    <p className="text-sm text-muted-foreground">
                      {normalizedQuery ? 'No classes match your search.' : 'All classes have been assigned.'}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {unselectedClasses.map((item) => (
                      <div
                        key={item.id}
                        className="group flex items-center justify-between rounded-xl border border-border bg-white px-4 py-3 transition-all hover:border-primary-200 hover:bg-primary-50/30 hover:shadow-sm"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-muted text-xs font-bold text-muted-foreground group-hover:bg-primary-100 group-hover:text-primary-700">
                            {item.name.replace(/\D/g, '') || item.name.charAt(0)}
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-foreground">{item.name}</p>
                            <p className="text-[11px] text-muted-foreground">
                              {item.sections.length} section{item.sections.length !== 1 && 's'} &middot; {item.subjects.length} subject{item.subjects.length !== 1 && 's'}
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="ml-3 h-7 shrink-0 gap-1 border-primary-200 px-2.5 text-xs text-primary-600 hover:bg-primary-600 hover:text-white"
                          onClick={() => onToggleClass(item.id)}
                        >
                          <Plus className="h-3 w-3" />
                          Add
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── Footer ── */}
        <DialogFooter className="border-t bg-muted/20 px-6 py-3">
          <DialogClose asChild>
            <Button variant="outline" size="sm">Cancel</Button>
          </DialogClose>
          <Button
            onClick={onSave}
            disabled={saving || loading}
            size="sm"
            className="bg-primary-600 text-white hover:bg-primary-700"
          >
            {saving ? <><Spinner size="sm" className="mr-2" />Saving...</> : 'Save Assignments'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}