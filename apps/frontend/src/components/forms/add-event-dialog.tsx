'use client'

import { useState, useEffect } from 'react'
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { calendarService } from '@/services/calendar.service'
import { toast } from 'sonner'
import { Plus, CalendarPlus, Info, Tag } from 'lucide-react'

interface AddEventDialogProps { onSuccess: () => void }

const eventTypes = [
    { value: 'GENERAL', label: 'General Event', color: 'bg-blue-500' },
    { value: 'HOLIDAY', label: 'Holiday', color: 'bg-green-500' },
    { value: 'EXAM', label: 'Examination', color: 'bg-red-500' },
    { value: 'MEETING', label: 'Meeting', color: 'bg-purple-500' },
    { value: 'ACTIVITY', label: 'School Activity', color: 'bg-orange-500' },
    { value: 'DEADLINE', label: 'Deadline', color: 'bg-pink-500' },
]

export function AddEventDialog({ onSuccess }: AddEventDialogProps) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [formData, setFormData] = useState({
        title: '', description: '', startDate: '', endDate: '', type: 'GENERAL', allDay: false
    })

    // Set default dates to today on mount
    useEffect(() => {
        const today = new Date().toISOString().slice(0, 10)
        setFormData(prev => ({ ...prev, startDate: today, endDate: today }))
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!formData.title || !formData.startDate) {
            toast.error('Title and Start Date are required')
            return
        }

        setLoading(true)
        try {
            const res = await calendarService.createEvent({
                ...formData,
                startDate: new Date(formData.startDate).toISOString(), 
                endDate: formData.endDate ? new Date(formData.endDate).toISOString() : undefined
            })
            if (res.success) {
                toast.success('Event scheduled successfully')
                setOpen(false)
                setFormData({
                    title: '', description: '', 
                    startDate: new Date().toISOString().slice(0, 10), 
                    endDate: new Date().toISOString().slice(0, 10), 
                    type: 'GENERAL', allDay: false
                })
                onSuccess()
            } else {
                toast.error(res.message || 'Failed to create event')
            }
        } catch (error) {
            toast.error('An unexpected error occurred')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button className="shadow-lg shadow-primary/20 gap-2 px-6">
                    <Plus className="h-4 w-4" /> Schedule Event
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[480px] rounded-lg border-none shadow-2xl p-0 overflow-hidden">
                <div className="bg-primary/5 p-6 border-b border-primary/10">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold flex items-center gap-3">
                            <CalendarPlus className="h-6 w-6 text-primary" /> Create Event
                        </DialogTitle>
                    </DialogHeader>
                </div>
                
                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold flex items-center gap-2">
                                <Info className="h-4 w-4 text-muted-foreground" /> Title
                            </Label>
                            <Input 
                                placeholder="e.g., Final Exams, Annual Sports Day" 
                                className="rounded-md border-muted-foreground/20 focus:ring-primary"
                                value={formData.title} 
                                onChange={e => setFormData({ ...formData, title: e.target.value })} 
                                required 
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold">Start Date</Label>
                                <Input 
                                    type="date" 
                                    className="rounded-md border-muted-foreground/20"
                                    value={formData.startDate} 
                                    onChange={e => setFormData({ ...formData, startDate: e.target.value })} 
                                    required 
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-sm font-semibold">End Date (Optional)</Label>
                                <Input 
                                    type="date" 
                                    className="rounded-md border-muted-foreground/20"
                                    value={formData.endDate} 
                                    onChange={e => setFormData({ ...formData, endDate: e.target.value })} 
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-semibold flex items-center gap-2">
                                <Tag className="h-4 w-4 text-muted-foreground" /> Category
                            </Label>
                            <Select value={formData.type} onValueChange={v => setFormData({ ...formData, type: v })}>
                                <SelectTrigger className="rounded-md border-muted-foreground/20">
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent className="rounded-lg border-none shadow-xl">
                                    {eventTypes.map(t => (
                                        <SelectItem key={t.value} value={t.value} className="rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-2 h-2 rounded-full ${t.color}`} />
                                                {t.label}
                                            </div>
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-sm font-semibold">Description</Label>
                            <Textarea 
                                placeholder="Add more details about this event..." 
                                className="rounded-md border-muted-foreground/20 min-h-[100px] resize-none"
                                value={formData.description} 
                                onChange={e => setFormData({ ...formData, description: e.target.value })} 
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <Button type="button" variant="ghost" className="px-6" onClick={() => setOpen(false)}>
                            Cancel
                        </Button>
                        <Button 
                            type="submit" 
                            disabled={loading}
                            className="px-8 shadow-lg shadow-primary/20"
                        >
                            {loading ? 'Scheduling...' : 'Create Event'}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    )
}
