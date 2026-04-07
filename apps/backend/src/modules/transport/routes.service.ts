import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class RoutesService {
    constructor(private readonly prisma: PrismaService) { }

    async create(schoolId: string, dto: any, campusId?: string) {
        return this.prisma.transportRoute.create({
            data: { ...dto, schoolId, campusId },
            include: { vehicle: true },
        })
    }

    async findAll(schoolId: string, campusId?: string) {
        const where: any = { schoolId }
        if (campusId) where.campusId = campusId
        return this.prisma.transportRoute.findMany({
            where,
            include: { vehicle: true, _count: { select: { transportAssignments: true } } },
            orderBy: { name: 'asc' },
        })
    }

    async findById(id: string, schoolId: string) {
        const route = await this.prisma.transportRoute.findFirst({
            where: { id, schoolId },
            include: { vehicle: true, transportAssignments: { include: { student: true }, orderBy: { stopOrder: 'asc' } } },
        })
        if (!route) throw new NotFoundException(`Route "${id}" not found`)
        return route
    }

    async update(id: string, schoolId: string, dto: any) {
        await this.findById(id, schoolId)
        return this.prisma.transportRoute.update({ where: { id }, data: dto, include: { vehicle: true } })
    }

    async remove(id: string, schoolId: string) {
        await this.findById(id, schoolId)
        return this.prisma.transportRoute.delete({ where: { id } })
    }

    async assignStudent(schoolId: string, dto: { routeId: string; studentId: string; stopName?: string; stopOrder?: number }) {
        return this.prisma.transportAssignment.create({
            data: { routeId: dto.routeId, studentId: dto.studentId, stopName: dto.stopName, stopOrder: dto.stopOrder ?? 0, schoolId },
            include: { student: true, route: true },
        })
    }

    async removeAssignment(id: string, schoolId: string) {
        const assignment = await this.prisma.transportAssignment.findFirst({ where: { id, schoolId } })
        if (!assignment) throw new NotFoundException('Assignment not found')
        return this.prisma.transportAssignment.delete({ where: { id } })
    }
}
