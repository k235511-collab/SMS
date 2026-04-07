import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class VehiclesService {
    constructor(private readonly prisma: PrismaService) { }

    async create(schoolId: string, dto: any, campusId?: string) {
        return this.prisma.vehicle.create({ data: { ...dto, schoolId, campusId } })
    }

    async findAll(schoolId: string, campusId?: string) {
        const where: any = { schoolId }
        if (campusId) where.campusId = campusId
        return this.prisma.vehicle.findMany({
            where,
            include: { transportRoutes: true },
            orderBy: { registrationNo: 'asc' },
        })
    }

    async findById(id: string, schoolId: string) {
        const vehicle = await this.prisma.vehicle.findFirst({
            where: { id, schoolId },
            include: { transportRoutes: { include: { transportAssignments: { include: { student: true } } } } },
        })
        if (!vehicle) throw new NotFoundException(`Vehicle "${id}" not found`)
        return vehicle
    }

    async update(id: string, schoolId: string, dto: any) {
        await this.findById(id, schoolId)
        return this.prisma.vehicle.update({ where: { id }, data: dto })
    }

    async remove(id: string, schoolId: string) {
        await this.findById(id, schoolId)
        return this.prisma.vehicle.delete({ where: { id } })
    }
}
