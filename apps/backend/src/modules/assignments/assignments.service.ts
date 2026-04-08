import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { TeacherScopeService } from '../teachers/teacher-scope.service'
import { CreateAssignmentDto, UpdateAssignmentDto } from './dto'

@Injectable()
export class AssignmentsService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly teacherScope: TeacherScopeService,
    ) { }

    private async getTeacherScope(teacherId: string, schoolId: string) {
        return this.teacherScope.getScope(teacherId, schoolId)
    }

    private async getTeacherAssignmentAccessConditions(teacherId: string, schoolId: string) {
        return this.teacherScope.getAssignmentAccessConditions(teacherId, schoolId)
    }

    async create(schoolId: string, dto: CreateAssignmentDto, teacherId?: string | null) {
        if (teacherId) {
            // Prevent spoofing: always use JWT teacherId, ignore dto.teacherId
            dto.teacherId = teacherId
            await this.teacherScope.validateFullAccess(teacherId, schoolId, {
                classId: dto.classId,
                subjectId: dto.subjectId,
            })
        }
        return this.prisma.assignment.create({
            data: { ...dto, dueDate: new Date(dto.dueDate), schoolId },
            include: { class: true, subject: true, teacher: true },
        })
    }

    async findAll(schoolId: string, query: { classId?: string; subjectId?: string; page?: number; pageSize?: number }, campusId?: string, teacherId?: string | null) {
        const where: any = { schoolId }

        if (teacherId) {
            const conditions = await this.getTeacherAssignmentAccessConditions(teacherId, schoolId)
            if (conditions.length === 0) {
                return { data: [], total: 0, page: query.page ?? 1, pageSize: query.pageSize ?? 20, totalPages: 0 }
            }
            where.AND = [{ OR: conditions }]
        }

        if (query.classId) {
            where.AND = [...(where.AND || []), { classId: query.classId }]
        }
        if (query.subjectId) {
            where.AND = [...(where.AND || []), { subjectId: query.subjectId }]
        }
        if (campusId) where.class = { ...where.class, campusId }

        const page = query.page ?? 1
        const pageSize = query.pageSize ?? 20

        const [data, total] = await this.prisma.$transaction([
            this.prisma.assignment.findMany({
                where,
                include: { class: true, subject: true, teacher: true, _count: { select: { submissions: true } } },
                skip: (page - 1) * pageSize,
                take: pageSize,
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.assignment.count({ where }),
        ])

        return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
    }

    async findById(id: string, schoolId: string, teacherId?: string | null) {
        const assignment = await this.prisma.assignment.findFirst({
            where: { id, schoolId },
            include: { class: true, subject: true, teacher: true, submissions: { include: { student: true } } },
        })
        if (!assignment) throw new NotFoundException(`Assignment "${id}" not found`)

        if (teacherId) {
            await this.teacherScope.validateFullAccess(teacherId, schoolId, {
                classId: assignment.classId,
                subjectId: assignment.subjectId,
            })
        }

        return assignment
    }

    async update(id: string, schoolId: string, dto: UpdateAssignmentDto, teacherId?: string | null) {
        const assignment = await this.findById(id, schoolId, teacherId)

        // Teacher scope: can only update their own assignments
        if (teacherId) {
            if (assignment.teacherId && assignment.teacherId !== teacherId) {
                throw new ForbiddenException('You can only update your own assignments')
            }
            await this.teacherScope.validateFullAccess(teacherId, schoolId, {
                classId: assignment.classId,
                subjectId: assignment.subjectId,
            })
        }

        const data: any = { ...dto }
        if (dto.dueDate) data.dueDate = new Date(dto.dueDate)
        return this.prisma.assignment.update({ where: { id }, data, include: { class: true, subject: true } })
    }

    async remove(id: string, schoolId: string, teacherId?: string | null) {
        const assignment = await this.findById(id, schoolId, teacherId)

        // Teacher scope: can only delete their own assignments + validate scope
        if (teacherId) {
            if (assignment.teacherId && assignment.teacherId !== teacherId) {
                throw new ForbiddenException('You can only delete your own assignments')
            }
            await this.teacherScope.validateFullAccess(teacherId, schoolId, {
                classId: assignment.classId,
                subjectId: assignment.subjectId,
            })
        }

        return this.prisma.assignment.delete({ where: { id } })
    }
}
