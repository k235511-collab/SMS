import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import { UpsertStudentReportTemplateDto } from './dto'

type StudentCardTemplateSeed = {
    key: string
    name: string
    description: string
}

const STUDENT_REPORT_CARD_TEMPLATES: StudentCardTemplateSeed[] = [
    {
        key: 'foldable-classic',
        name: 'Foldable Classic Card',
        description: 'Outside panel shows student details, inside panel shows type-wise marks table.',
    },
    {
        key: 'green-ledger',
        name: 'Green Ledger Card',
        description: 'Traditional green marks ledger format similar to school paper cards.',
    },
    {
        key: 'clean-modern',
        name: 'Clean Modern Card',
        description: 'Professional clean layout with high readability for print.',
    },
]

function mapTemplateOverrides(
    rows: Array<{
        templateKey: string
        templateName: string
        description: string | null
        htmlContent: string
        updatedAt: Date
    }>,
) {
    const overrideMap = new Map(rows.map((row) => [row.templateKey, row]))

    return STUDENT_REPORT_CARD_TEMPLATES.map((seed) => {
        const override = overrideMap.get(seed.key)
        return {
            templateKey: seed.key,
            templateName: override?.templateName || seed.name,
            description: override?.description || seed.description,
            htmlContent: override?.htmlContent || null,
            isCustomized: Boolean(override),
            updatedAt: override?.updatedAt || null,
        }
    })
}

@Injectable()
export class ReportsService {
    private readonly logger = new Logger(ReportsService.name)
    constructor(private readonly prisma: PrismaService) { }

    async generateStudentReport(schoolId: string, studentId: string) {
        const student = await this.prisma.student.findFirst({
            where: { id: studentId, schoolId },
            include: {
                school: {
                    select: {
                        id: true,
                        name: true,
                        logo: true,
                        address: true,
                        phone: true,
                        email: true,
                    },
                },
                class: true,
                section: true,
                attendances: { orderBy: { date: 'desc' }, take: 30 },
                examResults: { include: { exam: true, subject: true }, orderBy: { createdAt: 'desc' } },
                gradeRecords: { include: { subject: true }, orderBy: { createdAt: 'desc' } },
            },
        })

        if (!student) return null

        const totalAttendance = student.attendances.length
        const presentCount = student.attendances.filter(a => a.status === 'PRESENT').length
        const attendancePercentage = totalAttendance > 0 ? (presentCount / totalAttendance) * 100 : 0

        return {
            school: {
                id: student.school.id,
                name: student.school.name,
                logo: student.school.logo,
                address: student.school.address,
                phone: student.school.phone,
                email: student.school.email,
            },
            student: {
                id: student.id,
                name: `${student.firstName} ${student.lastName}`,
                firstName: student.firstName,
                lastName: student.lastName,
                rollNumber: student.rollNumber,
                guardianName: student.guardianName,
                guardianPhone: student.guardianPhone,
                guardianEmail: student.guardianEmail,
                enrollmentDate: student.enrollmentDate,
            },
            class: student.class,
            section: student.section,
            attendance: { total: totalAttendance, present: presentCount, percentage: Math.round(attendancePercentage * 100) / 100 },
            examResults: student.examResults,
            grades: student.gradeRecords,
            generatedAt: new Date().toISOString(),
        }
    }

    async generateClassReport(schoolId: string, classId: string) {
        const classRecord = await this.prisma.class.findFirst({
            where: { id: classId, schoolId, deletedAt: null },
            select: {
                id: true,
                name: true,
                code: true,
                sections: {
                    where: { deletedAt: null },
                    orderBy: { name: 'asc' },
                    select: { id: true, name: true },
                },
            },
        })

        if (!classRecord) return null

        const [studentsBySection, students, attendanceStats] = await Promise.all([
            this.prisma.student.groupBy({
                by: ['sectionId'],
                where: { schoolId, classId, status: 'ACTIVE', deletedAt: null },
                _count: { _all: true },
            }),
            this.prisma.student.count({ where: { schoolId, classId, status: 'ACTIVE', deletedAt: null } }),
            this.prisma.attendance.groupBy({
                by: ['status'],
                where: { schoolId, student: { classId } },
                _count: { status: true },
            }),
        ])

        const statusCount = (status: string) =>
            attendanceStats.find((item) => item.status === status)?._count.status || 0

        const present = statusCount('PRESENT')
        const late = statusCount('LATE')
        const halfDay = statusCount('HALF_DAY')
        const totalRecords = attendanceStats.reduce((sum, item) => sum + item._count.status, 0)
        const attendanceRate = totalRecords > 0
            ? Math.round((((present + late + halfDay) / totalRecords) * 100) * 100) / 100
            : 0

        const sectionStudentMap = new Map<string, number>()
        studentsBySection.forEach((row) => {
            if (row.sectionId) sectionStudentMap.set(row.sectionId, row._count._all)
        })

        return {
            class: {
                id: classRecord.id,
                name: classRecord.name,
                code: classRecord.code,
            },
            totalStudents: students,
            sectionBreakdown: classRecord.sections.map((section) => ({
                id: section.id,
                name: section.name,
                totalStudents: sectionStudentMap.get(section.id) || 0,
            })),
            attendanceBreakdown: attendanceStats.map(a => ({ status: a.status, count: a._count.status })),
            attendanceRate,
            generatedAt: new Date().toISOString(),
        }
    }

