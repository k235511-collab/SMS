'use client'

import { useState } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { libraryService } from '@/services/library.service'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'

interface AddBookDialogProps {
    onSuccess: () => void
}

export function AddBookDialog({ onSuccess }: AddBookDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)

    const [formData, setFormData] = useState({
        title: '', author: '', isbn: '', category: '', totalCopies: 1
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.title) { toast.error('Title is required'); return }

        setLoading(true)
        try {
            const res = await libraryService.createBook({ ...formData })
            if (res.success) {
                toast.success('Book created successfully')
                setOpen(false)
                setFormData({ title: '', author: '', isbn: '', category: '', totalCopies: 1 })
                onSuccess()
            } else {
                toast.error(res.message || 'Failed to create book')
            }
        } catch (error) { toast.error('An error occurred') }
        finally { setLoading(false) }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button><Plus className="mr-2 h-4 w-4" /> Add Book</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader><DialogTitle>Add New Book</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="title">Title *</Label>
                        <Input id="title" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="author">Author</Label>
                        <Input id="author" value={formData.author} onChange={e => setFormData({ ...formData, author: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label htmlFor="isbn">ISBN</Label>
                            <Input id="isbn" value={formData.isbn} onChange={e => setFormData({ ...formData, isbn: e.target.value })} />
                        </div>
                        <div className="grid gap-2">
                            <Label htmlFor="category">Category</Label>
                            <Input id="category" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} placeholder="e.g. Fiction" />
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="copies">Total Copies</Label>
                        <Input id="copies" type="number" min={1} value={formData.totalCopies} onChange={e => setFormData({ ...formData, totalCopies: parseInt(e.target.value) || 1 })} />
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={loading}>{loading ? 'Adding...' : 'Add Book'}</Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
