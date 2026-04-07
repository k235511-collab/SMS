'use client'

import { useEffect, useState, useCallback } from 'react'
import { ProtectedRoute, PermissionGate } from '@/components/auth'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
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

export default function TrashPage() {
    const { selectedCampus, selectedYear } = useSession()
    const [activeTab, setActiveTab] = useState('students')
    const [data, setData] = useState<DeletedItem[]>([])
    const [loading, setLoading] = useState(false)

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

    useEffect(() => {
        if (activeTab === 'payments') {
            fetchPaymentTrash()
        } else {
            fetchData()
        }
    }, [activeTab, fetchData, fetchPaymentTrash])

    const handleRestore = async (id: string) => {
        showConfirm('Restore Item', 'Are you sure you want to restore this item?', async () => {
            let url = ''
            switch (activeTab) {
                case 'students': url = `/students/${id}/restore`; break;
                case 'classes': url = `/academics/classes/${id}/restore`; break;
                case 'sections': url = `/academics/sections/${id}/restore`; break;
                case 'subjects': url = `/academics/subjects/${id}/restore`; break;
            }

            const res = await api.patch(url)
            if (res.success) {
                toast.success('Restored successfully')
                fetchData()
            } else {
                toast.error(res.message || 'Failed to restore')
            }
        })
    }

    const handleDeletePermanent = async (id: string) => {
        showConfirm('Permanent Delete', 'This item will be PERMANENTLY deleted. This action cannot be undone.', async () => {
            let url = ''
            switch (activeTab) {
                case 'students': url = `/students/${id}/permanent`; break;
                case 'classes': url = `/academics/classes/${id}/permanent`; break;
                case 'sections': url = `/academics/sections/${id}/permanent`; break;
                case 'subjects': url = `/academics/subjects/${id}/permanent`; break;
            }

            const res = await api.delete(url)
            if (res.success) {
                toast.success('Permanently deleted')
                fetchData()
            } else {
                toast.error(res.message || 'Failed to delete')
            }
        }, true)
    }

    const handleRestorePayment = async (id: string) => {
        showConfirm('Restore Payment', 'This payment will be restored and the invoice totals will be recalculated.', async () => {
            const res = await api.patch(`/finance/payments/${id}/restore`)
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
            const res = await api.delete(`/finance/payments/${id}/permanent`)
            if (res.success) {
                toast.success('Payment permanently deleted')
                fetchPaymentTrash()
            } else {
                toast.error(res.message || 'Failed to delete')
            }
        }, true)
    }

    // Column Definitions
    const studentColumns: ColumnDef<DeletedItem, unknown>[] = [
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

            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList>
                    <TabsTrigger value="students">Students</TabsTrigger>
                    <TabsTrigger value="classes">Classes</TabsTrigger>
                    <TabsTrigger value="sections">Sections</TabsTrigger>
                    <TabsTrigger value="subjects">Subjects</TabsTrigger>
                    <TabsTrigger value="payments">Payments</TabsTrigger>
                </TabsList>

                <TabsContent value="students" className="space-y-4">
                    <DataTable columns={studentColumns} data={data} isLoading={loading} emptyMessage="No deleted students in trash." />
                </TabsContent>
                <TabsContent value="classes" className="space-y-4">
                    <DataTable columns={classColumns} data={data} isLoading={loading} emptyMessage="No deleted classes in trash." />
                </TabsContent>
                <TabsContent value="sections" className="space-y-4">
                    <DataTable columns={sectionColumns} data={data} isLoading={loading} emptyMessage="No deleted sections in trash." />
                </TabsContent>
                <TabsContent value="subjects" className="space-y-4">
                    <DataTable columns={subjectColumns} data={data} isLoading={loading} emptyMessage="No deleted subjects in trash." />
                </TabsContent>
                <TabsContent value="payments" className="space-y-4">
                    <DataTable columns={paymentColumns} data={paymentData} isLoading={paymentLoading} emptyMessage="No deleted payments in trash." />
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
