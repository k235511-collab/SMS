import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { CreateGradeDto, UpdateGradeDto } from './dto'

@Injectable()
export class GradesService {
    constructor(private readonly prisma: PrismaService) { }

    async create(schoolId: string, dto: CreateGradeDto) {
        return this.prisma.gradeRecord.create({
            data: { ...dto, schoolId },
            include: { student: true, subject: true },
        })
    }

    async findAll(schoolId: string, query: { studentId?: string; subjectId?: string; academicYearId?: string; page?: number; pageSize?: number }) {
        const where: any = { schoolId }
        if (query.studentId) where.studentId = query.studentId
        if (query.subjectId) where.subjectId = query.subjectId
        if (query.academicYearId) where.academicYearId = query.academicYearId

        const page = query.page ?? 1
        const pageSize = query.pageSize ?? 20

        const [data, total] = await this.prisma.$transaction([
            this.prisma.gradeRecord.findMany({
                where,
                include: { student: true, subject: true, academicYear: true },
                skip: (page - 1) * pageSize,
                take: pageSize,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.gradeRecord.count({ where }),
        ])

        return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
    }

    async findById(id: string, schoolId: string) {
        const grade = await this.prisma.gradeRecord.findFirst({
            where: { id, schoolId },
            include: { student: true, subject: true, academicYear: true },
        })
        if (!grade) throw new NotFoundException(`Grade record "${id}" not found`)
        return grade
    }

    async update(id: string, schoolId: string, dto: UpdateGradeDto) {
        await this.findById(id, schoolId)
        return this.prisma.gradeRecord.update({ where: { id }, data: dto, include: { student: true, subject: true } })
    }

    async remove(id: string, schoolId: string) {
        await this.findById(id, schoolId)
        return this.prisma.gradeRecord.delete({ where: { id } })
    }

    async getStudentGradeSummary(studentId: string, schoolId: string) {
        const grades = await this.prisma.gradeRecord.findMany({
            where: { studentId, schoolId },
            include: { subject: true },
        })

        const subjects = [...new Set(grades.map(g => g.subjectId))]
        const summary = subjects.map(subjectId => {
            const subjectGrades = grades.filter(g => g.subjectId === subjectId)
            const totalWeight = subjectGrades.reduce((sum, g) => sum + g.weight, 0)
            const weightedScore = subjectGrades.reduce((sum, g) => sum + (g.score / g.maxScore) * g.weight, 0)
            const percentage = totalWeight > 0 ? (weightedScore / totalWeight) * 100 : 0

            return {
                subjectId,
                subjectName: subjectGrades[0]?.subject?.name ?? 'Unknown',
                totalGrades: subjectGrades.length,
                averagePercentage: Math.round(percentage * 100) / 100,
            }
        })

        const overallAvg = summary.length > 0
            ? summary.reduce((sum, s) => sum + s.averagePercentage, 0) / summary.length
            : 0

        return { studentId, subjects: summary, overallAverage: Math.round(overallAvg * 100) / 100 }
    }
}
