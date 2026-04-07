'use client'

import { useEffect, useState, useCallback } from 'react'
import { ProtectedRoute } from '@/components/auth'
import { DataTable, type ColumnDef } from '@/components/ui/data-table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Card, CardBody } from '@/components/ui/card'
import { libraryService } from '@/services/library.service'
import { AddBookDialog } from '@/components/forms/add-book-dialog'
import { BookOpenCheck, Search, BookCopy } from 'lucide-react'
import { toast } from 'sonner'
import { useSession } from '@/context/session-context'
import { useConfirmDialog } from '@/hooks/useConfirmDialog'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

interface Book {
    id: string
    title: string
    author?: string
    isbn?: string
    category?: string
    totalCopies?: number
    availableCopies?: number
    _count?: { bookIssues: number }
}

export default function LibraryPage() {
    const { selectedCampus } = useSession()
    const [books, setBooks] = useState<Book[]>([])
    const [loading, setLoading] = useState(false)
    const [search, setSearch] = useState('')

    const fetchBooks = useCallback(async () => {
        setLoading(true)
        const res = await libraryService.getBooks({ search: search || undefined })
        if (res.success && res.data) {
            const list = res.data.data || (Array.isArray(res.data) ? res.data : [])
            setBooks(list)
        }
        setLoading(false)
    }, [search, selectedCampus])

    useEffect(() => { fetchBooks() }, [fetchBooks])

    const confirmDialog = useConfirmDialog()

    const handleDelete = async (id: string) => {
        confirmDialog.showConfirm('Delete Book', 'Are you sure you want to delete this book?', async () => {
            const res = await libraryService.deleteBook(id)
            if (res.success) { toast.success('Book deleted'); fetchBooks() }
            else toast.error(res.message || 'Failed')
        }, true)
    }

    const columns: ColumnDef<Book, unknown>[] = [
        {
            accessorKey: 'title', header: 'Title', cell: ({ row }) => (
                <div>
                    <p className="font-medium">{row.original.title}</p>
                    {row.original.author && <p className="text-xs text-muted-foreground">{row.original.author}</p>}
                </div>
            )
        },
        { accessorKey: 'isbn', header: 'ISBN', cell: ({ row }) => row.original.isbn || '—' },
        {
            accessorKey: 'category', header: 'Category', cell: ({ row }) => (
                row.original.category ? <Badge variant="secondary">{row.original.category}</Badge> : '—'
            )
        },
        { accessorKey: 'totalCopies', header: 'Total', cell: ({ row }) => row.original.totalCopies ?? 1 },
        {
            accessorKey: 'availableCopies', header: 'Available', cell: ({ row }) => {
                const avail = row.original.availableCopies ?? 0
                return <Badge variant={avail > 0 ? 'default' : 'destructive'}>{avail}</Badge>
            }
        },
        { accessorKey: '_count', header: 'Issues', cell: ({ row }) => row.original._count?.bookIssues ?? 0 },
        {
            id: 'actions', header: '', cell: ({ row }) => (
                <Button variant="ghost" size="sm" onClick={() => handleDelete(row.original.id)}>Delete</Button>
            )
        },
    ]

    const totalBooks = books.length
    const availableBooks = books.filter(b => (b.availableCopies ?? 0) > 0).length

    return (
        <ProtectedRoute permission="library:read">
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                            <BookOpenCheck className="h-6 w-6" /> Library
                        </h1>
                        <p className="mt-1 text-sm text-muted-foreground">Manage books and track issues</p>
                    </div>
                    <AddBookDialog onSuccess={fetchBooks} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card><CardBody className="flex items-center gap-3 py-4">
                        <BookCopy className="h-8 w-8 text-primary" />
                        <div><p className="text-2xl font-bold">{totalBooks}</p><p className="text-xs text-muted-foreground">Total Books</p></div>
                    </CardBody></Card>
                    <Card><CardBody className="flex items-center gap-3 py-4">
                        <BookOpenCheck className="h-8 w-8 text-green-500" />
                        <div><p className="text-2xl font-bold">{availableBooks}</p><p className="text-xs text-muted-foreground">Available</p></div>
                    </CardBody></Card>
                    <Card><CardBody className="flex items-center gap-3 py-4">
                        <BookCopy className="h-8 w-8 text-orange-500" />
                        <div><p className="text-2xl font-bold">{totalBooks - availableBooks}</p><p className="text-xs text-muted-foreground">Issued Out</p></div>
                    </CardBody></Card>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search by title, author, ISBN..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                </div>

                <DataTable columns={columns} data={books} isLoading={loading} emptyMessage="No books found." />

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
