'use client'

import { useState, useEffect } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { assignmentsService } from '@/services/assignments.service'
import { academicsService } from '@/services/academics.service'
import { teachersService } from '@/services/teachers.service'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'
import { useSession } from '@/context/session-context'
import { useAuth } from '@/context/auth-context'

interface AddAssignmentDialogProps {
    onSuccess: () => void
    assignment?: any // Add assignment prop for edit mode
    trigger?: React.ReactNode // Optional custom trigger
}

export function AddAssignmentDialog({ onSuccess, assignment, trigger }: AddAssignmentDialogProps) {
    const { selectedCampus } = useSession()
    const { user } = useAuth()
    const isTeacher = !!user?.teacherId
    const [open, setOpen] = useState(false)
    const isEdit = !!assignment
    const [loading, setLoading] = useState(false)
    const [classes, setClasses] = useState<any[]>([])
    const [subjects, setSubjects] = useState<any[]>([])
    const [teacherAssignments, setTeacherAssignments] = useState<any[]>([])

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        dueDate: '',
        totalMarks: '100',
        type: 'HOMEWORK',
        classId: '',
        subjectId: '',
    })

    // Reset/Set form when dialog opens or assignment changes
    useEffect(() => {
        if (open) {
            if (assignment) {
                setFormData({
                    title: assignment.title || '',
                    description: assignment.description || '',
                    dueDate: assignment.dueDate ? new Date(assignment.dueDate).toISOString().split('T')[0] : '',
                    totalMarks: String(assignment.totalMarks || '100'),
                    type: assignment.type || 'HOMEWORK',
                    classId: assignment.classId || '',
                    subjectId: assignment.subjectId || '',
                })
            } else {
                setFormData({
                    title: '',
                    description: '',
                    dueDate: '',
                    totalMarks: '100',
                    type: 'HOMEWORK',
                    classId: '',
                    subjectId: '',
                })
            }
        }
    }, [open, assignment])

    useEffect(() => {
        if (!open) return

        const fetchClasses = async () => {
            try {
                if (isTeacher) {
                    // Teacher: scope to assigned classes
                    const assignmentsRes = await teachersService.getMyClasses()
                    if (assignmentsRes.success && assignmentsRes.data) {
                        const assignments = Array.isArray(assignmentsRes.data) ? assignmentsRes.data : (assignmentsRes.data as any).data || []
                        setTeacherAssignments(assignments)
                        // Extract unique classes
                        const classMap = new Map<string, any>()
                        for (const a of assignments) {
                            if (a.class) classMap.set(a.class.id, a.class)
                        }
                        setClasses(Array.from(classMap.values()))
                    }
                } else {
                    const classesRes = await academicsService.getClasses()

                    if (classesRes.success && classesRes.data?.data) {
                        setClasses(Array.isArray(classesRes.data.data) ? classesRes.data.data : [])
                    } else if (classesRes.success && Array.isArray(classesRes.data)) {
                        setClasses(classesRes.data)
                    }
                }
            } catch (error) {
                console.error(error)
                toast.error('Failed to load classes')
            }
        }

        fetchClasses()
    }, [open, selectedCampus?.id, isTeacher])

    useEffect(() => {
        if (!open) return

        const fetchSubjects = async () => {
            try {
                if (!formData.classId) {
                    setSubjects([])
                    return
                }

                if (isTeacher) {
                    // Teacher: filter subjects from their assignments for selected class
                    const filtered = teacherAssignments
                        .filter((a: any) => a.class?.id === formData.classId && a.subject)
                        .map((a: any) => ({ id: a.subject.id, name: a.subject.name, code: a.subject.code || '', classId: formData.classId }))
                    const seen = new Set<string>()
                    const unique: any[] = []
                    for (const s of filtered) {
                        if (!seen.has(s.id)) { seen.add(s.id); unique.push(s) }
                    }
                    setSubjects(unique)
                    return
                }

                const subjectsRes = await academicsService.getSubjects(formData.classId)
                if (subjectsRes.success && subjectsRes.data?.data) {
                    setSubjects(Array.isArray(subjectsRes.data.data) ? subjectsRes.data.data : [])
                } else if (subjectsRes.success && Array.isArray(subjectsRes.data)) {
                    setSubjects(subjectsRes.data)
                } else {
                    setSubjects([])
                }
            } catch (error) {
                console.error(error)
                toast.error('Failed to load subjects')
            }
        }

        fetchSubjects()
    }, [open, formData.classId, selectedCampus?.id, isTeacher, teacherAssignments])

    // Filter subjects based on selected class
    const filteredSubjects = formData.classId
        ? subjects.filter(s => s.classId === formData.classId)
        : []

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.title || !formData.dueDate || !formData.classId || !formData.subjectId) {
            toast.error('Please fill in all required fields')
            return
        }

        setLoading(true)
        try {
            const data = {
                ...formData,
                totalMarks: Number(formData.totalMarks),
            }

            const res = isEdit
                ? await assignmentsService.update(assignment.id, data)
                : await assignmentsService.create(data)

            if (res.success) {
                toast.success(isEdit ? 'Assignment updated successfully' : 'Assignment created successfully')
                setOpen(false)
                if (!isEdit) {
                    setFormData({
                        title: '', description: '', dueDate: '',
                        totalMarks: '100', type: 'HOMEWORK', classId: '', subjectId: ''
                    })
                }
                onSuccess()
            } else {
                toast.error(res.message || `Failed to ${isEdit ? 'update' : 'create'} assignment`)
            }
        } catch (error) {
            toast.error('An error occurred')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {trigger || (
                    <Button>
                        <Plus className="mr-2 h-4 w-4" /> Create Assignment
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{isEdit ? 'Edit Assignment' : 'Create New Assignment'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="title">Title *</Label>
                        <Input
                            id="title"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            placeholder="e.g. Chapter 1 Homework"
                            required
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="class">Class *</Label>
                            <Select value={formData.classId} onValueChange={(v) => setFormData({ ...formData, classId: v, subjectId: '' })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Class" />
                                </SelectTrigger>
                                <SelectContent>
                                    {classes.map((c) => (
                                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="subject">Subject *</Label>
                            <Select value={formData.subjectId} onValueChange={(v) => setFormData({ ...formData, subjectId: v })}>
                                <SelectTrigger>
                                    <SelectValue placeholder={formData.classId ? 'Select Subject' : 'Select Class first'} />
                                </SelectTrigger>
                                <SelectContent>
                                    {filteredSubjects.map((s) => (
                                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="dueDate">Due Date *</Label>
                            <Input
                                id="dueDate"
                                type="date"
                                value={formData.dueDate}
                                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                                required
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="totalMarks">Total Marks</Label>
                            <Input
                                id="totalMarks"
                                type="number"
                                value={formData.totalMarks}
                                onChange={(e) => setFormData({ ...formData, totalMarks: e.target.value })}
                                min={0}
                            />
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="type">Type</Label>
                        <Select value={formData.type} onValueChange={(v) => setFormData({ ...formData, type: v })}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select Type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="HOMEWORK">Homework</SelectItem>
                                <SelectItem value="PROJECT">Project</SelectItem>
                                <SelectItem value="LAB">Lab</SelectItem>
                                <SelectItem value="ESSAY">Essay</SelectItem>
                                <SelectItem value="PRESENTATION">Presentation</SelectItem>
                                <SelectItem value="OTHER">Other</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="description">Description</Label>
                        <Input
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            placeholder="Optional description"
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={loading}>{loading ? (isEdit ? 'Updating...' : 'Creating...') : (isEdit ? 'Update' : 'Create')}</Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
