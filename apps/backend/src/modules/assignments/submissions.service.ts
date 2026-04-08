import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { CreateSubmissionDto, GradeSubmissionDto } from './dto'
import { TeacherScopeService } from '../teachers/teacher-scope.service'

@Injectable()
export class SubmissionsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly teacherScope: TeacherScopeService,
    ) { }

    private async validateTeacherAssignmentAccess(teacherId: string, schoolId: string, assignmentId: string) {
        const assignment = await this.prisma.assignment.findFirst({
            where: { id: assignmentId, schoolId },
            select: { id: true, classId: true, subjectId: true },
        })

        if (!assignment) {
            throw new NotFoundException(`Assignment "${assignmentId}" not found`)
        }

        await this.teacherScope.validateFullAccess(teacherId, schoolId, {
            classId: assignment.classId,
            subjectId: assignment.subjectId,
        })

        return assignment
    }

    async submit(schoolId: string, dto: CreateSubmissionDto) {
        return this.prisma.submission.create({
            data: { ...dto, status: 'SUBMITTED', schoolId },
            include: { student: true, assignment: true },
        })
    }

    async grade(id: string, schoolId: string, dto: GradeSubmissionDto, teacherId?: string | null) {
        const submission = await this.prisma.submission.findFirst({
            where: { id, schoolId },
            select: { id: true, assignmentId: true },
        })
        if (!submission) throw new NotFoundException(`Submission "${id}" not found`)

        if (teacherId) {
            await this.validateTeacherAssignmentAccess(teacherId, schoolId, submission.assignmentId)
        }

        return this.prisma.submission.update({
            where: { id },
            data: { marks: dto.marks, grade: dto.grade, feedback: dto.feedback, status: 'GRADED', gradedAt: new Date() },
            include: { student: true, assignment: true },
        })
    }

    async findByAssignment(assignmentId: string, schoolId: string, teacherId?: string | null) {
        if (teacherId) {
            await this.validateTeacherAssignmentAccess(teacherId, schoolId, assignmentId)
        }

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
