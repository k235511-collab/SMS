'use client'

import { useEffect, useState, use, useMemo, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { ProtectedRoute, PermissionGate } from '@/components/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { api } from '@/lib/api-client'
import { ArrowLeft, Mail, Phone, MapPin, Calendar, User, GraduationCap, ClipboardCheck, FileText, DollarSign, ChevronDown, ChevronRight, History, BookOpen, CreditCard, Check, X, Heart, Shield, Users, Download, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import Link from 'next/link'
import { PageLoader } from '@/components/ui/page-loader'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useSession } from '@/context/session-context'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { PayFeeDialog } from '@/components/finance'

interface StudentDetails {
    id: string
    rollNumber: string
    firstName: string
    lastName: string
    dateOfBirth?: string
    gender?: string
    bloodGroup?: string
    guardianName?: string
    guardianPhone?: string
    guardianEmail?: string
    address?: string
    isActive: boolean
    status: string
    enrollmentDate?: string
    cnic?: string
    phone?: string
    group?: string
    religion?: string
    admissionNote?: string
    profileImage?: string
    class?: { id: string; name: string; code: string }
    section?: { id: string; name: string }
    enrollments?: EnrollmentRecord[]
    documents?: { id: string; type: string }[]
    parents?: { id: string; relationship: string; isPrimary: boolean; parent: { id: string; firstName: string; lastName: string; email: string; phone?: string; cnic?: string; profession?: string; qualification?: string; address?: string; gender?: string } }[]
}

interface EnrollmentRecord {
    id: string
    status: string
    createdAt: string
    academicYear: { id: string; name: string; startDate: string; endDate: string; isCurrent: boolean }
    class: { id: string; name: string; code: string }
    section?: { id: string; name: string }
}

interface ExamResult {
    id: string
    marksObtained: number
    grade?: string
    remarks?: string
    isAbsent?: boolean
    isPassed?: boolean
    percentage?: number
    exam: {
        id: string
        name: string
        type: string
        totalMarks: number
        passingMarks: number
        status?: string
    }
    subject: {
        id: string
        name: string
        code: string
    }
}

interface AttendanceRecord {
    id: string
    date: string
    status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED' | 'HALF_DAY'
    remarks?: string
    section: {
        name: string
        class: { name: string }
    }
}

interface Invoice {
    id: string
    invoiceNo: string
    totalAmount: number
    paidAmount: number
    status: 'PAID' | 'PARTIAL' | 'UNPAID' | 'OVERDUE' | 'CANCELLED'
    dueDate: string
    feeStructure?: { name: string }
}

interface MonthlyAttendance {
    month: string
    label: string
    present: number
    absent: number
    late: number
    excused: number
    halfDay: number
    total: number
    records: AttendanceRecord[]
}

export default function StudentDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const searchParams = useSearchParams()
    const initialTab = searchParams.get('tab') || 'overview'
    const { selectedYear } = useSession()
    const [student, setStudent] = useState<StudentDetails | null>(null)
    const [examResults, setExamResults] = useState<ExamResult[]>([])
    const [monthlyAttendance, setMonthlyAttendance] = useState<MonthlyAttendance[]>([])
    const [invoices, setInvoices] = useState<Invoice[]>([])
    const [loading, setLoading] = useState(true)
    const [resultsLoading, setResultsLoading] = useState(false)
    const [attendanceLoading, setAttendanceLoading] = useState(false)
    const [financeLoading, setFinanceLoading] = useState(false)
    const [expandedMonths, setExpandedMonths] = useState<Record<string, boolean>>({})

    // Pay fee dialog state
    const [payDialogOpen, setPayDialogOpen] = useState(false)
    const [payPreSelectedInvoiceId, setPayPreSelectedInvoiceId] = useState<string | null>(null)

    const toggleMonth = (month: string) => {
        setExpandedMonths(prev => ({ ...prev, [month]: !prev[month] }))
    }

    const unpaidInvoices = useMemo(() => invoices.filter(i => i.status !== 'PAID' && i.status !== 'CANCELLED'), [invoices])

    const openPayDialog = (invoiceId?: string) => {
        setPayPreSelectedInvoiceId(invoiceId || null)
        setPayDialogOpen(true)
    }

    const refreshInvoices = async () => {
        if (!selectedYear) return
        const dateParams = `startDate=${selectedYear.startDate}&endDate=${selectedYear.endDate}`
        const invRes = await api.get<{ data: Invoice[] }>(`/finance/invoices?studentId=${id}&${dateParams}&pageSize=100`)
        if (invRes.success && invRes.data) {
            const records = Array.isArray(invRes.data) ? invRes.data : (invRes.data as any).data || []
            setInvoices(records)
        }
    }

    useEffect(() => {
        const fetchStudent = async () => {
            const res = await api.get<StudentDetails>(`/students/${id}`)
            if (res.success && res.data) {
                setStudent(res.data)
            }
            setLoading(false)
        }
        fetchStudent()
    }, [id])

    useEffect(() => {
        if (!id || !selectedYear) return

        const fetchData = async () => {
            setResultsLoading(true)
            setAttendanceLoading(true)

            const dateParams = `startDate=${selectedYear.startDate}&endDate=${selectedYear.endDate}`

            const [examRes, attRes, invRes] = await Promise.all([
                api.get<ExamResult[]>(`/exams/student-results/${id}?${dateParams}`),
                api.get<MonthlyAttendance[]>(`/students/${id}/attendance/monthly?${dateParams}`),
                api.get<{ data: Invoice[] }>(`/finance/invoices?studentId=${id}&${dateParams}&pageSize=100`)
            ])

            if (examRes.success && examRes.data) {
                setExamResults(examRes.data)
            }

            if (attRes.success && attRes.data) {
                const records = Array.isArray(attRes.data) ? attRes.data : []
                setMonthlyAttendance(records)
            }

            if (invRes.success && invRes.data) {
                const records = Array.isArray(invRes.data) ? invRes.data : (invRes.data as any).data || []
                setInvoices(records)
            }

            setResultsLoading(false)
            setAttendanceLoading(false)
        }

        fetchData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, selectedYear?.id])

    if (loading) {
        return <PageLoader message="Loading student profile..." />
    }

    if (!student) {
        return (
            <div className="flex flex-col items-center justify-center py-12">
                <h2 className="text-xl font-semibold">Student not found</h2>
                <Link href="/dashboard/students">
                    <Button variant="link">Back to list</Button>
                </Link>
            </div>
        )
    }

    return (
        <ProtectedRoute permission="students:read">
            <div className="space-y-6">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/students">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold">{student.firstName} {student.lastName}</h1>
                        <p className="text-sm text-muted-foreground">Roll Number: {student.rollNumber}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {selectedYear && (
                            <Badge variant="outline" className="h-7 px-3 font-normal text-primary-600 border-primary-100 bg-primary-50">
                                Session: {selectedYear.name}
                            </Badge>
                        )}
                        <Badge variant={student.status === 'ACTIVE' ? 'default' : 'secondary'}>
                            {student.status}
                        </Badge>
                    </div>
                </div>

                <Tabs defaultValue={initialTab} className="w-full">
                    <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent gap-6">
                        <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 pb-2 h-10 shadow-none">Overview</TabsTrigger>
                        <TabsTrigger value="history" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 pb-2 h-10 shadow-none">Academic History</TabsTrigger>
                        <TabsTrigger value="exams" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 pb-2 h-10 shadow-none">Exams & Grades</TabsTrigger>
                        <TabsTrigger value="attendance" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 pb-2 h-10 shadow-none">Attendance</TabsTrigger>
                        <TabsTrigger value="finance" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 pb-2 h-10 shadow-none">Finance & Fees</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="py-6 space-y-6">
                        <div className="grid gap-6 md:grid-cols-3">
                            {/* Profile Summary */}
                            <Card>
                                <CardHeader><CardTitle className="text-lg">Profile Summary</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <GraduationCap className="h-4 w-4 text-muted-foreground" />
                                        <div>
                                            <p className="text-xs font-medium text-muted-foreground">Class & Section</p>
                                            <p className="text-sm">{student.class?.name || '—'} {student.section?.name ? `(${student.section.name})` : ''}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <User className="h-4 w-4 text-muted-foreground" />
                                        <div>
                                            <p className="text-xs font-medium text-muted-foreground">Gender</p>
                                            <p className="text-sm">{student.gender || '—'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Calendar className="h-4 w-4 text-muted-foreground" />
                                        <div>
                                            <p className="text-xs font-medium text-muted-foreground">Date of Birth</p>
                                            <p className="text-sm">{student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString() : '—'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Shield className="h-4 w-4 text-muted-foreground" />
                                        <div>
                                            <p className="text-xs font-medium text-muted-foreground">CNIC / B-Form</p>
                                            <p className="text-sm">{student.cnic || '—'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Phone className="h-4 w-4 text-muted-foreground" />
                                        <div>
                                            <p className="text-xs font-medium text-muted-foreground">Phone / WhatsApp</p>
                                            <p className="text-sm">{student.phone || '—'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Heart className="h-4 w-4 text-muted-foreground" />
                                        <div>
                                            <p className="text-xs font-medium text-muted-foreground">Blood Group</p>
                                            <p className="text-sm">{student.bloodGroup || '—'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                                        <div>
                                            <p className="text-xs font-medium text-muted-foreground">Religion</p>
                                            <p className="text-sm">{student.religion || '—'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Users className="h-4 w-4 text-muted-foreground" />
                                        <div>
                                            <p className="text-xs font-medium text-muted-foreground">Group</p>
                                            <p className="text-sm">{student.group || '—'}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Parent / Guardian Details + Contact */}
                            <Card className="md:col-span-2">
                                {student.parents && student.parents.length > 0 ? (
                                    <>
                                        {student.parents.map((ps, idx) => {
                                            const p = ps.parent
                                            return (
                                                <div key={ps.id}>
                                                    {idx > 0 && <div className="border-t" />}
                                                    <CardHeader className={idx > 0 ? 'pt-4' : ''}>
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-3">
                                                                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold">
                                                                    {p.firstName?.[0]}{p.lastName?.[0]}
                                                                </div>
                                                                <div>
                                                                    <CardTitle className="text-lg">{p.firstName} {p.lastName}</CardTitle>
                                                                    <p className="text-xs text-muted-foreground mt-0.5">{ps.relationship} {ps.isPrimary ? '(Primary)' : ''}</p>
                                                                </div>
                                                            </div>
                                                            <Badge variant="outline">{ps.relationship}</Badge>
                                                        </div>
                                                    </CardHeader>
                                                    <CardContent className="grid gap-4 md:grid-cols-2">
                                                        <div className="space-y-3">
                                                            <div className="flex items-center gap-3">
                                                                <Phone className="h-4 w-4 text-muted-foreground" />
                                                                <div>
                                                                    <p className="text-xs font-medium text-muted-foreground">Phone</p>
                                                                    <p className="text-sm">{p.phone || '—'}</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                <Shield className="h-4 w-4 text-muted-foreground" />
                                                                <div>
                                                                    <p className="text-xs font-medium text-muted-foreground">CNIC</p>
                                                                    <p className="text-sm">{p.cnic || '—'}</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                <Mail className="h-4 w-4 text-muted-foreground" />
                                                                <div>
                                                                    <p className="text-xs font-medium text-muted-foreground">Email</p>
                                                                    <p className="text-sm">{p.email && !p.email.includes('@internal.local') ? p.email : '—'}</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                <User className="h-4 w-4 text-muted-foreground" />
                                                                <div>
                                                                    <p className="text-xs font-medium text-muted-foreground">Gender</p>
                                                                    <p className="text-sm">{p.gender || '—'}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="space-y-3">
                                                            <div className="flex items-center gap-3">
                                                                <GraduationCap className="h-4 w-4 text-muted-foreground" />
                                                                <div>
                                                                    <p className="text-xs font-medium text-muted-foreground">Profession</p>
                                                                    <p className="text-sm">{p.profession || '—'}</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                <BookOpen className="h-4 w-4 text-muted-foreground" />
                                                                <div>
                                                                    <p className="text-xs font-medium text-muted-foreground">Qualification</p>
                                                                    <p className="text-sm">{p.qualification || '—'}</p>
                                                                </div>
                                                            </div>
                                                            <div className="flex items-start gap-3">
                                                                <MapPin className="h-4 w-4 mt-1 text-muted-foreground" />
                                                                <div>
                                                                    <p className="text-xs font-medium text-muted-foreground">Address</p>
                                                                    <p className="text-sm leading-relaxed">{p.address || student.address || '—'}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </div>
                                            )
                                        })}
                                    </>
                                ) : (
                                    <>
                                        <CardHeader><CardTitle className="text-lg">Contact Information</CardTitle></CardHeader>
                                        <CardContent className="grid gap-4 md:grid-cols-2">
                                            <div className="space-y-3">
                                                <div className="flex items-center gap-3">
                                                    <User className="h-4 w-4 text-muted-foreground" />
                                                    <div>
                                                        <p className="text-xs font-medium text-muted-foreground">Guardian Name</p>
                                                        <p className="text-sm">{student.guardianName || '—'}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                                    <div>
                                                        <p className="text-xs font-medium text-muted-foreground">Guardian Phone</p>
                                                        <p className="text-sm">{student.guardianPhone || '—'}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                                    <div>
                                                        <p className="text-xs font-medium text-muted-foreground">Email</p>
                                                        <p className="text-sm">{student.guardianEmail || '—'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="space-y-3">
                                                <div className="flex items-start gap-3">
                                                    <MapPin className="h-4 w-4 mt-1 text-muted-foreground" />
                                                    <div>
                                                        <p className="text-xs font-medium text-muted-foreground">Address</p>
                                                        <p className="text-sm leading-relaxed">{student.address || '—'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </>
                                )}
                                {student.admissionNote && (
                                    <>
                                        <div className="border-t" />
                                        <CardContent className="pt-4">
                                            <div className="flex items-start gap-3">
                                                <FileText className="h-4 w-4 mt-1 text-muted-foreground" />
                                                <div>
                                                    <p className="text-xs font-medium text-muted-foreground">Admission Note</p>
                                                    <p className="text-sm leading-relaxed">{student.admissionNote}</p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </>
                                )}
                            </Card>
                        </div>

                        {/* Documents */}
                        {student.documents && student.documents.length > 0 && (
                            <Card>
                                <CardHeader><CardTitle className="text-lg">Documents Submitted</CardTitle></CardHeader>
                                <CardContent>
                                    <div className="flex flex-wrap gap-2">
                                        {student.documents.map((doc) => {
                                            const label = doc.type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
                                            return (
                                                <Badge key={doc.id} variant="outline" className="px-3 py-1.5 text-sm gap-1.5">
                                                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                                                    {label}
                                                </Badge>
                                            )
                                        })}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>

                    {/* Academic History Tab */}
                    <TabsContent value="history" className="py-6">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-lg">Academic Journey</CardTitle>
                                <History className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                {student.enrollments && student.enrollments.length > 0 ? (
                                    <div className="relative">
                                        {/* Timeline line */}
                                        <div className="absolute left-[15px] top-0 bottom-0 w-0.5 bg-border" />

                                        <div className="space-y-6">
                                            {student.enrollments.map((enrollment, idx) => {
                                                const isFirst = idx === 0
                                                const isLast = idx === student.enrollments!.length - 1
                                                const isCurrent = enrollment.academicYear.isCurrent
                                                return (
                                                    <div key={enrollment.id} className="relative flex items-start gap-4 pl-0">
                                                        {/* Timeline dot */}
                                                        <div className={cn(
                                                            "relative z-10 w-[31px] h-[31px] rounded-full border-2 flex items-center justify-center shrink-0",
                                                            isCurrent
                                                                ? "bg-primary border-primary text-primary-foreground"
                                                                : enrollment.status === 'GRADUATED'
                                                                    ? "bg-emerald-500 border-emerald-500 text-white"
                                                                    : "bg-background border-muted-foreground/30"
                                                        )}>
                                                            {isCurrent ? (
                                                                <BookOpen className="h-3.5 w-3.5" />
                                                            ) : enrollment.status === 'GRADUATED' ? (
                                                                <GraduationCap className="h-3.5 w-3.5" />
                                                            ) : (
                                                                <div className="w-2 h-2 rounded-full bg-muted-foreground/50" />
                                                            )}
                                                        </div>

                                                        {/* Content */}
                                                        <div className={cn(
                                                            "flex-1 rounded-lg border p-4",
                                                            isCurrent ? "border-primary/30 bg-primary/5" : "bg-card"
                                                        )}>
                                                            <div className="flex items-center justify-between mb-1">
                                                                <h4 className="font-semibold text-sm flex items-center gap-2">
                                                                    {enrollment.academicYear.name}
                                                                    {isCurrent && <Badge variant="default" className="text-[10px] h-5">Current</Badge>}
                                                                </h4>
                                                                <Badge
                                                                    variant={
                                                                        enrollment.status === 'ACTIVE' ? 'default' :
                                                                            enrollment.status === 'GRADUATED' ? 'default' :
                                                                                'secondary'
                                                                    }
                                                                    className={cn(
                                                                        enrollment.status === 'GRADUATED' && 'bg-emerald-100 text-emerald-700 border-emerald-200',
                                                                        enrollment.status === 'TRANSFERRED' && 'bg-amber-100 text-amber-700 border-amber-200'
                                                                    )}
                                                                >
                                                                    {enrollment.status}
                                                                </Badge>
                                                            </div>
                                                            <div className="text-sm text-muted-foreground space-y-1">
                                                                <p>
                                                                    <span className="font-medium text-foreground">Class:</span> {enrollment.class.name}
                                                                    {enrollment.section && <span> — Section {enrollment.section.name}</span>}
                                                                </p>
                                                                <p className="text-xs">
                                                                    {new Date(enrollment.academicYear.startDate).toLocaleDateString()} — {new Date(enrollment.academicYear.endDate).toLocaleDateString()}
                                                                </p>
                                                                {isFirst && student.enrollmentDate && (
                                                                    <p className="text-xs text-primary font-medium mt-1">
                                                                        Admitted on {new Date(student.enrollmentDate).toLocaleDateString()}
                                                                    </p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-center py-8 text-muted-foreground italic">No enrollment history found.</p>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="exams" className="py-6 space-y-6">
                        {/* Summary Cards */}
                        {examResults.length > 0 && (
                            <div className="grid gap-4 md:grid-cols-4">
                                <Card>
                                    <CardContent className="pt-4">
                                        <div className="flex items-center gap-2">
                                            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                                                <FileText className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                            </div>
                                            <div>
                                                <p className="text-2xl font-bold">{examResults.length}</p>
                                                <p className="text-xs text-muted-foreground">Total Subjects</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="pt-4">
                                        <div className="flex items-center gap-2">
                                            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                                                <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                            </div>
                                            <div>
                                                <p className="text-2xl font-bold text-emerald-600">
                                                    {examResults.filter(r => r.isPassed === true).length}
                                                </p>
                                                <p className="text-xs text-muted-foreground">Passed</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="pt-4">
                                        <div className="flex items-center gap-2">
                                            <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/30">
                                                <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400" />
                                            </div>
                                            <div>
                                                <p className="text-2xl font-bold text-red-600">
                                                    {examResults.filter(r => r.isPassed === false).length}
                                                </p>
                                                <p className="text-xs text-muted-foreground">Failed</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="pt-4">
                                        <div className="flex items-center gap-2">
                                            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                                                <Minus className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                            </div>
                                            <div>
                                                <p className="text-2xl font-bold">
                                                    {(() => {
                                                        const withPercentage = examResults.filter(r => !r.isAbsent && r.percentage !== undefined)
                                                        if (withPercentage.length === 0) return '—'
                                                        const avg = withPercentage.reduce((sum, r) => sum + (r.percentage || 0), 0) / withPercentage.length
                                                        return `${Math.round(avg)}%`
                                                    })()}
                                                </p>
                                                <p className="text-xs text-muted-foreground">Avg Percentage</p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-lg">Academic Performance</CardTitle>
                                <div className="flex items-center gap-2">
                                    {examResults.length > 0 && (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                // Generate PDF
                                                const printWindow = window.open('', '_blank')
                                                if (printWindow) {
                                                    const studentName = `${student.firstName} ${student.lastName}`
                                                    const className = student.class?.name || 'N/A'
                                                    const sectionName = student.section?.name || 'N/A'
                                                    const rollNumber = student.rollNumber
                                                    const sessionName = selectedYear?.name || 'N/A'

                                                    printWindow.document.write(`
                                                        <!DOCTYPE html>
                                                        <html>
                                                        <head>
                                                            <title>Result Card - ${studentName}</title>
                                                            <style>
                                                                body { font-family: Arial, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; }
                                                                h1 { text-align: center; margin-bottom: 5px; }
                                                                .subtitle { text-align: center; color: #666; margin-bottom: 20px; }
                                                                .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
                                                                .info-item { padding: 8px; background: #f5f5f5; border-radius: 4px; }
                                                                .info-label { font-size: 12px; color: #666; }
                                                                .info-value { font-weight: bold; }
                                                                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                                                                th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
                                                                th { background: #f5f5f5; }
                                                                .passed { color: green; font-weight: bold; }
                                                                .failed { color: red; font-weight: bold; }
                                                                .absent { color: orange; }
                                                                .summary { margin-top: 20px; padding: 15px; background: #f9f9f9; border-radius: 8px; }
                                                                .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; text-align: center; }
                                                                .summary-item h3 { margin: 0; font-size: 24px; }
                                                                .summary-item p { margin: 5px 0 0; color: #666; font-size: 12px; }
                                                                @media print { body { padding: 0; } }
                                                            </style>
                                                        </head>
                                                        <body>
                                                            <h1>Result Card</h1>
                                                            <p class="subtitle">Academic Session: ${sessionName}</p>

                                                            <div class="info-grid">
                                                                <div class="info-item">
                                                                    <div class="info-label">Student Name</div>
                                                                    <div class="info-value">${studentName}</div>
                                                                </div>
                                                                <div class="info-item">
                                                                    <div class="info-label">Roll Number</div>
                                                                    <div class="info-value">${rollNumber}</div>
                                                                </div>
                                                                <div class="info-item">
                                                                    <div class="info-label">Class / Section</div>
                                                                    <div class="info-value">${className} - ${sectionName}</div>
                                                                </div>
                                                                <div class="info-item">
                                                                    <div class="info-label">Date</div>
                                                                    <div class="info-value">${new Date().toLocaleDateString()}</div>
                                                                </div>
                                                            </div>

                                                            <table>
                                                                <thead>
                                                                    <tr>
                                                                        <th>Exam</th>
                                                                        <th>Subject</th>
                                                                        <th>Marks</th>
                                                                        <th>Percentage</th>
                                                                        <th>Status</th>
                                                                        <th>Grade</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    ${examResults.map(r => `
                                                                        <tr>
                                                                            <td>${r.exam.name}</td>
                                                                            <td>${r.subject.name}</td>
                                                                            <td>${r.isAbsent ? 'Absent' : `${r.marksObtained} / ${r.exam.totalMarks}`}</td>
                                                                            <td>${r.isAbsent ? '—' : `${Math.round(r.percentage || 0)}%`}</td>
                                                                            <td class="${r.isAbsent ? 'absent' : r.isPassed ? 'passed' : 'failed'}">
                                                                                ${r.isAbsent ? 'Absent' : r.isPassed ? 'Pass' : 'Fail'}
                                                                            </td>
                                                                            <td>${r.grade || '—'}</td>
                                                                        </tr>
                                                                    `).join('')}
                                                                </tbody>
                                                            </table>

                                                            <div class="summary">
                                                                <div class="summary-grid">
                                                                    <div class="summary-item">
                                                                        <h3>${examResults.length}</h3>
                                                                        <p>Total Subjects</p>
                                                                    </div>
                                                                    <div class="summary-item">
                                                                        <h3 style="color: green">${examResults.filter(r => r.isPassed === true).length}</h3>
                                                                        <p>Passed</p>
                                                                    </div>
                                                                    <div class="summary-item">
                                                                        <h3 style="color: red">${examResults.filter(r => r.isPassed === false).length}</h3>
                                                                        <p>Failed</p>
                                                                    </div>
                                                                    <div class="summary-item">
                                                                        <h3>${(() => {
                                                                            const withPct = examResults.filter(r => !r.isAbsent && r.percentage !== undefined)
                                                                            if (withPct.length === 0) return '—'
                                                                            return `${Math.round(withPct.reduce((s, r) => s + (r.percentage || 0), 0) / withPct.length)}%`
                                                                        })()}</h3>
                                                                        <p>Average</p>
                                                                    </div>
                                                                </div>
                                                            </div>

                                                            <script>window.print();</script>
                                                        </body>
                                                        </html>
                                                    `)
                                                    printWindow.document.close()
                                                }
                                            }}
                                        >
                                            <Download className="h-4 w-4 mr-2" />
                                            Export PDF
                                        </Button>
                                    )}
                                    <FileText className="h-4 w-4 text-muted-foreground" />
                                </div>
                            </CardHeader>
                            <CardContent>
                                {resultsLoading ? (
                                    <div className="space-y-3">
                                        <Skeleton className="h-8 w-full" />
                                        <Skeleton className="h-8 w-full" />
                                        <Skeleton className="h-8 w-full" />
                                    </div>
                                ) : examResults.length > 0 ? (
                                    <div className="relative w-full overflow-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b text-muted-foreground">
                                                    <th className="h-10 px-2 text-left font-medium">Exam</th>
                                                    <th className="h-10 px-2 text-left font-medium">Subject</th>
                                                    <th className="h-10 px-2 text-left font-medium">Marks</th>
                                                    <th className="h-10 px-2 text-left font-medium">%</th>
                                                    <th className="h-10 px-2 text-left font-medium">Status</th>
                                                    <th className="h-10 px-2 text-left font-medium">Grade</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {examResults.map((res) => (
                                                    <tr key={res.id} className="border-b hover:bg-muted/50 transition-colors">
                                                        <td className="p-2 font-medium">{res.exam.name}</td>
                                                        <td className="p-2">{res.subject.name}</td>
                                                        <td className="p-2">
                                                            {res.isAbsent ? (
                                                                <span className="text-muted-foreground italic">Absent</span>
                                                            ) : (
                                                                <span>{res.marksObtained} / {res.exam.totalMarks}</span>
                                                            )}
                                                        </td>
                                                        <td className="p-2">
                                                            {res.isAbsent ? '—' : (
                                                                <span className={cn(
                                                                    "font-medium",
                                                                    (res.percentage || 0) >= 80 ? "text-emerald-600" :
                                                                    (res.percentage || 0) >= 60 ? "text-blue-600" :
                                                                    (res.percentage || 0) >= 40 ? "text-amber-600" : "text-red-600"
                                                                )}>
                                                                    {Math.round(res.percentage || 0)}%
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="p-2">
                                                            {res.isAbsent ? (
                                                                <Badge variant="outline" className="bg-orange-100 text-orange-700 border-orange-200">Absent</Badge>
                                                            ) : res.isPassed ? (
                                                                <Badge variant="outline" className="bg-emerald-100 text-emerald-700 border-emerald-200">Pass</Badge>
                                                            ) : (
                                                                <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200">Fail</Badge>
                                                            )}
                                                        </td>
                                                        <td className="p-2"><Badge variant="outline">{res.grade || '—'}</Badge></td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <p className="text-center py-8 text-muted-foreground italic">No exam records found for this session.</p>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="attendance" className="py-6">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-lg">Monthly Attendance</CardTitle>
                                <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                {attendanceLoading ? (
                                    <div className="space-y-3">
                                        <Skeleton className="h-12 w-full" />
                                        <Skeleton className="h-12 w-full" />
                                        <Skeleton className="h-12 w-full" />
                                    </div>
                                ) : monthlyAttendance.length > 0 ? (
                                    <div className="space-y-3">
                                        {monthlyAttendance.map((month) => {
                                            const isExpanded = expandedMonths[month.month]
                                            const presentPct = month.total > 0 ? Math.round((month.present / month.total) * 100) : 0
                                            return (
                                                <div key={month.month} className="rounded-lg border overflow-hidden">
                                                    {/* Month summary header — clickable to expand */}
                                                    <button
                                                        onClick={() => toggleMonth(month.month)}
                                                        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors text-left"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            {isExpanded ? (
                                                                <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                                            ) : (
                                                                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                                            )}
                                                            <div>
                                                                <p className="font-semibold text-sm">{month.label}</p>
                                                                <p className="text-xs text-muted-foreground">{month.total} days recorded</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex gap-2 text-xs">
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">{month.present}P</span>
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">{month.absent}A</span>
                                                                {month.late > 0 && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">{month.late}L</span>}
                                                                {month.excused > 0 && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">{month.excused}E</span>}
                                                                {month.halfDay > 0 && <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400">{month.halfDay}H</span>}
                                                            </div>
                                                            <Badge
                                                                variant="outline"
                                                                className={cn(
                                                                    "tabular-nums min-w-[52px] justify-center",
                                                                    presentPct >= 90 ? "text-emerald-700 border-emerald-200 bg-emerald-50" :
                                                                        presentPct >= 75 ? "text-amber-700 border-amber-200 bg-amber-50" :
                                                                            "text-red-700 border-red-200 bg-red-50"
                                                                )}
                                                            >
                                                                {presentPct}%
                                                            </Badge>
                                                        </div>
                                                    </button>

                                                    {/* Expanded daily details */}
                                                    {isExpanded && (
                                                        <div className="border-t bg-muted/30">
                                                            <table className="w-full text-sm">
                                                                <thead>
                                                                    <tr className="border-b text-muted-foreground">
                                                                        <th className="h-8 px-4 text-left font-medium text-xs">Date</th>
                                                                        <th className="h-8 px-4 text-left font-medium text-xs">Status</th>
                                                                        <th className="h-8 px-4 text-left font-medium text-xs">Class / Section</th>
                                                                        <th className="h-8 px-4 text-left font-medium text-xs">Remarks</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody>
                                                                    {month.records.map((att) => (
                                                                        <tr key={att.id} className="border-b last:border-b-0 hover:bg-muted/50 transition-colors">
                                                                            <td className="py-2 px-4 text-xs font-medium">{new Date(att.date).toLocaleDateString()}</td>
                                                                            <td className="py-2 px-4">
                                                                                <Badge
                                                                                    variant={
                                                                                        att.status === 'PRESENT' ? 'default' :
                                                                                            att.status === 'ABSENT' ? 'destructive' :
                                                                                                'outline'
                                                                                    }
                                                                                    className={cn(
                                                                                        "text-[10px] h-5",
                                                                                        att.status === 'LATE' && 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100',
                                                                                        att.status === 'HALF_DAY' && 'bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-100',
                                                                                        att.status === 'EXCUSED' && 'bg-purple-100 text-purple-700 border-purple-200 hover:bg-purple-100'
                                                                                    )}
                                                                                >
                                                                                    {att.status}
                                                                                </Badge>
                                                                            </td>
                                                                            <td className="py-2 px-4 text-xs">{att.section?.class?.name || '—'} - {att.section?.name || '—'}</td>
                                                                            <td className="py-2 px-4 text-xs text-muted-foreground truncate max-w-[200px]">{att.remarks || '—'}</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                ) : (
                                    <p className="text-center py-8 text-muted-foreground italic">No attendance records found for this session.</p>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="finance" className="py-6">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <div className="flex items-center gap-3">
                                    <CardTitle className="text-lg">Fee Vouchers</CardTitle>
                                    {unpaidInvoices.length > 0 && (
                                        <Badge variant="destructive" className="text-xs">
                                            {unpaidInvoices.length} unpaid
                                        </Badge>
                                    )}
                                </div>
                                <PermissionGate permission="finance:create">
                                    {unpaidInvoices.length > 0 && (
                                        <Button size="sm" onClick={() => openPayDialog()}>
                                            <CreditCard className="mr-2 h-4 w-4" />Pay Fee
                                        </Button>
                                    )}
                                </PermissionGate>
                            </CardHeader>
                            <CardContent>
                                {financeLoading ? (
                                    <div className="space-y-3">
                                        <Skeleton className="h-8 w-full" />
                                        <Skeleton className="h-8 w-full" />
                                        <Skeleton className="h-8 w-full" />
                                    </div>
                                ) : invoices.length > 0 ? (
                                    <div className="relative w-full overflow-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b text-muted-foreground">
                                                    <th className="h-10 px-2 text-left font-medium">Voucher No</th>
                                                    <th className="h-10 px-2 text-left font-medium">Fee Type</th>
                                                    <th className="h-10 px-2 text-left font-medium">Due Date</th>
                                                    <th className="h-10 px-2 text-left font-medium">Amount</th>
                                                    <th className="h-10 px-2 text-left font-medium">Status</th>
                                                    <th className="h-10 px-2 text-left font-medium">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {invoices.map((inv) => {
                                                    const remaining = inv.totalAmount - inv.paidAmount
                                                    return (
                                                        <tr key={inv.id} className="border-b hover:bg-muted/50 transition-colors">
                                                            <td className="p-2 font-medium">{inv.invoiceNo}</td>
                                                            <td className="p-2">{inv.feeStructure?.name || 'General Fee Voucher'}</td>
                                                            <td className="p-2">{new Date(inv.dueDate).toLocaleDateString()}</td>
                                                            <td className="p-2">
                                                                <div>
                                                                    <p className="font-medium">Rs.{inv.totalAmount.toLocaleString()}</p>
                                                                    {inv.paidAmount > 0 && (
                                                                        <p className="text-xs text-muted-foreground">Paid: Rs.{inv.paidAmount.toLocaleString()}</p>
                                                                    )}
                                                                </div>
                                                            </td>
                                                            <td className="p-2">
                                                                <Badge
                                                                    variant={
                                                                        inv.status === 'PAID' ? 'default' :
                                                                            inv.status === 'OVERDUE' ? 'destructive' :
                                                                                'outline'
                                                                    }
                                                                    className={cn(
                                                                        inv.status === 'PARTIAL' && 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100',
                                                                        inv.status === 'UNPAID' && 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-100'
                                                                    )}
                                                                >
                                                                    {inv.status}
                                                                </Badge>
                                                            </td>
                                                            <td className="p-2">
                                                                {inv.status !== 'PAID' && inv.status !== 'CANCELLED' ? (
                                                                    <PermissionGate permission="finance:create">
                                                                        <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openPayDialog(inv.id)}>
                                                                            <CreditCard className="mr-1 h-3 w-3" />Pay
                                                                        </Button>
                                                                    </PermissionGate>
                                                                ) : inv.status === 'PAID' ? (
                                                                    <span className="inline-flex items-center gap-1 text-xs text-emerald-600"><Check className="h-3 w-3" />Paid</span>
                                                                ) : null}
                                                            </td>
                                                        </tr>
                                                    )
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <p className="text-center py-8 text-muted-foreground italic">No fee voucher records found for this session.</p>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Pay Fee Dialog (reusable) */}
            <PayFeeDialog
                open={payDialogOpen}
                onOpenChange={setPayDialogOpen}
                invoices={invoices}
                preSelectedInvoiceId={payPreSelectedInvoiceId}
                studentName={student ? `${student.firstName} ${student.lastName}` : undefined}
                onSuccess={refreshInvoices}
            />
        </ProtectedRoute>
    )
}