    async generateAttendanceReport(schoolId: string, sectionId: string, startDate?: string, endDate?: string) {
        const now = new Date()
        const start = startDate ? new Date(startDate) : new Date(now.getTime() - (29 * 24 * 60 * 60 * 1000))
        const end = endDate ? new Date(endDate) : new Date(now)
        end.setHours(23, 59, 59, 999)

        const section = await this.prisma.section.findFirst({
            where: { id: sectionId, schoolId, deletedAt: null },
            select: {
                id: true,
                name: true,
                class: {
                    select: {
                        id: true,
                        name: true,
                        code: true,
                    },
                },
            },
        })

        if (!section) return null

        const [students, attendances] = await Promise.all([
            this.prisma.student.findMany({
                where: { schoolId, sectionId, status: 'ACTIVE', deletedAt: null },
                orderBy: { rollNumber: 'asc' },
                select: {
                    id: true,
                    rollNumber: true,
                    firstName: true,
                    lastName: true,
                },
            }),
            this.prisma.attendance.findMany({
                where: {
                    schoolId,
                    sectionId,
                    date: {
                        gte: start,
                        lte: end,
                    },
                },
                orderBy: { date: 'asc' },
                select: {
                    studentId: true,
                    status: true,
                },
            }),
        ])

        const summaries = new Map<string, {
            present: number
            absent: number
            late: number
            excused: number
            halfDay: number
            total: number
        }>()

        students.forEach((student) => {
            summaries.set(student.id, {
                present: 0,
                absent: 0,
                late: 0,
                excused: 0,
                halfDay: 0,
                total: 0,
            })
        })

        attendances.forEach((attendance) => {
            const current = summaries.get(attendance.studentId)
            if (!current) return

            current.total += 1
            switch (attendance.status) {
                case 'PRESENT':
                    current.present += 1
                    break
                case 'ABSENT':
                    current.absent += 1
                    break
                case 'LATE':
                    current.late += 1
                    break
                case 'EXCUSED':
                    current.excused += 1
                    break
                case 'HALF_DAY':
                    current.halfDay += 1
                    break
            }
        })

        const studentRows = students.map((student) => {
            const summary = summaries.get(student.id) || {
                present: 0,
                absent: 0,
                late: 0,
                excused: 0,
                halfDay: 0,
                total: 0,
            }
            const attendanceRate = summary.total > 0
                ? Math.round((((summary.present + summary.late + summary.halfDay) / summary.total) * 100) * 100) / 100
                : 0

            return {
                student,
                summary,
                attendanceRate,
            }
        })

        const overview = studentRows.reduce(
            (acc, row) => {
                acc.present += row.summary.present
                acc.absent += row.summary.absent
                acc.late += row.summary.late
                acc.excused += row.summary.excused
                acc.halfDay += row.summary.halfDay
                acc.total += row.summary.total
                return acc
            },
            {
                present: 0,
                absent: 0,
                late: 0,
                excused: 0,
                halfDay: 0,
                total: 0,
            },
        )

        const attendanceRate = overview.total > 0
            ? Math.round((((overview.present + overview.late + overview.halfDay) / overview.total) * 100) * 100) / 100
            : 0

        return {
            section,
            range: {
                startDate: start.toISOString(),
                endDate: end.toISOString(),
            },
            overview: {
                totalStudents: students.length,
                totalRecords: overview.total,
                present: overview.present,
                absent: overview.absent,
                late: overview.late,
                excused: overview.excused,
                halfDay: overview.halfDay,
                attendanceRate,
            },
            students: studentRows,
            generatedAt: new Date().toISOString(),
        }
    }

