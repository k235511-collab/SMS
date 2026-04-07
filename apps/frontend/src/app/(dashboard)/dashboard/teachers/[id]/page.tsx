'use client'

import { useEffect, useState, use } from 'react'
import { ProtectedRoute } from '@/components/auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { api } from '@/lib/api-client'
import {
    ArrowLeft, Phone, MapPin, Calendar, User, GraduationCap,
    Briefcase, Heart, Shield, BookOpen, DollarSign, Clock, FileText, Users,
    ClipboardCheck, TrendingUp, Award
} from 'lucide-react'
import Link from 'next/link'
import { Skeleton } from '@/components/ui/skeleton'
import { PageLoader } from '@/components/ui/page-loader'
import { useSession } from '@/context/session-context'
import { cn } from '@/lib/utils'

interface TeacherDetails {
    id: string
    employeeId: string
    firstName: string
    lastName: string
    qualification?: string
    specialization?: string
    joinDate?: string
    isActive: boolean
    salary?: number
    cnic?: string
    maritalStatus?: string
    fatherHusbandName?: string
    fatherHusbandCnic?: string
    qualificationAtAppt?: string
    department?: string
    experience?: string
    gender?: string
    dateOfBirth?: string
    phone?: string
    bloodGroup?: string
    religion?: string
    designation?: string
    address?: string
    note?: string
    photo?: string
    user?: { id: string; email: string; firstName: string; lastName: string }
}

interface ExamAssignment {
    id: string
    role: string
    exam: {
        id: string
        name: string
        type: string
        status: string
        startDate?: string
        endDate?: string
        class: { name: string }
        section: { name: string }
        subject: { name: string }
    }
}

