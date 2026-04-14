'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import type { RowSelectionState } from '@tanstack/react-table'
import { ProtectedRoute, PermissionGate } from '@/components/auth'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
    AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { api } from '@/lib/api-client'
import { RotateCcw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { useSession } from '@/context/session-context'

interface DeletedItem {
    id: string
    name?: string
    code?: string
    firstName?: string
    lastName?: string
    deletedAt: string
    [key: string]: any
}

interface DeletedPayment {
    id: string
    amount: number
    method: string
    referenceNo?: string
    paidAt: string
    deletedAt: string
    invoice?: { invoiceNo: string }
    student?: { id: string; rollNumber: string; firstName: string; lastName: string; class?: { name: string }; section?: { name: string } }
}

type TrashTab = 'students' | 'classes' | 'sections' | 'subjects' | 'payments'

export default function TrashPage() {
    const { selectedCampus, selectedYear } = useSession()
    const [activeTab, setActiveTab] = useState<TrashTab>('students')
    const [data, setData] = useState<DeletedItem[]>([])
    const [loading, setLoading] = useState(false)
    const [rowSelection, setRowSelection] = useState<RowSelectionState>({})
    const [bulkProcessing, setBulkProcessing] = useState(false)

    // Payment trash state
    const [paymentData, setPaymentData] = useState<DeletedPayment[]>([])
    const [paymentLoading, setPaymentLoading] = useState(false)

    // AlertDialog state
    const [confirmOpen, setConfirmOpen] = useState(false)
    const [confirmAction, setConfirmAction] = useState<(() => Promise<void>) | null>(null)
    const [confirmTitle, setConfirmTitle] = useState('')
    const [confirmDesc, setConfirmDesc] = useState('')

    const showConfirm = (title: string, desc: string, action: () => Promise<void>, destructive = false) => {
        setConfirmTitle(title)
        setConfirmDesc(desc)
        setConfirmAction(() => action)
        setConfirmOpen(true)
    }

    const tabEntityLabel: Record<TrashTab, string> = {
        students: 'student',
        classes: 'class',
        sections: 'section',
        subjects: 'subject',
        payments: 'payment',
    }

    const resolveRestoreRequest = useCallback(async (tab: TrashTab, id: string) => {
        if (tab === 'payments') {
            return api.patch(`/finance/payments/${id}/restore`)
        }

        let url = ''
        switch (tab) {
            case 'students': url = `/students/${id}/restore`; break
            case 'classes': url = `/academics/classes/${id}/restore`; break
            case 'sections': url = `/academics/sections/${id}/restore`; break
            case 'subjects': url = `/academics/subjects/${id}/restore`; break
            default: break
        }
        return api.patch(url)
    }, [])

    const resolvePermanentDeleteRequest = useCallback(async (tab: TrashTab, id: string) => {
        if (tab === 'payments') {
            return api.delete(`/finance/payments/${id}/permanent`)
        }

        let url = ''
        switch (tab) {
            case 'students': url = `/students/${id}/permanent`; break
            case 'classes': url = `/academics/classes/${id}/permanent`; break
            case 'sections': url = `/academics/sections/${id}/permanent`; break
            case 'subjects': url = `/academics/subjects/${id}/permanent`; break
            default: break
        }
        return api.delete(url)
    }, [])

    const selectedRows = useMemo(() => {
        const selectedIds = new Set(
            Object.entries(rowSelection)
                .filter(([, selected]) => Boolean(selected))
                .map(([id]) => id),
        )

        if (selectedIds.size === 0) return [] as Array<DeletedItem | DeletedPayment>

        if (activeTab === 'payments') {
            return paymentData.filter((item) => selectedIds.has(item.id))
        }
        return data.filter((item) => selectedIds.has(item.id))
    }, [activeTab, data, paymentData, rowSelection])

    const selectedCount = selectedRows.length

    useEffect(() => {
        setRowSelection({})
    }, [activeTab])

    useEffect(() => {
        const validIds = new Set((activeTab === 'payments' ? paymentData : data).map((item) => item.id))

        setRowSelection((prev) => {
            let changed = false
            const next: RowSelectionState = {}

            for (const [id, selected] of Object.entries(prev)) {
                if (!selected || !validIds.has(id)) {
                    changed = true
                    continue
                }
                next[id] = true
            }

            if (!changed && Object.keys(next).length === Object.keys(prev).length) {
                return prev
            }
            return next
        })
    }, [activeTab, data, paymentData])

    const fetchData = useCallback(async () => {
        if (activeTab === 'payments') return // handled separately
        setLoading(true)
        let url = ''
        switch (activeTab) {
            case 'students': url = '/students'; break;
            case 'classes': url = '/academics/classes'; break;
            case 'sections': url = '/academics/sections'; break;
            case 'subjects': url = '/academics/subjects'; break;
        }

        const res = await api.get<any>(url, { params: { deleted: 'true', pageSize: 100 } })
        if (res.success && res.data) {
            if (Array.isArray(res.data)) setData(res.data)
            else if (Array.isArray(res.data.data)) setData(res.data.data)
            else setData([])
        } else {
            setData([])
        }
        setLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeTab, selectedCampus?.id])

    const fetchPaymentTrash = useCallback(async () => {
        setPaymentLoading(true)
        const params: any = { page: 1, pageSize: 100 }
        if (selectedYear) {
            params.startDate = selectedYear.startDate
            params.endDate = selectedYear.endDate
        }
        const res = await api.get<any>('/finance/payments-trash', { params })
        if (res.success && res.data) {
            const list = Array.isArray(res.data) ? res.data : (Array.isArray(res.data.data) ? res.data.data : [])
            setPaymentData(list)
        } else {
            setPaymentData([])
        }
        setPaymentLoading(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedCampus?.id, selectedYear?.id])

    const refreshActiveTabData = useCallback(async () => {
        if (activeTab === 'payments') {
            await fetchPaymentTrash()
            return
        }
        await fetchData()
    }, [activeTab, fetchData, fetchPaymentTrash])

    useEffect(() => {
        if (activeTab === 'payments') {
            fetchPaymentTrash()
        } else {
            fetchData()
        }
    }, [activeTab, fetchData, fetchPaymentTrash])

    const handleRestore = async (id: string) => {
        showConfirm('Restore Item', 'Are you sure you want to restore this item?', async () => {
            const res = await resolveRestoreRequest(activeTab, id)
            if (res.success) {
                toast.success('Restored successfully')
                refreshActiveTabData()
            } else {
                toast.error(res.message || 'Failed to restore')
            }
        })
    }

    const handleDeletePermanent = async (id: string) => {
        showConfirm('Permanent Delete', 'This item will be PERMANENTLY deleted. This action cannot be undone.', async () => {
            const res = await resolvePermanentDeleteRequest(activeTab, id)
            if (res.success) {
                toast.success('Permanently deleted')
                refreshActiveTabData()
            } else {
                toast.error(res.message || 'Failed to delete')
            }
        }, true)
    }

    const handleRestorePayment = async (id: string) => {
        showConfirm('Restore Payment', 'This payment will be restored and the invoice totals will be recalculated.', async () => {
            const res = await resolveRestoreRequest('payments', id)
            if (res.success) {
                toast.success('Payment restored')
                fetchPaymentTrash()
            } else {
                toast.error(res.message || 'Failed to restore payment')
            }
        })
    }

    const handleDeletePaymentPermanent = async (id: string) => {
        showConfirm('Permanent Delete', 'This payment will be PERMANENTLY deleted. This action cannot be undone.', async () => {
            const res = await resolvePermanentDeleteRequest('payments', id)
            if (res.success) {
                toast.success('Payment permanently deleted')
                fetchPaymentTrash()
            } else {
                toast.error(res.message || 'Failed to delete')
            }
        }, true)
    }

    const handleBulkRestore = async () => {
        if (selectedCount === 0) return
        const rowsToRestore = [...selectedRows]
        const entity = tabEntityLabel[activeTab]

        showConfirm(
            `Restore ${rowsToRestore.length} ${entity}${rowsToRestore.length > 1 ? 's' : ''}`,
            `Are you sure you want to restore ${rowsToRestore.length} ${entity}${rowsToRestore.length > 1 ? 's' : ''}?`,
            async () => {
                setBulkProcessing(true)
                try {
                    let successCount = 0

                    for (const row of rowsToRestore) {
                        const res = await resolveRestoreRequest(activeTab, row.id)
                        if (res.success) successCount++
                    }

                    if (successCount > 0) {
                        toast.success(`Restored ${successCount} ${entity}${successCount > 1 ? 's' : ''}`)
                    }
                    if (successCount < rowsToRestore.length) {
                        toast.warning(`${rowsToRestore.length - successCount} ${entity}${rowsToRestore.length - successCount > 1 ? 's' : ''} failed to restore`)
                    }

                    setRowSelection({})
                    await refreshActiveTabData()
                } finally {
                    setBulkProcessing(false)
                }
            },
        )
    }

    const handleBulkDeletePermanent = async () => {
        if (selectedCount === 0) return
        const rowsToDelete = [...selectedRows]
        const entity = tabEntityLabel[activeTab]

        showConfirm(
            `Delete ${rowsToDelete.length} ${entity}${rowsToDelete.length > 1 ? 's' : ''}`,
            `This will permanently delete ${rowsToDelete.length} ${entity}${rowsToDelete.length > 1 ? 's' : ''}. This action cannot be undone.`,
            async () => {
                setBulkProcessing(true)
                try {
                    let successCount = 0

                    for (const row of rowsToDelete) {
                        const res = await resolvePermanentDeleteRequest(activeTab, row.id)
                        if (res.success) successCount++
                    }

                    if (successCount > 0) {
                        toast.success(`Permanently deleted ${successCount} ${entity}${successCount > 1 ? 's' : ''}`)
                    }
                    if (successCount < rowsToDelete.length) {
                        toast.warning(`${rowsToDelete.length - successCount} ${entity}${rowsToDelete.length - successCount > 1 ? 's' : ''} failed to delete`)
                    }

                    setRowSelection({})
                    await refreshActiveTabData()
                } finally {
                    setBulkProcessing(false)
                }
            },
            true,
        )
    }

    const itemSelectionColumn: ColumnDef<DeletedItem, unknown> = {
        id: 'select',
        header: ({ table }) => (
            <Checkbox
                checked={table.getIsAllPageRowsSelected()}
                onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                aria-label="Select all"
            />
        ),
        cell: ({ row }) => (
            <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(value) => row.toggleSelected(!!value)}
                onClick={(e) => e.stopPropagation()}
                aria-label="Select row"
            />
        ),
        enableSorting: false,
        enableHiding: false,
    }

    const paymentSelectionColumn: ColumnDef<DeletedPayment, unknown> = {
        id: 'select',
        header: ({ table }) => (
            <Checkbox
                checked={table.getIsAllPageRowsSelected()}
                onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
                aria-label="Select all"
            />
        ),
        cell: ({ row }) => (
            <Checkbox
                checked={row.getIsSelected()}
                onCheckedChange={(value) => row.toggleSelected(!!value)}
                onClick={(e) => e.stopPropagation()}
                aria-label="Select row"
            />
        ),
        enableSorting: false,
        enableHiding: false,
    }

    const bulkToolbar = selectedCount > 0 ? (
        <div className="flex items-center gap-2 rounded-lg bg-muted p-2">
            <span className="text-sm font-medium ml-2">{selectedCount} selected</span>
            <div className="ml-auto flex gap-2">
                <Button size="sm" variant="outline" onClick={handleBulkRestore} disabled={bulkProcessing}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    {bulkProcessing ? 'Processing...' : 'Restore Selected'}
                </Button>
                <Button size="sm" variant="destructive" onClick={handleBulkDeletePermanent} disabled={bulkProcessing}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    {bulkProcessing ? 'Processing...' : 'Delete Selected'}
                </Button>
            </div>
        </div>
    ) : undefined

    // Column Definitions
    const studentColumns: ColumnDef<DeletedItem, unknown>[] = [
        itemSelectionColumn,
        { accessorKey: 'firstName', header: 'Name', cell: ({ row }) => `${row.original.firstName} ${row.original.lastName}` },
        { accessorKey: 'rollNumber', header: 'Roll No', cell: ({ row }) => row.original.rollNumber || 'N/A' },
        { accessorKey: 'class', header: 'Class', cell: ({ row }) => row.original.class?.name || 'N/A' },
        { accessorKey: 'deletedAt', header: 'Deleted At', cell: ({ row }) => row.original.deletedAt ? new Date(row.original.deletedAt).toLocaleString() : '-' },
        {
            id: 'actions', header: 'Actions', cell: ({ row }) => (
                <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleRestore(row.original.id)}><RotateCcw className="mr-2 h-4 w-4" /> Restore</Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDeletePermanent(row.original.id)}><Trash2 className="mr-2 h-4 w-4" /> Delete</Button>
                </div>
            )
        }
    ]

    const classColumns: ColumnDef<DeletedItem, unknown>[] = [
        itemSelectionColumn,
        { accessorKey: 'name', header: 'Name' },
        { accessorKey: 'code', header: 'Code' },
        { accessorKey: 'deletedAt', header: 'Deleted At', cell: ({ row }) => row.original.deletedAt ? new Date(row.original.deletedAt).toLocaleString() : '-' },
        {
            id: 'actions', header: 'Actions', cell: ({ row }) => (
                <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleRestore(row.original.id)}><RotateCcw className="mr-2 h-4 w-4" /> Restore</Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDeletePermanent(row.original.id)}><Trash2 className="mr-2 h-4 w-4" /> Delete</Button>
                </div>
            )
        }
    ]

    const sectionColumns: ColumnDef<DeletedItem, unknown>[] = [
        itemSelectionColumn,
        { accessorKey: 'name', header: 'Name' },
        { accessorKey: 'class', header: 'Class', cell: ({ row }) => row.original.class?.name || 'N/A' },
        { accessorKey: 'deletedAt', header: 'Deleted At', cell: ({ row }) => row.original.deletedAt ? new Date(row.original.deletedAt).toLocaleString() : '-' },
        {
            id: 'actions', header: 'Actions', cell: ({ row }) => (
                <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleRestore(row.original.id)}><RotateCcw className="mr-2 h-4 w-4" /> Restore</Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDeletePermanent(row.original.id)}><Trash2 className="mr-2 h-4 w-4" /> Delete</Button>
                </div>
            )
        }
    ]

    const subjectColumns: ColumnDef<DeletedItem, unknown>[] = [
        itemSelectionColumn,
        { accessorKey: 'name', header: 'Name' },
        { accessorKey: 'code', header: 'Code' },
        { accessorKey: 'deletedAt', header: 'Deleted At', cell: ({ row }) => row.original.deletedAt ? new Date(row.original.deletedAt).toLocaleString() : '-' },
        {
            id: 'actions', header: 'Actions', cell: ({ row }) => (
                <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleRestore(row.original.id)}><RotateCcw className="mr-2 h-4 w-4" /> Restore</Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDeletePermanent(row.original.id)}><Trash2 className="mr-2 h-4 w-4" /> Delete</Button>
                </div>
            )
        }
    ]

    const paymentColumns: ColumnDef<DeletedPayment, unknown>[] = [
        paymentSelectionColumn,
        { accessorKey: 'invoice', header: 'Invoice #', cell: ({ row }) => row.original.invoice?.invoiceNo || '—' },
        {
            id: 'student', header: 'Student', cell: ({ row }) => {
                const s = row.original.student
                if (!s) return '—'
                return (
                    <div>
                        <p className="font-medium text-sm">{s.firstName} {s.lastName}</p>
                        <p className="text-xs text-muted-foreground">
                            {s.rollNumber}{s.class ? ` · ${s.class.name}` : ''}{s.section ? ` (${s.section.name})` : ''}
                        </p>
                    </div>
                )
            }
        },
        { accessorKey: 'amount', header: 'Amount', cell: ({ row }) => `Rs. ${row.original.amount.toLocaleString()}` },
        { accessorKey: 'method', header: 'Method', cell: ({ row }) => <Badge variant="outline">{(row.original.method || '').replace(/_/g, ' ')}</Badge> },
        { accessorKey: 'paidAt', header: 'Paid On', cell: ({ row }) => new Date(row.original.paidAt).toLocaleDateString() },
        { accessorKey: 'deletedAt', header: 'Deleted At', cell: ({ row }) => row.original.deletedAt ? new Date(row.original.deletedAt).toLocaleString() : '—' },
        {
            id: 'actions', header: 'Actions', cell: ({ row }) => (
                <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleRestorePayment(row.original.id)}><RotateCcw className="mr-2 h-4 w-4" /> Restore</Button>
                    <Button size="sm" variant="destructive" onClick={() => handleDeletePaymentPermanent(row.original.id)}><Trash2 className="mr-2 h-4 w-4" /> Delete</Button>
                </div>
            )
        }
    ]

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Trash</h1>
                    <p className="mt-1 text-sm text-muted-foreground">Manage deleted items. Items here are soft-deleted and can be restored.</p>
                </div>
            </div>

            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TrashTab)} className="space-y-4">
                <TabsList>
                    <TabsTrigger value="students">Students</TabsTrigger>
                    <TabsTrigger value="classes">Classes</TabsTrigger>
                    <TabsTrigger value="sections">Sections</TabsTrigger>
                    <TabsTrigger value="subjects">Subjects</TabsTrigger>
                    <TabsTrigger value="payments">Payments</TabsTrigger>
                </TabsList>

                <TabsContent value="students" className="space-y-4">
                    <DataTable columns={studentColumns} data={data} isLoading={loading} emptyMessage="No deleted students in trash." enableRowSelection={true} rowSelection={rowSelection} onRowSelectionChange={setRowSelection} getRowId={(row: DeletedItem) => row.id} toolbar={bulkToolbar} />
                </TabsContent>
                <TabsContent value="classes" className="space-y-4">
                    <DataTable columns={classColumns} data={data} isLoading={loading} emptyMessage="No deleted classes in trash." enableRowSelection={true} rowSelection={rowSelection} onRowSelectionChange={setRowSelection} getRowId={(row: DeletedItem) => row.id} toolbar={bulkToolbar} />
                </TabsContent>
                <TabsContent value="sections" className="space-y-4">
                    <DataTable columns={sectionColumns} data={data} isLoading={loading} emptyMessage="No deleted sections in trash." enableRowSelection={true} rowSelection={rowSelection} onRowSelectionChange={setRowSelection} getRowId={(row: DeletedItem) => row.id} toolbar={bulkToolbar} />
                </TabsContent>
                <TabsContent value="subjects" className="space-y-4">
                    <DataTable columns={subjectColumns} data={data} isLoading={loading} emptyMessage="No deleted subjects in trash." enableRowSelection={true} rowSelection={rowSelection} onRowSelectionChange={setRowSelection} getRowId={(row: DeletedItem) => row.id} toolbar={bulkToolbar} />
                </TabsContent>
                <TabsContent value="payments" className="space-y-4">
                    <DataTable columns={paymentColumns} data={paymentData} isLoading={paymentLoading} emptyMessage="No deleted payments in trash." enableRowSelection={true} rowSelection={rowSelection} onRowSelectionChange={setRowSelection} getRowId={(row: DeletedPayment) => row.id} toolbar={bulkToolbar} />
                </TabsContent>
            </Tabs>

            {/* Confirmation AlertDialog */}
            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{confirmTitle}</AlertDialogTitle>
                        <AlertDialogDescription>{confirmDesc}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={async () => {
                                if (confirmAction) await confirmAction()
                                setConfirmOpen(false)
                            }}
                        >
                            Continue
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
