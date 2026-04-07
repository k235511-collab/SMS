import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class ReportsService {
    private readonly logger = new Logger(ReportsService.name)
    constructor(private readonly prisma: PrismaService) { }

    async generateStudentReport(schoolId: string, studentId: string) {
        const student = await this.prisma.student.findFirst({
            where: { id: studentId, schoolId },
            include: {
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
            student: { id: student.id, name: `${student.firstName} ${student.lastName}`, rollNumber: student.rollNumber },
            class: student.class,
            section: student.section,
            attendance: { total: totalAttendance, present: presentCount, percentage: Math.round(attendancePercentage * 100) / 100 },
            examResults: student.examResults,
            grades: student.gradeRecords,
            generatedAt: new Date().toISOString(),
        }
    }

    async generateClassReport(schoolId: string, classId: string) {
        const [students, attendanceStats] = await Promise.all([
            this.prisma.student.count({ where: { schoolId, classId, status: 'ACTIVE' } }),
            this.prisma.attendance.groupBy({
                by: ['status'],
                where: { schoolId, student: { classId } },
                _count: { status: true },
            }),
        ])

        return {
            classId,
            totalStudents: students,
            attendanceBreakdown: attendanceStats.map(a => ({ status: a.status, count: a._count.status })),
            generatedAt: new Date().toISOString(),
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
