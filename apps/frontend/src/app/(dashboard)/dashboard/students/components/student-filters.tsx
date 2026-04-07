'use client'

import { useState, useEffect } from 'react'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { api } from '@/lib/api-client'
import { X } from 'lucide-react'
import { useSession } from '@/context/session-context'
import { useAuth } from '@/context/auth-context'
import { teachersService } from '@/services/teachers.service'
import { usePermissions } from '@/hooks/use-permissions'

interface FilterProps {
    onFilterChange: (filters: {
        classId?: string;
        sectionId?: string;
        status?: string;
        balanceMin?: string;
        balanceMax?: string;
    }) => void
}

interface Class {
    id: string
    name: string
}

interface Section {
    id: string
    name: string
}

export function StudentFilters({ onFilterChange }: FilterProps) {
    const { selectedCampus } = useSession()
    const { user } = useAuth()
    const { can } = usePermissions()
    const canReadFinance = can('finance:read')
    const isTeacher = !!user?.teacherId
    const [classes, setClasses] = useState<Class[]>([])
    const [sections, setSections] = useState<Section[]>([])
    const [teacherAssignments, setTeacherAssignments] = useState<any[]>([])

    const [classId, setClassId] = useState<string>('')
    const [sectionId, setSectionId] = useState<string>('')
    const [status, setStatus] = useState<string>('')
    const [balanceMin, setBalanceMin] = useState<string>('')
    const [balanceMax, setBalanceMax] = useState<string>('')

    // Re-fetch classes when campus changes
    useEffect(() => {
        const fetchClasses = async () => {
            if (isTeacher) {
                const assignmentsRes = await teachersService.getMyClasses()
                if (assignmentsRes.success && assignmentsRes.data) {
                    const assignments = Array.isArray(assignmentsRes.data) ? assignmentsRes.data : (assignmentsRes.data as any).data || []
                    setTeacherAssignments(assignments)
                    const classMap = new Map<string, Class>()
                    for (const a of assignments) {
                        if (a.class) classMap.set(a.class.id, { id: a.class.id, name: a.class.name })
                    }
                    setClasses(Array.from(classMap.values()))
                }
            } else {
                const res = await api.get<{ data: Class[] }>('/academics/classes')
                if (res.success && res.data) {
                    const list = Array.isArray(res.data) ? res.data : (res.data as any).data || []
                    setClasses(list)
                }
            }
        }
        fetchClasses()
        // Reset filters when campus changes
        setClassId('')
        setSectionId('')
        setSections([])
    }, [selectedCampus, isTeacher])

    useEffect(() => {
        if (!classId) {
            setSections([])
            setSectionId('')
            return
        }
        if (isTeacher) {
            // Filter sections from teacher assignments
            const filtered = teacherAssignments
                .filter((a: any) => a.class?.id === classId && a.section)
                .map((a: any) => ({ id: a.section.id, name: a.section.name }))
            const seen = new Set<string>()
            const unique: Section[] = []
            for (const s of filtered) {
                if (!seen.has(s.id)) { seen.add(s.id); unique.push(s) }
            }
            if (unique.length > 0) {
                setSections(unique)
            } else {
                // Whole-class assignment (no specific sections) → fetch all sections
                const hasClassAssignment = teacherAssignments.some((a: any) => a.class?.id === classId)
                if (hasClassAssignment) {
                    const fetchSections = async () => {
                        try {
                            const res = await api.get<{ data: Section[] }>(`/academics/sections/class/${classId}`)
                            if (res.success && res.data) {
                                setSections(Array.isArray(res.data) ? res.data : [])
                            }
                        } catch (err) {
                            console.error('Failed to fetch sections:', err)
                            setSections([])
                        }
                    }
                    fetchSections()
                } else {
                    setSections([])
                }
            }
        } else {
            const fetchSections = async () => {
                try {
                    const res = await api.get<{ data: Section[] }>(`/academics/sections/class/${classId}`)
                    if (res.success && res.data) {
                        setSections(Array.isArray(res.data) ? res.data : [])
                    }
                } catch (err) {
                    console.error('Failed to fetch sections:', err)
                    setSections([])
                }
            }
            fetchSections()
        }
    }, [classId, isTeacher, teacherAssignments])

    useEffect(() => {
        onFilterChange({
            classId: classId || undefined,
            sectionId: sectionId || undefined,
            status: status || undefined,
            balanceMin: balanceMin || undefined,
            balanceMax: balanceMax || undefined
        })
    }, [classId, sectionId, status, balanceMin, balanceMax, onFilterChange])

    const clearFilters = () => {
        setClassId('')
        setSectionId('')
        setStatus('')
        setBalanceMin('')
        setBalanceMax('')
    }

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 items-center">

                <div className="space-y-1">
                    <Select value={classId} onValueChange={(v) => { setClassId(v); setSectionId('') }}>
                        <SelectTrigger className="w-full h-9">
                            <SelectValue placeholder="Filter by Class" />
                        </SelectTrigger>
                        <SelectContent>
                            {classes.map((c) => (
                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-1">
                    <Select value={sectionId} onValueChange={setSectionId} disabled={!classId}>
                        <SelectTrigger className="w-full h-9">
                            <SelectValue placeholder="Filter by Section" />
                        </SelectTrigger>
                        <SelectContent>
                            {sections.map((s) => (
                                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {canReadFinance && (
                <div className="space-y-1">
                    <input
                        type="number"
                        value={balanceMin}
                        onChange={(e) => setBalanceMin(e.target.value)}
                        placeholder="Min Balance"
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    />
                </div>
                )}

                {canReadFinance && (
                <div className="space-y-1">
                    <input
                        type="number"
                        value={balanceMax}
                        onChange={(e) => setBalanceMax(e.target.value)}
                        placeholder="Max Balance"
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                    />
                </div>
                )}

                <div className="space-y-1">
                    <div className="flex gap-2">
                        <Select value={status} onValueChange={setStatus}>
                            <SelectTrigger className="w-full h-9">
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ACTIVE">Active</SelectItem>
                                <SelectItem value="INACTIVE">Inactive</SelectItem>
                                <SelectItem value="LEFT">Left School</SelectItem>
                                <SelectItem value="TRANSFERRED">Transferred</SelectItem>
                                <SelectItem value="GRADUATED">Graduated</SelectItem>
                                <SelectItem value="SUSPENDED">Suspended</SelectItem>
                            </SelectContent>
                        </Select>

                        {(classId || sectionId || status || balanceMin || balanceMax) && (
                            <Button variant="ghost" size="icon" onClick={clearFilters} title="Clear Filters" className="h-9 w-9 shrink-0 px-0">
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

