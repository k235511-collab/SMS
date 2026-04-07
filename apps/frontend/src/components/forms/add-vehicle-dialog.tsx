'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { transportService } from '@/services/transport.service'
import { toast } from 'sonner'
import { Plus } from 'lucide-react'

interface AddVehicleDialogProps { onSuccess: () => void }

export function AddVehicleDialog({ onSuccess }: AddVehicleDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({ registrationNo: '', type: 'BUS', capacity: 40, driverName: '', driverPhone: '' })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.registrationNo) { toast.error('Registration No is required'); return }

        setLoading(true)
        try {
            const res = await transportService.createVehicle(formData)
            if (res.success) {
                toast.success('Vehicle added'); setOpen(false)
                setFormData({ registrationNo: '', type: 'BUS', capacity: 40, driverName: '', driverPhone: '' })
                onSuccess()
            } else toast.error(res.message || 'Failed')
        } catch { toast.error('Error occurred') }
        finally { setLoading(false) }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-2 h-4 w-4" /> Add Vehicle</Button></DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader><DialogTitle>Add New Vehicle</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="grid gap-2">
                        <Label>Registration No *</Label>
                        <Input value={formData.registrationNo} onChange={e => setFormData({ ...formData, registrationNo: e.target.value })} required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label>Type</Label>
                            <Select value={formData.type} onValueChange={v => setFormData({ ...formData, type: v })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {['BUS', 'VAN', 'MINIBUS'].map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="grid gap-2">
                            <Label>Capacity</Label>
                            <Input type="number" value={formData.capacity} onChange={e => setFormData({ ...formData, capacity: parseInt(e.target.value) || 0 })} />
                        </div>
                    </div>
                    <div className="grid gap-2">
                        <Label>Driver Name</Label>
                        <Input value={formData.driverName} onChange={e => setFormData({ ...formData, driverName: e.target.value })} />
                    </div>
                    <div className="grid gap-2">
                        <Label>Driver Phone</Label>
                        <Input value={formData.driverPhone} onChange={e => setFormData({ ...formData, driverPhone: e.target.value })} />
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                        <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
                        <Button type="submit" disabled={loading}>{loading ? 'Adding...' : 'Add Vehicle'}</Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
