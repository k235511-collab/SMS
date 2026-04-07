import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { CreateSubmissionDto, GradeSubmissionDto } from './dto'

@Injectable()
export class SubmissionsService {
    constructor(private readonly prisma: PrismaService) { }

    async submit(schoolId: string, dto: CreateSubmissionDto) {
        return this.prisma.submission.create({
            data: { ...dto, status: 'SUBMITTED', schoolId },
            include: { student: true, assignment: true },
        })
    }

    async grade(id: string, schoolId: string, dto: GradeSubmissionDto) {
        const submission = await this.prisma.submission.findFirst({ where: { id, schoolId } })
        if (!submission) throw new NotFoundException(`Submission "${id}" not found`)

        return this.prisma.submission.update({
            where: { id },
            data: { marks: dto.marks, grade: dto.grade, feedback: dto.feedback, status: 'GRADED', gradedAt: new Date() },
            include: { student: true, assignment: true },
        })
    }

    async findByAssignment(assignmentId: string, schoolId: string) {
        return this.prisma.submission.findMany({
            where: { assignmentId, schoolId },
            include: { student: true },
            orderBy: { submittedAt: 'desc' },
        })
    }

    async findByStudent(studentId: string, schoolId: string) {
        return this.prisma.submission.findMany({
            where: { studentId, schoolId },
            include: { assignment: { include: { subject: true } } },
            orderBy: { submittedAt: 'desc' },
        })
    }
}