    async generateFinancialReport(schoolId: string, startDate?: string, endDate?: string) {
        const invoiceWhere: any = { schoolId }
        const paymentWhere: any = { schoolId, deletedAt: null }

        if (startDate || endDate) {
            invoiceWhere.dueDate = {}
            paymentWhere.paidAt = {}
            if (startDate) {
                const start = new Date(startDate)
                invoiceWhere.dueDate.gte = start
                paymentWhere.paidAt.gte = start
            }
            if (endDate) {
                const end = new Date(endDate)
                end.setHours(23, 59, 59, 999)
                invoiceWhere.dueDate.lte = end
                paymentWhere.paidAt.lte = end
            }
        }

        const [invoiceTotals, paymentTotals, invoiceStatusBreakdown, paymentMethodBreakdown, recentPayments] = await Promise.all([
            this.prisma.invoice.aggregate({
                where: invoiceWhere,
                _sum: { totalAmount: true, paidAmount: true },
                _count: { _all: true },
            }),
            this.prisma.feePayment.aggregate({
                where: paymentWhere,
                _sum: { amount: true },
                _count: { _all: true },
            }),
            this.prisma.invoice.groupBy({
                by: ['status'],
                where: invoiceWhere,
                _sum: { totalAmount: true, paidAmount: true },
                _count: { status: true },
            }),
            this.prisma.feePayment.groupBy({
                by: ['method'],
                where: paymentWhere,
                _sum: { amount: true },
                _count: { method: true },
            }),
            this.prisma.feePayment.findMany({
                where: paymentWhere,
                orderBy: { paidAt: 'desc' },
                take: 12,
                select: {
                    id: true,
                    amount: true,
                    method: true,
                    referenceNo: true,
                    paidAt: true,
                    student: {
                        select: {
                            id: true,
                            rollNumber: true,
                            firstName: true,
                            lastName: true,
                        },
                    },
                    invoice: {
                        select: {
                            id: true,
                            invoiceNo: true,
                            status: true,
                            totalAmount: true,
                            paidAmount: true,
                        },
                    },
                },
            }),
        ])

        const totalInvoiced = invoiceTotals._sum.totalAmount ?? 0
        const totalPaid = paymentTotals._sum.amount ?? 0
        const outstanding = Math.max(0, totalInvoiced - totalPaid)
        const collectionRate = totalInvoiced > 0 ? Math.round(((totalPaid / totalInvoiced) * 100) * 100) / 100 : 0

        return {
            period: {
                startDate: startDate || null,
                endDate: endDate || null,
            },
            totals: {
                totalInvoices: invoiceTotals._count._all,
                totalPayments: paymentTotals._count._all,
                totalInvoiced,
                totalPaid,
                outstanding,
                collectionRate,
            },
            invoiceStatusBreakdown: invoiceStatusBreakdown.map((item) => ({
                status: item.status,
                count: item._count.status,
                totalAmount: item._sum.totalAmount ?? 0,
                paidAmount: item._sum.paidAmount ?? 0,
            })),
            paymentMethodBreakdown: paymentMethodBreakdown.map((item) => ({
                method: item.method,
                count: item._count.method,
                amount: item._sum.amount ?? 0,
            })),
            recentPayments,
            generatedAt: new Date().toISOString(),
        }
    }

    async getStudentCardTemplates(schoolId: string) {
        try {
            const rows = await this.prisma.reportCardTemplate.findMany({
                where: { schoolId },
                orderBy: { updatedAt: 'desc' },
            })

            return mapTemplateOverrides(rows)
        } catch (error) {
            // If migration has not been applied yet, fall back to static defaults instead of failing page load.
            if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === 'P2021' || error.code === 'P2022')) {
                this.logger.warn('report_card_templates table is unavailable. Returning default templates only.')
                return mapTemplateOverrides([])
            }

            throw error
        }
    }

    async saveStudentCardTemplate(
        schoolId: string,
        templateKey: string,
        payload: UpsertStudentReportTemplateDto,
    ) {
        const normalizedKey = templateKey.trim().toLowerCase()
        const seed = STUDENT_REPORT_CARD_TEMPLATES.find((item) => item.key === normalizedKey)
        if (!seed) {
            throw new BadRequestException('Invalid template key')
        }

        const htmlContent = payload.htmlContent?.trim()
        if (!htmlContent) {
            throw new BadRequestException('Template HTML cannot be empty')
        }

        const templateName = payload.templateName?.trim() || seed.name
        const description = payload.description?.trim() || seed.description

        let saved
        try {
            saved = await this.prisma.reportCardTemplate.upsert({
                where: {
                    schoolId_templateKey: {
                        schoolId,
                        templateKey: normalizedKey,
                    },
                },
                update: {
                    templateName,
                    description,
                    htmlContent,
                },
                create: {
                    schoolId,
                    templateKey: normalizedKey,
                    templateName,
                    description,
                    htmlContent,
                },
            })
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === 'P2021' || error.code === 'P2022')) {
                throw new BadRequestException('Template customization is not available yet. Please apply the latest database migration.')
            }
            throw error
        }

        return {
            templateKey: saved.templateKey,
            templateName: saved.templateName,
            description: saved.description,
            htmlContent: saved.htmlContent,
            isCustomized: true,
            updatedAt: saved.updatedAt,
        }
    }

    async getAvailableReports() {
        return [
            { type: 'student', name: 'Student Report Card', description: 'Individual student progress report' },
            { type: 'class', name: 'Class Report', description: 'Class-level attendance and performance summary' },
            { type: 'attendance', name: 'Attendance Report', description: 'Detailed attendance analysis' },
            { type: 'finance', name: 'Finance Report', description: 'Fee collection and outstanding summary' },
        ]
    }
}
