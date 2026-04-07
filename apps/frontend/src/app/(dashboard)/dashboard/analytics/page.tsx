'use client'

import { useEffect, useState, useCallback } from 'react'
import { ProtectedRoute } from '@/components/auth'
import { Card, CardBody } from '@/components/ui/card'
import { analyticsService } from '@/services/analytics.service'
import { BarChart3, Users, GraduationCap, TrendingUp, DollarSign, PieChart, Activity } from 'lucide-react'
import { useSession } from '@/context/session-context'

interface DashboardMetrics {
    totalStudents: number; totalTeachers: number; totalClasses: number
    activeStudents: number; totalFeeCollected: number
}

interface AttendanceDay { date: string; PRESENT?: number; ABSENT?: number; LATE?: number }
interface GradeRange { label: string; count: number }
interface FinanceSummary { totalInvoiced: number; totalPaid: number; outstanding: number }

export default function AnalyticsPage() {
    const { selectedCampus } = useSession()
    const [metrics, setMetrics] = useState<DashboardMetrics | null>(null)
    const [attendanceTrend, setAttendanceTrend] = useState<AttendanceDay[]>([])
    const [gradeDistribution, setGradeDistribution] = useState<GradeRange[]>([])
    const [finance, setFinance] = useState<FinanceSummary | null>(null)
    const [loading, setLoading] = useState(true)

    const fetchAll = useCallback(async () => {
        setLoading(true)
        const [m, a, g, f] = await Promise.all([
            analyticsService.getDashboardMetrics(),
            analyticsService.getAttendanceTrend(30),
            analyticsService.getGradeDistribution(),
            analyticsService.getFinanceSummary(),
        ])
        if (m.success && m.data) setMetrics(m.data as any)
        if (a.success && a.data) setAttendanceTrend(Array.isArray(a.data) ? a.data : [])
        if (g.success && g.data) setGradeDistribution(Array.isArray(g.data) ? g.data : [])
        if (f.success && f.data) setFinance(f.data as any)
        setLoading(false)
    }, [selectedCampus])

    useEffect(() => { fetchAll() }, [fetchAll])

    const fmt = (n: number) => new Intl.NumberFormat().format(n)

    return (
        <ProtectedRoute permission="analytics:read">
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <BarChart3 className="h-6 w-6" /> Analytics
                    </h1>
                    <p className="mt-1 text-sm text-muted-foreground">School-wide metrics and insights</p>
                </div>

                {/* KPI Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                    {[
                        { icon: Users, label: 'Total Students', value: metrics?.totalStudents ?? 0, color: 'text-blue-500' },
                        { icon: Users, label: 'Active Students', value: metrics?.activeStudents ?? 0, color: 'text-green-500' },
                        { icon: GraduationCap, label: 'Teachers', value: metrics?.totalTeachers ?? 0, color: 'text-purple-500' },
                        { icon: Activity, label: 'Classes', value: metrics?.totalClasses ?? 0, color: 'text-orange-500' },
                        { icon: DollarSign, label: 'Fee Collected', value: fmt(metrics?.totalFeeCollected ?? 0), color: 'text-emerald-500' },
                    ].map((kpi, i) => (
                        <Card key={i}><CardBody className="flex items-center gap-3 py-4">
                            <kpi.icon className={`h-8 w-8 ${kpi.color}`} />
                            <div>
                                <p className="text-2xl font-bold">{loading ? '...' : kpi.value}</p>
                                <p className="text-xs text-muted-foreground">{kpi.label}</p>
                            </div>
                        </CardBody></Card>
                    ))}
                </div>

                {/* Grade Distribution */}
                <Card>
                    <CardBody>
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><PieChart className="h-5 w-5" /> Grade Distribution</h3>
                        <div className="grid grid-cols-5 gap-3">
                            {gradeDistribution.map((g, i) => {
                                const colors = ['bg-green-500', 'bg-blue-500', 'bg-yellow-500', 'bg-orange-500', 'bg-red-500']
                                return (
                                    <div key={i} className="text-center">
                                        <div className={`mx-auto w-14 h-14 rounded-full flex items-center justify-center text-white font-bold ${colors[i] || 'bg-gray-500'}`}>
                                            {g.count}
                                        </div>
                                        <p className="mt-2 text-xs font-medium">{g.label}</p>
                                    </div>
                                )
                            })}
                            {gradeDistribution.length === 0 && <p className="col-span-5 text-center text-sm text-muted-foreground py-4">No grade data available.</p>}
                        </div>
                    </CardBody>
                </Card>

                {/* Attendance Trend */}
                <Card>
                    <CardBody>
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><TrendingUp className="h-5 w-5" /> Attendance Trend (30 days)</h3>
                        <div className="flex items-end gap-1 h-32 overflow-x-auto">
                            {attendanceTrend.map((d, i) => {
                                const total = (d.PRESENT ?? 0) + (d.ABSENT ?? 0) + (d.LATE ?? 0)
                                const pctPresent = total > 0 ? ((d.PRESENT ?? 0) / total) * 100 : 0
                                return (
                                    <div key={i} className="flex flex-col items-center flex-shrink-0 w-4" title={`${d.date}: ${Math.round(pctPresent)}% present`}>
                                        <div className="w-3 rounded-t bg-green-500" style={{ height: `${pctPresent}%`, minHeight: '2px' }} />
                                        <div className="w-3 rounded-b bg-red-300" style={{ height: `${100 - pctPresent}%`, minHeight: '2px' }} />
                                    </div>
                                )
                            })}
                            {attendanceTrend.length === 0 && <p className="text-sm text-muted-foreground py-4">No attendance data yet.</p>}
                        </div>
                        <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-500 rounded" /> Present</span>
                            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-300 rounded" /> Absent/Late</span>
                        </div>
                    </CardBody>
                </Card>

                {/* Finance Summary */}
                <Card>
                    <CardBody>
                        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2"><DollarSign className="h-5 w-5" /> Finance Summary</h3>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="text-center p-4 rounded-lg bg-muted/50">
                                <p className="text-2xl font-bold text-foreground">{fmt(finance?.totalInvoiced ?? 0)}</p>
                                <p className="text-xs text-muted-foreground mt-1">Total Invoiced</p>
                            </div>
                            <div className="text-center p-4 rounded-lg bg-green-50 dark:bg-green-900/20">
                                <p className="text-2xl font-bold text-green-600">{fmt(finance?.totalPaid ?? 0)}</p>
                                <p className="text-xs text-muted-foreground mt-1">Total Paid</p>
                            </div>
                            <div className="text-center p-4 rounded-lg bg-red-50 dark:bg-red-900/20">
                                <p className="text-2xl font-bold text-red-600">{fmt(finance?.outstanding ?? 0)}</p>
                                <p className="text-xs text-muted-foreground mt-1">Outstanding</p>
                            </div>
                        </div>
                    </CardBody>
                </Card>
            </div>
        </ProtectedRoute>
    )
}
