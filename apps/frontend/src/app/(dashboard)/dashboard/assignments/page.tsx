'use client'

import { useEffect, useState, useCallback } from 'react'
import { ProtectedRoute, PermissionGate } from '@/components/auth'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { assignmentsService } from '@/services/assignments.service'
import { AddAssignmentDialog } from '@/components/forms/add-assignment-dialog'
import { BookOpen, Search, Clock, CheckCircle, MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
import { useSession } from '@/context/session-context'
import { cn } from '@/lib/utils'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { toast } from 'sonner'
import { useConfirmDialog } from '@/hooks/useConfirmDialog'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

interface Assignment {
    id: string
    title: string
    description?: string
    dueDate: string
    totalMarks?: number
    type?: string
    isActive: boolean
    class?: { name: string }
    subject?: { name: string }
    teacher?: { firstName: string; lastName: string }
    _count?: { submissions: number }
    createdAt: string
}

export default function AssignmentsPage() {
    const { selectedCampus } = useSession()
    const [assignments, setAssignments] = useState<Assignment[]>([])
    const [loading, setLoading] = useState(false)
    const [search, setSearch] = useState('')

    const fetchAssignments = useCallback(async () => {
        setLoading(true)
        const res = await assignmentsService.getAll()
        if (res.success && res.data) {
            const list = res.data.data || (Array.isArray(res.data) ? res.data : [])
            setAssignments(list)
        }
        setLoading(false)
    }, [selectedCampus])

    useEffect(() => { fetchAssignments() }, [fetchAssignments])

    const confirmDialog = useConfirmDialog()

    const handleDelete = async (id: string) => {
        confirmDialog.showConfirm('Delete Assignment', 'Are you sure you want to delete this assignment?', async () => {
            const res = await assignmentsService.delete(id)
            if (res.success) { toast.success('Assignment deleted'); fetchAssignments() }
            else toast.error(res.message || 'Failed')
        }, true)
    }

    const filtered = assignments.filter(a =>
        a.title.toLowerCase().includes(search.toLowerCase()) ||
        a.class?.name?.toLowerCase()?.includes(search.toLowerCase()) ||
        a.subject?.name?.toLowerCase()?.includes(search.toLowerCase())
    )

    const columns: ColumnDef<Assignment, unknown>[] = [
        {
            accessorKey: 'title', header: 'Title', cell: ({ row }) => (
                <div>
                    <p className="font-medium">{row.original.title}</p>
                    {row.original.description && <p className="text-xs text-muted-foreground truncate max-w-[200px]">{row.original.description}</p>}
                </div>
            )
        },
        { accessorKey: 'class', header: 'Class', cell: ({ row }) => row.original.class?.name || '—' },
        { accessorKey: 'subject', header: 'Subject', cell: ({ row }) => row.original.subject?.name || '—' },
        {
            accessorKey: 'dueDate', header: 'Due Date', cell: ({ row }) => {
                const due = new Date(row.original.dueDate)
                const isOverdue = due < new Date()
                return <span className={isOverdue ? 'text-red-500' : ''}>{due.toLocaleDateString()}</span>
            }
        },
        { accessorKey: 'totalMarks', header: 'Marks', cell: ({ row }) => row.original.totalMarks || '—' },
        {
            accessorKey: '_count', header: 'Submissions', cell: ({ row }) => (
                <Badge variant="secondary">{row.original._count?.submissions ?? 0}</Badge>
            )
        },
        {
            accessorKey: 'status', header: 'Status', cell: ({ row }) => (
                <Badge variant={row.original.isActive ? 'default' : 'outline'}>
                    {row.original.isActive ? 'Active' : 'Closed'}
                </Badge>
            )
        },
        {
            id: 'actions', header: '', cell: ({ row }) => (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <PermissionGate permission="assignments:update">
                            <AddAssignmentDialog
                                onSuccess={fetchAssignments}
                                assignment={row.original}
                                trigger={
                                    <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                        <Pencil className="mr-2 h-4 w-4" /> Edit
                                    </DropdownMenuItem>
                                }
                            />
                        </PermissionGate>
                        <PermissionGate permission="assignments:delete">
                            <DropdownMenuItem className="text-red-500" onClick={() => handleDelete(row.original.id)}>
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                        </PermissionGate>
                    </DropdownMenuContent>
                </DropdownMenu>
            )
        },
    ]

    return (
        <ProtectedRoute permission="assignments:read">
            <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                            <BookOpen className="h-6 w-6" /> Assignments
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">Create and manage class assignments</p>
                    </div>
                    <PermissionGate permission="assignments:create">
                        <AddAssignmentDialog onSuccess={fetchAssignments} trigger={
                            <Button className="w-full sm:w-auto">
                                <BookOpen className="mr-2 h-4 w-4" /> Create Assignment
                            </Button>
                        } />
                    </PermissionGate>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search assignments..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1"><CheckCircle className="h-4 w-4 text-green-500" /> {assignments.filter(a => a.isActive).length} Active</span>
                        <span className="flex items-center gap-1"><Clock className="h-4 w-4 text-orange-500" /> {assignments.filter(a => new Date(a.dueDate) < new Date()).length} Overdue</span>
                    </div>
                </div>

                <div className="hidden sm:block">
                    <DataTable columns={columns} data={filtered} isLoading={loading} emptyMessage="No assignments found." />
                </div>

                <div className="sm:hidden space-y-4 pb-24">
                    {loading ? (
                        <div className="space-y-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="p-5 rounded-2xl border border-border shadow-sm space-y-4">
                                    <div className="flex gap-2"><Skeleton className="h-4 w-16" /><Skeleton className="h-4 w-16" /></div>
                                    <Skeleton className="h-6 w-3/4" />
                                    <Skeleton className="h-4 w-full" />
                                    <div className="grid grid-cols-2 gap-3 pt-2">
                                        <Skeleton className="h-12 w-full rounded-xl" />
                                        <Skeleton className="h-12 w-full rounded-xl" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="text-center p-12 bg-muted/30 rounded-2xl border border-dashed border-border text-muted-foreground text-sm italic">No assignments found.</div>
                    ) : (
                        filtered.map(assignment => (
                            <div key={assignment.id} className="group bg-card hover:bg-muted/10 transition-colors p-5 rounded-2xl border border-border shadow-sm flex flex-col gap-5 relative overflow-hidden">
                                {/* Status Indicator Sidebar */}
                                <div className={cn(
                                    "absolute left-0 top-0 bottom-0 w-1",
                                    assignment.isActive ? "bg-primary" : "bg-muted"
                                )} />
                                
                                <div className="flex items-start justify-between gap-3">
                                    <div className="space-y-1.5 flex-1 min-w-0">
                                        <div className="flex flex-wrap gap-2 mb-1">
                                            {assignment.class && (
                                                <Badge variant="secondary" className="bg-primary/5 text-primary border-primary/10 text-[10px] uppercase tracking-wider font-bold h-5">
                                                    {assignment.class.name}
                                                </Badge>
                                            )}
                                            {assignment.subject && (
                                                <Badge variant="outline" className="text-[10px] uppercase tracking-wider h-5">
                                                    {assignment.subject.name}
                                                </Badge>
                                            )}
                                        </div>
                                        <h3 className="font-bold text-foreground text-lg leading-tight truncate-2-lines">{assignment.title}</h3>
                                        {assignment.description && (
                                            <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{assignment.description}</p>
                                        )}
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0 -mr-1 -mt-1 hover:bg-primary/5 rounded-full">
                                                <MoreHorizontal className="h-5 w-5" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-48">
                                            <PermissionGate permission="assignments:update">
                                                <AddAssignmentDialog
                                                    onSuccess={fetchAssignments}
                                                    assignment={assignment}
                                                    trigger={
                                                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                                                            <Pencil className="mr-2 h-4 w-4" /> Edit Details
                                                        </DropdownMenuItem>
                                                    }
                                                />
                                            </PermissionGate>
                                            <PermissionGate permission="assignments:delete">
                                                <DropdownMenuItem className="text-destructive focus:text-destructive focus:bg-destructive/5" onClick={() => handleDelete(assignment.id)}>
                                                    <Trash2 className="mr-2 h-4 w-4" /> Delete Assignment
                                                </DropdownMenuItem>
                                            </PermissionGate>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="flex flex-col bg-muted/50 p-3 rounded-xl border border-border/40">
                                        <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                                            <Clock className="h-3.5 w-3.5" />
                                            <span className="text-[10px] font-bold uppercase tracking-tight">Due Date</span>
                                        </div>
                                        <span className={cn(
                                            "font-semibold text-sm",
                                            new Date(assignment.dueDate) < new Date() ? 'text-red-500' : 'text-foreground'
                                        )}>
                                            {new Date(assignment.dueDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                                        </span>
                                    </div>
                                    <div className="flex flex-col bg-muted/50 p-3 rounded-xl border border-border/40">
                                        <div className="flex items-center gap-1.5 text-muted-foreground mb-1">
                                            <BookOpen className="h-3.5 w-3.5" />
                                            <span className="text-[10px] font-bold uppercase tracking-tight">Total Marks</span>
                                        </div>
                                        <span className="font-semibold text-foreground text-sm">{assignment.totalMarks || '—'}</span>
                                    </div>
                                </div>
                                
                                <div className="flex items-center justify-between pt-4 border-t border-border/60">
                                    <div className="flex items-center gap-3">
                                        <div className="flex -space-x-2">
                                            {[...Array(Math.min(3, assignment._count?.submissions || 0))].map((_, i) => (
                                                <div key={i} className="h-6 w-6 rounded-full border-2 border-card bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                                                    {i + 1}
                                                </div>
                                            ))}
                                            {(assignment._count?.submissions || 0) > 3 && (
                                                <div className="h-6 w-6 rounded-full border-2 border-card bg-primary/10 flex items-center justify-center text-[8px] font-bold text-primary">
                                                    +{(assignment._count?.submissions || 0) - 3}
                                                </div>
                                            )}
                                        </div>
                                        <span className="text-[11px] font-medium text-muted-foreground">
                                            {assignment._count?.submissions || 0} Submissions
                                        </span>
                                    </div>
                                    <Badge variant={assignment.isActive ? 'default' : 'secondary'} className="h-6 px-2 text-[10px] font-bold tracking-wide uppercase">
                                        {assignment.isActive ? 'Active' : 'Closed'}
                                    </Badge>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <ConfirmDialog
                    open={confirmDialog.open}
                    onOpenChange={confirmDialog.handleClose}
                    title={confirmDialog.title}
                    description={confirmDialog.description}
                    variant={confirmDialog.variant}
                    loading={confirmDialog.loading}
                    onConfirm={confirmDialog.handleConfirm}
                    confirmLabel="Delete"
                />
            </div>
        </ProtectedRoute>
    )
}
