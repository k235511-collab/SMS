'use client'

import { useState, useEffect, useRef } from 'react'
import { Input } from '@/components/ui/input'
import { Search, Loader2, X, User } from 'lucide-react'
import { api } from '@/lib/api-client'
import { cn } from '@/lib/utils'
import { useSession } from '@/context/session-context'

interface Student {
    id: string
    rollNumber: string
    firstName: string
    lastName: string
    class?: { name: string }
    section?: { name: string }
}

interface StudentSearchProps {
    /** Callback when a student is selected from dropdown */
    onSelect: (student: Student | null) => void
    /** Callback on every typing change (useful for parent-side filtering) */
    onQueryChange?: (query: string) => void
    /** Behavior mode: 'select' resets query on selection (Finance), 'filter' keeps query (Exams) */
    mode?: 'select' | 'filter'
    /** Optional: If provided, search will only happen locally on this list instead of API */
    localStudents?: Student[]
    /** If true, the results dropdown will not be shown (useful when results appear elsewhere like a table) */
    hideDropdown?: boolean
    placeholder?: string
    classId?: string
    className?: string
    defaultValue?: string
    academicYearId?: string
}

export function StudentSearch({
    onSelect,
    onQueryChange,
    mode = 'select',
    localStudents,
    hideDropdown = false,
    placeholder = 'Search by name or roll number...',
    classId,
    className,
    defaultValue = '',
    academicYearId,
}: StudentSearchProps) {
    const { selectedYear } = useSession()
    const [query, setQuery] = useState(defaultValue)
    const [results, setResults] = useState<Student[]>([])
    const [loading, setLoading] = useState(false)
    const [isOpen, setIsOpen] = useState(false)
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)

    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Sync with defaultValue if it changes from parent
    useEffect(() => {
        if (defaultValue !== undefined && defaultValue !== query) {
            setQuery(defaultValue)
        }
    }, [defaultValue])

    useEffect(() => {
        if (query.length < 2 || (mode === 'select' && selectedStudent)) {
            setResults([])
            setIsOpen(false)
            return
        }

        // Local Search logic
        if (localStudents) {
            const q = query.toLowerCase()
            const filtered = localStudents.filter(s =>
                s.firstName.toLowerCase().includes(q) ||
                s.lastName.toLowerCase().includes(q) ||
                s.rollNumber.toLowerCase().includes(q)
            ).slice(0, 10)
            setResults(filtered)
            setIsOpen(filtered.length > 0)
            setLoading(false)
            return
        }

        // API Search logic
        const search = async () => {
            setLoading(true)
            try {
                const params: any = {
                    search: query,
                    pageSize: 10,
                    academicYearId: academicYearId || selectedYear?.id,
                }
                if (classId && classId !== 'all') {
                    params.classId = classId
                }

                const res = await api.get<any>('/students', { params })
                if (res.success && res.data) {
                    setResults(Array.isArray(res.data.data) ? res.data.data : [])
                    setIsOpen(true)
                }
            } catch (err) {
                console.error('Student search failed:', err)
                setResults([])
            } finally {
                setLoading(false)
            }
        }

        const timer = setTimeout(search, 400)
        return () => clearTimeout(timer)
    }, [query, classId, selectedYear, academicYearId, selectedStudent, localStudents, mode])

    const handleSelect = (student: Student) => {
        if (mode === 'select') {
            setSelectedStudent(student)
            setQuery(`${student.firstName} ${student.lastName} (${student.rollNumber})`)
        } else {
            // In filter mode, we just update the query to the chosen name for better UX
            setQuery(student.firstName)
            onQueryChange?.(student.firstName)
        }
        setResults([])
        setIsOpen(false)
        onSelect(student)
    }

    const handleClear = () => {
        setSelectedStudent(null)
        setQuery('')
        setResults([])
        setIsOpen(false)
        onSelect(null)
        onQueryChange?.('')
    }

    return (
        <div className={cn('relative w-full', className)} ref={containerRef}>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                    placeholder={placeholder}
                    value={query}
                    onChange={(e) => {
                        const val = e.target.value
                        setQuery(val)
                        onQueryChange?.(val)
                        if (selectedStudent) {
                            setSelectedStudent(null)
                            onSelect(null)
                        }
                    }}
                    onFocus={() => query.length >= 2 && results.length > 0 && setIsOpen(true)}
                    className="pl-9 pr-9"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                    {loading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                    {(query || (mode === 'select' && selectedStudent)) && !loading && (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="text-muted-foreground hover:text-foreground transition-colors"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>

            {!hideDropdown && isOpen && results.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 max-h-60 overflow-y-auto rounded-md border bg-popover shadow-md z-[100] p-1 animate-in fade-in zoom-in-95 duration-100">
                    {results.map((student) => (
                        <button
                            key={student.id}
                            type="button"
                            className="flex w-full items-start gap-2 rounded-sm px-2 py-1.5 text-left text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                            onClick={() => handleSelect(student)}
                        >
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                                <User className="h-4 w-4" />
                            </div>
                            <div className="flex flex-col">
                                <span className="font-medium text-foreground">
                                    {student.firstName} {student.lastName}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                    {student.rollNumber} {student.class ? `· ${student.class.name}` : ''}
                                </span>
                            </div>
                        </button>
                    ))}
                </div>
            )}

            {!hideDropdown && isOpen && query.length >= 2 && !loading && results.length === 0 && (
                <div className="absolute left-0 right-0 top-full mt-1 border bg-popover rounded-md shadow-md z-[100] py-4 text-center text-sm text-muted-foreground">
                    No students found
                </div>
            )}
        </div>
    )
}