export default function TeacherDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const { selectedYear } = useSession()
    const [teacher, setTeacher] = useState<TeacherDetails | null>(null)
    const [examAssignments, setExamAssignments] = useState<ExamAssignment[]>([])
    const [loading, setLoading] = useState(true)
    const [examsLoading, setExamsLoading] = useState(false)

    useEffect(() => {
        const fetchTeacher = async () => {
            const res = await api.get<TeacherDetails>(`/teachers/${id}`)
            if (res.success && res.data) {
                setTeacher(res.data)
            }
            setLoading(false)
        }
        fetchTeacher()
    }, [id])

    useEffect(() => {
        if (!id || !selectedYear) return
        const fetchExamAssignments = async () => {
            setExamsLoading(true)
            const res = await api.get<ExamAssignment[]>(`/exams/teacher/${id}`)
            if (res.success && res.data) {
                setExamAssignments(res.data)
            }
            setExamsLoading(false)
        }
        fetchExamAssignments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [id, selectedYear?.id])

    if (loading) {
        return <PageLoader message="Loading teacher profile..." />
    }

    if (!teacher) {
        return (
            <div className="flex flex-col items-center justify-center py-12">
                <h2 className="text-xl font-semibold">Teacher not found</h2>
                <Link href="/dashboard/teachers">
                    <Button variant="link">Back to list</Button>
                </Link>
            </div>
        )
    }

    return (
        <ProtectedRoute permission="teachers:read">
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/teachers">
                        <Button variant="ghost" size="icon">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div className="flex-1">
                        <h1 className="text-2xl font-bold">{teacher.firstName} {teacher.lastName}</h1>
                        <p className="text-sm text-muted-foreground">Employee ID: {teacher.employeeId}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        {teacher.designation && (
                            <Badge variant="outline" className="h-7 px-3 font-normal border-primary-100 bg-primary-50 text-primary-600">
                                {teacher.designation}
                            </Badge>
                        )}
                        <Badge variant={teacher.isActive ? 'default' : 'secondary'}>
                            {teacher.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                    </div>
                </div>

                <Tabs defaultValue="overview" className="w-full">
                    <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent gap-6">
                        <TabsTrigger value="overview" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 pb-2 h-10 shadow-none">Overview</TabsTrigger>
                        <TabsTrigger value="exams" className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 pb-2 h-10 shadow-none">Exam Duties</TabsTrigger>
                    </TabsList>

                    <TabsContent value="overview" className="py-6 space-y-6">
                        {/* Profile Cards */}
                        <div className="grid gap-6 md:grid-cols-3">
                            {/* Personal Information */}
                            <Card>
                                <CardHeader><CardTitle className="text-lg">Personal Information</CardTitle></CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <User className="h-4 w-4 text-muted-foreground" />
                                        <div>
                                            <p className="text-xs font-medium text-muted-foreground">Full Name</p>
                                            <p className="text-sm">{teacher.firstName} {teacher.lastName}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Users className="h-4 w-4 text-muted-foreground" />
                                        <div>
                                            <p className="text-xs font-medium text-muted-foreground">Father / Husband Name</p>
                                            <p className="text-sm">{teacher.fatherHusbandName || '—'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Shield className="h-4 w-4 text-muted-foreground" />
                                        <div>
                                            <p className="text-xs font-medium text-muted-foreground">CNIC</p>
                                            <p className="text-sm">{teacher.cnic || '—'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Shield className="h-4 w-4 text-muted-foreground" />
                                        <div>
                                            <p className="text-xs font-medium text-muted-foreground">Father/Husband CNIC</p>
                                            <p className="text-sm">{teacher.fatherHusbandCnic || '—'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <User className="h-4 w-4 text-muted-foreground" />
                                        <div>
                                            <p className="text-xs font-medium text-muted-foreground">Gender</p>
                                            <p className="text-sm">{teacher.gender || '—'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Calendar className="h-4 w-4 text-muted-foreground" />
                                        <div>
                                            <p className="text-xs font-medium text-muted-foreground">Date of Birth</p>
                                            <p className="text-sm">{teacher.dateOfBirth ? new Date(teacher.dateOfBirth).toLocaleDateString() : '—'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <User className="h-4 w-4 text-muted-foreground" />
                                        <div>
                                            <p className="text-xs font-medium text-muted-foreground">Marital Status</p>
                                            <p className="text-sm">{teacher.maritalStatus || '—'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <Heart className="h-4 w-4 text-muted-foreground" />
                                        <div>
                                            <p className="text-xs font-medium text-muted-foreground">Blood Group</p>
                                            <p className="text-sm">{teacher.bloodGroup || '—'}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <BookOpen className="h-4 w-4 text-muted-foreground" />
                                        <div>
                                            <p className="text-xs font-medium text-muted-foreground">Religion</p>
                                            <p className="text-sm">{teacher.religion || '—'}</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Employment & Qualifications */}
                            <Card className="md:col-span-2">
                                <CardHeader><CardTitle className="text-lg">Employment & Qualifications</CardTitle></CardHeader>
                                <CardContent className="grid gap-6 md:grid-cols-2">
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3">
                                            <Briefcase className="h-4 w-4 text-muted-foreground" />
                                            <div>
                                                <p className="text-xs font-medium text-muted-foreground">Designation</p>
                                                <p className="text-sm">{teacher.designation || '—'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Users className="h-4 w-4 text-muted-foreground" />
                                            <div>
                                                <p className="text-xs font-medium text-muted-foreground">Department</p>
                                                <p className="text-sm">{teacher.department || '—'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                                            <div>
                                                <p className="text-xs font-medium text-muted-foreground">Salary</p>
                                                <p className="text-sm">{teacher.salary != null ? `Rs. ${teacher.salary.toLocaleString()}` : '—'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Calendar className="h-4 w-4 text-muted-foreground" />
                                            <div>
                                                <p className="text-xs font-medium text-muted-foreground">Join Date</p>
                                                <p className="text-sm">{teacher.joinDate ? new Date(teacher.joinDate).toLocaleDateString() : '—'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <Clock className="h-4 w-4 text-muted-foreground" />
                                            <div>
                                                <p className="text-xs font-medium text-muted-foreground">Experience</p>
                                                <p className="text-sm">{teacher.experience || '—'}</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex items-center gap-3">
                                            <GraduationCap className="h-4 w-4 text-muted-foreground" />
                                            <div>
                                                <p className="text-xs font-medium text-muted-foreground">Qualification</p>
                                                <p className="text-sm">{teacher.qualification || '—'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <GraduationCap className="h-4 w-4 text-muted-foreground" />
                                            <div>
                                                <p className="text-xs font-medium text-muted-foreground">Qualification at Appointment</p>
                                                <p className="text-sm">{teacher.qualificationAtAppt || '—'}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <BookOpen className="h-4 w-4 text-muted-foreground" />
                                            <div>
                                                <p className="text-xs font-medium text-muted-foreground">Specialization / Subject</p>
                                                <p className="text-sm">{teacher.specialization || '—'}</p>
                                            </div>
                                        </div>
                                        {teacher.user?.email && (
                                            <div className="flex items-center gap-3">
                                                <FileText className="h-4 w-4 text-muted-foreground" />
                                                <div>
                                                    <p className="text-xs font-medium text-muted-foreground">Login Email</p>
                                                    <p className="text-sm">{teacher.user.email}</p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Contact Information */}
                        <Card>
                            <CardHeader><CardTitle className="text-lg">Contact Information</CardTitle></CardHeader>
                            <CardContent className="grid gap-6 md:grid-cols-3">
                                <div className="flex items-center gap-3">
                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                    <div>
                                        <p className="text-xs font-medium text-muted-foreground">Phone / WhatsApp</p>
                                        <p className="text-sm">{teacher.phone || '—'}</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <MapPin className="h-4 w-4 mt-1 text-muted-foreground" />
                                    <div>
                                        <p className="text-xs font-medium text-muted-foreground">Address</p>
                                        <p className="text-sm leading-relaxed">{teacher.address || 'No address provided'}</p>
                                    </div>
                                </div>
                                {teacher.note && (
                                    <div className="flex items-start gap-3">
                                        <FileText className="h-4 w-4 mt-1 text-muted-foreground" />
                                        <div>
                                            <p className="text-xs font-medium text-muted-foreground">Note</p>
                                            <p className="text-sm leading-relaxed">{teacher.note}</p>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="exams" className="py-6 space-y-6">
                        {/* Summary Cards */}
                        <div className="grid gap-4 md:grid-cols-4">
                            <Card>
                                <CardContent className="pt-4">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                                            <ClipboardCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                                        </div>
                                        <div>
                                            <p className="text-2xl font-bold">{examAssignments.length}</p>
                                            <p className="text-xs text-muted-foreground">Total Duties</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="pt-4">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                                            <Award className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                        </div>
                                        <div>
                                            <p className="text-2xl font-bold">{examAssignments.filter(e => e.role === 'INVIGILATOR').length}</p>
                                            <p className="text-xs text-muted-foreground">As Invigilator</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="pt-4">
                                    <div className="flex items-center gap-2">
                                        <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/30">
                                            <Award className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                        </div>
                                        <div>
                                            <p className="text-2xl font-bold">{examAssignments.filter(e => e.role === 'SUPERVISOR').length}</p>
                                            <p className="text-xs text-muted-foreground">As Supervisor</p>
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
                                            <p className="text-2xl font-bold">{examAssignments.filter(e => e.role === 'EXAMINER').length}</p>
                                            <p className="text-xs text-muted-foreground">As Examiner</p>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-lg">Assigned Exams</CardTitle>
                                <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                {examsLoading ? (
                                    <div className="space-y-3">
                                        <Skeleton className="h-10 w-full" />
                                        <Skeleton className="h-10 w-full" />
                                        <Skeleton className="h-10 w-full" />
                                    </div>
                                ) : examAssignments.length > 0 ? (
                                    <div className="relative w-full overflow-auto">
                                        <table className="w-full text-sm">
                                            <thead>
                                                <tr className="border-b text-muted-foreground">
                                                    <th className="h-10 px-2 text-left font-medium">Exam</th>
                                                    <th className="h-10 px-2 text-left font-medium">Class / Section</th>
                                                    <th className="h-10 px-2 text-left font-medium">Subject</th>
                                                    <th className="h-10 px-2 text-left font-medium">Role</th>
                                                    <th className="h-10 px-2 text-left font-medium">Status</th>
                                                    <th className="h-10 px-2 text-left font-medium">Date</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {examAssignments.map((assignment) => (
                                                    <tr key={assignment.id} className="border-b hover:bg-muted/50 transition-colors">
                                                        <td className="p-2">
                                                            <Link href={`/dashboard/exams/${assignment.exam.id}`} className="font-medium hover:underline">
                                                                {assignment.exam.name}
                                                            </Link>
                                                        </td>
                                                        <td className="p-2">{assignment.exam.class?.name} - {assignment.exam.section?.name}</td>
                                                        <td className="p-2">{assignment.exam.subject?.name}</td>
                                                        <td className="p-2">
                                                            <Badge variant="outline" className={cn(
                                                                assignment.role === 'INVIGILATOR' && 'bg-amber-100 text-amber-700 border-amber-200',
                                                                assignment.role === 'SUPERVISOR' && 'bg-purple-100 text-purple-700 border-purple-200',
                                                                assignment.role === 'EXAMINER' && 'bg-emerald-100 text-emerald-700 border-emerald-200'
                                                            )}>
                                                                {assignment.role}
                                                            </Badge>
                                                        </td>
                                                        <td className="p-2">
                                                            <Badge variant="outline" className={cn(
                                                                assignment.exam.status === 'COMPLETED' && 'bg-emerald-100 text-emerald-700 border-emerald-200',
                                                                assignment.exam.status === 'ONGOING' && 'bg-blue-100 text-blue-700 border-blue-200',
                                                                assignment.exam.status === 'SCHEDULED' && 'bg-amber-100 text-amber-700 border-amber-200',
                                                                assignment.exam.status === 'DRAFT' && 'bg-slate-100 text-slate-700 border-slate-200'
                                                            )}>
                                                                {assignment.exam.status}
                                                            </Badge>
                                                        </td>
                                                        <td className="p-2 text-muted-foreground">
                                                            {assignment.exam.startDate ? new Date(assignment.exam.startDate).toLocaleDateString() : '—'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <p className="text-center py-8 text-muted-foreground italic">No exam duties assigned for this session.</p>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </ProtectedRoute>
    )
}
