'use client'

import { Loader2 } from 'lucide-react'

interface Student {
    id: string
    rollNumber: string
    firstName: string
    lastName: string
}

interface AttendanceRecord {
    date: string
    status: string
    remarks?: string
}

interface WeeklyReport {
    student: Student
    records: AttendanceRecord[]
    summary: {
        present: number
        absent: number
        late: number
        excused: number
        halfDay: number
        total: number
    }
}

interface WeeklyAttendanceProps {
    data: WeeklyReport[]
    startDate: Date
    loading: boolean
}

const statusShort: Record<string, string> = {
    PRESENT: 'P',
    ABSENT: 'A',
    LATE: 'L',
    EXCUSED: 'E',
    HALF_DAY: 'H',
}

export function WeeklyAttendance({ data, startDate, loading }: WeeklyAttendanceProps) {
    const days: Date[] = []
    for (let i = 0; i < 6; i++) { // Mon to Sat
        const d = new Date(startDate)
        d.setDate(startDate.getDate() + i)
        days.push(d)
    }

    const getStatus = (records: AttendanceRecord[], date: Date) => {
        const record = records.find(r => new Date(r.date).toDateString() === date.toDateString())
        return record?.status
    }

    if (loading) {
        return (
            <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="rounded-md border border-border overflow-x-auto shadow-sm">
            <table className="w-full text-sm border-collapse">
                <thead className="bg-[#1E1E2D] text-white">
                    <tr>
                        <th className="p-3 text-left font-medium sticky left-0 bg-[#1E1E2D] z-10 border-b border-border min-w-[150px]">Student Name</th>
                        {days.map((day) => (
                            <th key={day.toISOString()} className="p-3 text-center border-b border-l border-border min-w-[80px]">
                                <div className="font-semibold">{day.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                                <div className="text-[10px] opacity-70 font-normal">{day.toLocaleDateString('en-US', { day: '2-digit', month: 'short' })}</div>
                            </th>
                        ))}
                        <th className="p-3 text-center border-b border-l border-border bg-[#1E1E2D] font-medium min-w-[100px]">Stats (P/A)</th>
                    </tr>
                </thead>
                <tbody className="bg-white">
                    {data.map((row) => (
                        <tr key={row.student.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-3 sticky left-0 bg-white border-b border-border z-10">
                                <div className="font-medium text-foreground">{row.student.firstName} {row.student.lastName}</div>
                                <div className="text-[10px] text-muted-foreground">Roll: {row.student.rollNumber}</div>
                            </td>
                            {days.map((day) => {
                                const status = getStatus(row.records, day)
                                return (
                                    <td key={day.toISOString()} className="p-3 text-center border-b border-l border-border">
                                        {status ? (
                                            <div className="flex justify-center">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white
                          ${status === 'PRESENT' ? 'bg-green-500' :
                                                        status === 'ABSENT' ? 'bg-red-500' :
                                                            status === 'LATE' ? 'bg-amber-500' :
                                                                'bg-slate-400'}`}>
                                                    {statusShort[status] || '?'}
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-slate-200">—</span>
                                        )}
                                    </td>
                                )
                            })}
                            <td className="p-3 text-center border-b border-l border-border font-medium bg-slate-50/50">
                                <div className="flex items-center justify-center gap-1">
                                    <span className="text-green-600">{row.summary.present}</span>
                                    <span className="text-slate-300">/</span>
                                    <span className="text-red-600">{row.summary.absent}</span>
                                </div>
                            </td>
                        </tr>
                    ))}
                    {data.length === 0 && (
                        <tr>
                            <td colSpan={8} className="p-12 text-center text-muted-foreground bg-white">
                                No students found for this section.
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    )
}
