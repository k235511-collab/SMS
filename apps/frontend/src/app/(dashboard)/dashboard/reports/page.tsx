'use client'

import { useEffect, useState, useCallback } from 'react'
import { ProtectedRoute } from '@/components/auth'
import { Card, CardBody } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { reportsService } from '@/services/analytics.service'
import { FileText, Download, BarChart2, Users, GraduationCap, DollarSign } from 'lucide-react'

interface ReportType { type: string; name: string; description: string }

const iconMap: Record<string, any> = {
    student: Users, class: GraduationCap, attendance: BarChart2, finance: DollarSign,
}

export default function ReportsPage() {
    const [reports, setReports] = useState<ReportType[]>([])
    const [loading, setLoading] = useState(false)

    const fetchReports = useCallback(async () => {
        setLoading(true)
        const res = await reportsService.getAvailableReports()
        if (res.success && res.data) setReports(Array.isArray(res.data) ? res.data : [])
        setLoading(false)
    }, [])

    useEffect(() => { fetchReports() }, [fetchReports])

    return (
        <ProtectedRoute permission="reports:read">
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <FileText className="h-6 w-6" /> Reports
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">Generate and download school reports</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {loading ? (
                        <p className="text-sm text-muted-foreground col-span-2 text-center py-8">Loading...</p>
                    ) : reports.length === 0 ? (
                        // Default report types even if API hasn't returned
                        [
                            { type: 'student', name: 'Student Report Card', description: 'Individual student progress report with grades, attendance, and remarks' },
                            { type: 'class', name: 'Class Report', description: 'Class-level attendance and performance summary across all subjects' },
                            { type: 'attendance', name: 'Attendance Report', description: 'Detailed attendance analysis with trends and patterns' },
                            { type: 'finance', name: 'Finance Report', description: 'Fee collection status, outstanding balances, and payment history' },
                        ].map(report => {
                            const Icon = iconMap[report.type] || FileText
                            return (
                                <Card key={report.type} className="hover:shadow-md transition-shadow">
                                    <CardBody className="flex items-start gap-4 py-5">
                                        <div className="p-3 rounded-lg bg-primary/10">
                                            <Icon className="h-6 w-6 text-primary" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-foreground">{report.name}</h3>
                                            <p className="text-sm text-muted-foreground mt-1">{report.description}</p>
                                            <Button variant="outline" size="sm" className="mt-3">
                                                <Download className="mr-2 h-3 w-3" /> Generate
                                            </Button>
                                        </div>
                                    </CardBody>
                                </Card>
                            )
                        })
                    ) : (
                        reports.map(report => {
                            const Icon = iconMap[report.type] || FileText
                            return (
                                <Card key={report.type} className="hover:shadow-md transition-shadow">
                                    <CardBody className="flex items-start gap-4 py-5">
                                        <div className="p-3 rounded-lg bg-primary/10">
                                            <Icon className="h-6 w-6 text-primary" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="font-semibold text-foreground">{report.name}</h3>
                                            <p className="text-sm text-muted-foreground mt-1">{report.description}</p>
                                            <Button variant="outline" size="sm" className="mt-3">
                                                <Download className="mr-2 h-3 w-3" /> Generate
                                            </Button>
                                        </div>
                                    </CardBody>
                                </Card>
                            )
                        })
                    )}
                </div>
            </div>
        </ProtectedRoute>
    )
}
