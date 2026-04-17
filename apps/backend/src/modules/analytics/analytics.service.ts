import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class AnalyticsService {
    constructor(private readonly prisma: PrismaService) { }

    /**
     * Comprehensive dashboard overview — single API call for all dashboard widgets.
     */
    async getDashboardOverview(schoolId: string, startDate?: string, endDate?: string, campusId?: string, academicYearId?: string) {
        // Use UTC dates — Prisma @db.Date stores UTC midnight; local midnight causes off-by-one in non-UTC timezones
        const now = new Date()
        const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
        const tomorrow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1))

        const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))

        // Use academic year range if provided, otherwise fall back to current academic year from DB
        let yearStart: Date
        let yearEnd: Date | undefined

        // Resolve the academic year: prefer explicit ID, then match by date range, then isCurrent
        let resolvedAcademicYear: { id: string; startDate: Date; endDate: Date } | null = null
        if (academicYearId) {
            resolvedAcademicYear = await this.prisma.academicYear.findFirst({
                where: { id: academicYearId, schoolId },
                select: { id: true, startDate: true, endDate: true },
            })
        }
        if (!resolvedAcademicYear && startDate && endDate) {
            resolvedAcademicYear = await this.prisma.academicYear.findFirst({
                where: { schoolId, startDate: new Date(startDate), endDate: new Date(endDate) },
                select: { id: true, startDate: true, endDate: true },
            })
        }
        if (!resolvedAcademicYear) {
            resolvedAcademicYear = await this.prisma.academicYear.findFirst({
                where: { schoolId, isCurrent: true },
                select: { id: true, startDate: true, endDate: true },
            })
        }

        // Determine academic year range for fee collection
        if (startDate && endDate) {
            // Client passed explicit academic year range
            yearStart = new Date(startDate)
            yearEnd = new Date(endDate)
            yearEnd.setHours(23, 59, 59, 999)
        } else if (resolvedAcademicYear) {
            // Use resolved academic year's dates from DB
            yearStart = new Date(resolvedAcademicYear.startDate)
            yearEnd = new Date(resolvedAcademicYear.endDate)
            yearEnd.setHours(23, 59, 59, 999)
        } else {
            // Fallback to calendar year
            yearStart = new Date(Date.UTC(now.getUTCFullYear(), 0, 1))
        }

        const studentWhere: any = resolvedAcademicYear
            ? { schoolId, deletedAt: null, enrollments: { some: { academicYearId: resolvedAcademicYear.id } } }
            : { schoolId, deletedAt: null }
        if (campusId) studentWhere.campusId = campusId

        // Campus-scoped where helpers
        const campusPaymentFilter = campusId ? { student: { campusId } } : {}
        const campusInvoiceFilter = campusId ? { student: { campusId } } : {}
        const teacherWhere: any = { schoolId, isActive: true }
        if (campusId) teacherWhere.campusId = campusId
        const classWhere: any = { schoolId, deletedAt: null }
        if (campusId) classWhere.campusId = campusId

        // For subjects, we need to filter by campus through the class relation
        // First get class IDs for this campus, then filter subjects
        let campusClassIds: string[] = []
        let hasNoClassesInCampus = false
        if (campusId) {
            const campusClasses = await this.prisma.class.findMany({
                where: { schoolId, campusId, deletedAt: null },
                select: { id: true }
            })
            campusClassIds = campusClasses.map((c: any) => c.id)
            hasNoClassesInCampus = campusClassIds.length === 0
        }

        const subjectWhere: any = {
            schoolId,
            deletedAt: null,
        }
        if (campusId) {
            if (hasNoClassesInCampus) {
                // No classes in this campus means no subjects can exist
                // Use impossible condition to return 0
                subjectWhere.id = 'no-match'
            } else {
                // Only count subjects linked to classes on this campus
                subjectWhere.classId = { in: campusClassIds }
            }
        }

        const staffWhere: any = {
            schoolId,
            isActive: true,
            role: {
                slug: {
                    notIn: ['super_admin', 'parent', 'student', 'teacher'],
                },
            },
        }
        if (campusId) staffWhere.campusId = campusId
        const attendanceWhere: any = { schoolId, date: { gte: today, lt: tomorrow } }
        if (campusId) attendanceWhere.section = { class: { campusId } }
        const eventWhere: any = { schoolId, startDate: { gte: today } }
        if (campusId) eventWhere.campusId = campusId

        const [
            // ── People counts ──
            totalStudents,
            activeStudents,
            inactiveStudents,
            totalTeachers,
            totalStaff,
            totalClasses,
            totalSubjects,
            totalAcademicYears,
            totalCampuses,
            // ── Fee collection (payments received) ──
            todayCollection,
            monthlyCollection,
            yearlyCollection,
            // ── Pending fee (unpaid invoice balances) ──
            pendingFeeAll,
            // ── Arrears (previous year unpaid invoices) ──
            arrearsAll,
            // ── All classes with sections ──
            allClasses,
            // ── Today's attendance records ──
            todayAttendance,
            // ── Upcoming events ──
            upcomingEvents,
        ] = await Promise.all([
            // People
            this.prisma.student.count({ where: studentWhere }),
            this.prisma.student.count({ where: { ...studentWhere, status: 'ACTIVE' } }),
            this.prisma.student.count({ where: { ...studentWhere, status: 'INACTIVE' } }),
            this.prisma.teacher.count({ where: teacherWhere }),
            this.prisma.user.count({ where: staffWhere }),
            this.prisma.class.count({ where: classWhere }),
            this.prisma.subject.count({ where: subjectWhere }),
            this.prisma.academicYear.count({ where: { schoolId } }),
            this.prisma.campus.count({ where: { schoolId } }),
            // Fee collection periods (actual payments received for the selected context)
            this.prisma.feePayment.aggregate({
                where: {
                    schoolId,
                    paidAt: { gte: today, lt: tomorrow },
                    ...(resolvedAcademicYear ? { invoice: { academicYearId: resolvedAcademicYear.id } } : {}),
                    ...campusPaymentFilter
                },
                _sum: { amount: true },
            }),
            this.prisma.feePayment.aggregate({
                where: {
                    schoolId,
                    paidAt: { gte: monthStart },
                    ...(resolvedAcademicYear ? { invoice: { academicYearId: resolvedAcademicYear.id } } : {}),
                    ...campusPaymentFilter
                },
                _sum: { amount: true },
            }),
            this.prisma.feePayment.aggregate({
                where: {
                    schoolId,
                    ...(resolvedAcademicYear
                        ? { invoice: { academicYearId: resolvedAcademicYear.id } }
                        : { paidAt: { gte: yearStart, ...(yearEnd ? { lte: yearEnd } : {}) } }),
                    ...campusPaymentFilter
                },
                _sum: { amount: true },
            }),
            // Pending fee: sum of (totalAmount - paidAmount) for all unpaid/partial/overdue invoices in current academic year
            this.prisma.invoice.aggregate({
                where: {
                    schoolId,
                    status: { in: ['UNPAID', 'PARTIAL', 'OVERDUE'] },
                    ...(resolvedAcademicYear
                        ? { academicYearId: resolvedAcademicYear.id }
                        : { dueDate: { gte: yearStart, ...(yearEnd ? { lte: yearEnd } : {}) } }),
                    ...campusInvoiceFilter,
                },
                _sum: { totalAmount: true, paidAmount: true },
            }),
            // Arrears: unpaid invoices from previous academic years (not current year)
            this.prisma.invoice.aggregate({
                where: {
                    schoolId,
                    status: { in: ['UNPAID', 'PARTIAL', 'OVERDUE'] },
                    ...(resolvedAcademicYear
                        ? { NOT: { academicYearId: resolvedAcademicYear.id } }
                        : { dueDate: { lt: yearStart } }),
                    ...campusInvoiceFilter,
                },
                _sum: { totalAmount: true, paidAmount: true },
            }),
            // All active classes with their sections (so every class/section shows even with 0 attendance)
            this.prisma.class.findMany({
                where: classWhere,
                select: {
                    id: true,
                    name: true,
                    sortOrder: true,
                    sections: {
                        where: { deletedAt: null },
                        select: { id: true, name: true },
                        orderBy: { name: 'asc' },
                    },
                },
                orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
            }),
            // Today's attendance records
            this.prisma.attendance.findMany({
                where: attendanceWhere,
                select: {
                    status: true,
                    sectionId: true,
                },
            }),
            // Upcoming events
            this.prisma.calendarEvent.findMany({
                where: eventWhere,
                orderBy: { startDate: 'asc' },
                take: 5,
                select: { id: true, title: true, startDate: true, endDate: true, type: true },
            }),
        ])

        // ── Build attendance map by sectionId for quick lookup ──
        const sectionAttendance: Record<string, { present: number; absent: number; late: number; leave: number }> = {}
        let totalPresent = 0, totalAbsent = 0, totalLate = 0, totalLeave = 0

        todayAttendance.forEach((att: any) => {
            const secKey = att.sectionId ?? 'unassigned'
            if (!sectionAttendance[secKey]) {
                sectionAttendance[secKey] = { present: 0, absent: 0, late: 0, leave: 0 }
            }
            const entry = sectionAttendance[secKey]
            switch (att.status) {
                case 'PRESENT': entry.present++; totalPresent++; break
                case 'ABSENT': entry.absent++; totalAbsent++; break
                case 'LATE': entry.late++; totalLate++; break
                case 'EXCUSED': case 'HALF_DAY': entry.leave++; totalLeave++; break
            }
        })

        // ── Build full class → sections structure with attendance merged in ──
        const attendanceByClass = allClasses.map((cls: any) => {
            const sections = cls.sections.map((sec: any) => {
                const att = sectionAttendance[sec.id] ?? { present: 0, absent: 0, late: 0, leave: 0 }
                return { sectionName: sec.name, ...att }
            })
            // Class-level totals = sum of all its sections
            const classTotals = sections.reduce(
                (acc: any, s: any) => ({
                    present: acc.present + s.present,
                    absent: acc.absent + s.absent,
                    late: acc.late + s.late,
                    leave: acc.leave + s.leave,
                }),
                { present: 0, absent: 0, late: 0, leave: 0 },
            )
            return { className: cls.name, ...classTotals, sections }
        })

        // ── Pending fee total ──
        const pendingTotal = (pendingFeeAll._sum?.totalAmount ?? 0) - (pendingFeeAll._sum?.paidAmount ?? 0)
        // ── Arrears total (previous year unpaid) ──
        const arrearsTotal = (arrearsAll._sum?.totalAmount ?? 0) - (arrearsAll._sum?.paidAmount ?? 0)
        const yearlyReceived = yearlyCollection._sum?.amount ?? 0
        const yearlyInvoiced = (pendingFeeAll._sum?.totalAmount ?? 0) + (yearlyReceived > 0 ? yearlyReceived : 0)
        const totalSections = allClasses.reduce((sum: number, cls: any) => sum + cls.sections.length, 0)

        return {
            people: {
                students: { total: totalStudents, active: activeStudents, inactive: inactiveStudents },
                teachers: totalTeachers,
                staff: totalStaff,
                classes: totalClasses,
            },
            setup: {
                academicYears: totalAcademicYears,
                campuses: totalCampuses,
                classes: totalClasses,
                sections: totalSections,
                subjects: totalSubjects,
                teachers: totalTeachers,
                students: totalStudents,
            },
            feeCollection: {
                today: todayCollection._sum?.amount ?? 0,
                monthly: monthlyCollection._sum?.amount ?? 0,
                yearly: yearlyCollection._sum?.amount ?? 0,
                pendingFee: pendingTotal,
                arrears: arrearsTotal,
            },
            attendance: {
                summary: { present: totalPresent, absent: totalAbsent, late: totalLate, leave: totalLeave },
                byClass: attendanceByClass,
            },
            upcomingEvents,
        }
    }

    async getDashboardMetrics(schoolId: string, campusId?: string) {
        const studentWhere: any = { schoolId, deletedAt: null }
        if (campusId) studentWhere.campusId = campusId
        const teacherWhere: any = { schoolId, isActive: true }
        if (campusId) teacherWhere.campusId = campusId
        const classWhere: any = { schoolId, deletedAt: null }
        if (campusId) classWhere.campusId = campusId
        const paymentWhere: any = { schoolId }
        if (campusId) paymentWhere.student = { campusId }

        const [students, teachers, classes, activeStudents, feeCollection] = await Promise.all([
            this.prisma.student.count({ where: studentWhere }),
            this.prisma.teacher.count({ where: teacherWhere }),
            this.prisma.class.count({ where: classWhere }),
            this.prisma.student.count({ where: { ...studentWhere, status: 'ACTIVE' } }),
            this.prisma.feePayment.aggregate({ where: paymentWhere, _sum: { amount: true } }),
        ])

        return {
            totalStudents: students,
            totalTeachers: teachers,
            totalClasses: classes,
            activeStudents,
            totalFeeCollected: feeCollection._sum.amount ?? 0,
        }
    }

    async getAttendanceTrend(schoolId: string, days: number = 30, campusId?: string) {
        const now = new Date()
        const startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - days))

        const attWhere: any = { schoolId, date: { gte: startDate } }
        if (campusId) attWhere.section = { class: { campusId } }

        const attendance = await this.prisma.attendance.groupBy({
            by: ['date', 'status'],
            where: attWhere,
            _count: { status: true },
            orderBy: { date: 'asc' },
        })

        const dateMap = new Map<string, Record<string, number>>()
        attendance.forEach((a: any) => {
            const dateKey = a.date.toISOString().split('T')[0]
            if (!dateMap.has(dateKey)) dateMap.set(dateKey, {})
            dateMap.get(dateKey)![a.status] = a._count.status
        })

        return Array.from(dateMap.entries()).map(([date, counts]) => ({ date, ...counts }))
    }

    async getGradeDistribution(schoolId: string, campusId?: string) {
        const gradeWhere: any = { schoolId }
        if (campusId) gradeWhere.student = { class: { campusId } }

        const grades = await this.prisma.gradeRecord.findMany({
            where: gradeWhere,
            select: { score: true, maxScore: true, subject: { select: { name: true } } },
        })

        const ranges = [
            { label: 'A (90-100%)', min: 90, max: 100, count: 0 },
            { label: 'B (80-89%)', min: 80, max: 89, count: 0 },
            { label: 'C (70-79%)', min: 70, max: 79, count: 0 },
            { label: 'D (60-69%)', min: 60, max: 69, count: 0 },
            { label: 'F (<60%)', min: 0, max: 59, count: 0 },
        ]

        grades.forEach((g: any) => {
            const pct = (g.score / g.maxScore) * 100
            const range = ranges.find(r => pct >= r.min && pct <= r.max)
            if (range) range.count++
        })

        return ranges
    }

    async getFinanceSummary(schoolId: string, campusId?: string) {
        const campusFilter = campusId ? { student: { campusId } } : {}

        const [totalInvoiced, totalPaid, recentPayments] = await Promise.all([
            this.prisma.invoice.aggregate({ where: { schoolId, ...campusFilter }, _sum: { totalAmount: true } }),
            this.prisma.feePayment.aggregate({ where: { schoolId, ...campusFilter }, _sum: { amount: true } }),
            this.prisma.feePayment.findMany({
                where: { schoolId, ...campusFilter },
                orderBy: { paidAt: 'desc' },
                take: 10,
                include: { student: { select: { firstName: true, lastName: true, rollNumber: true } } },
            }),
        ])

        return {
            totalInvoiced: totalInvoiced._sum.totalAmount ?? 0,
            totalPaid: totalPaid._sum.amount ?? 0,
            outstanding: (totalInvoiced._sum.totalAmount ?? 0) - (totalPaid._sum.amount ?? 0),
            recentPayments,
        }
    }
}
