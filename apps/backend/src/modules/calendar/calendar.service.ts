import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class CalendarService {
    constructor(private readonly prisma: PrismaService) { }

    async create(schoolId: string, dto: any, createdById?: string, campusId?: string) {
        return this.prisma.calendarEvent.create({
            data: {
                title: dto.title,
                description: dto.description,
                startDate: new Date(dto.startDate),
                endDate: dto.endDate ? new Date(dto.endDate) : undefined,
                allDay: dto.allDay ?? false,
                type: dto.type ?? 'GENERAL',
                color: dto.color,
                isPublic: dto.isPublic ?? true,
                schoolId,
                createdById,
                campusId,
            },
        })
    }

    async findAll(schoolId: string, query: { startDate?: string; endDate?: string; type?: string }, campusId?: string) {
        const where: any = { schoolId }
        if (campusId) where.campusId = campusId
        if (query.type) where.type = query.type
        if (query.startDate || query.endDate) {
            where.startDate = {}
            if (query.startDate) where.startDate.gte = new Date(query.startDate)
            if (query.endDate) where.startDate.lte = new Date(query.endDate)
        }
        return this.prisma.calendarEvent.findMany({ where, orderBy: { startDate: 'asc' } })
    }

    async findById(id: string, schoolId: string) {
        const event = await this.prisma.calendarEvent.findFirst({ where: { id, schoolId } })
        if (!event) throw new NotFoundException(`Event "${id}" not found`)
        return event
    }

    async update(id: string, schoolId: string, dto: any) {
        await this.findById(id, schoolId)
        const data: any = { ...dto }
        if (dto.startDate) data.startDate = new Date(dto.startDate)
        if (dto.endDate) data.endDate = new Date(dto.endDate)
        return this.prisma.calendarEvent.update({ where: { id }, data })
    }

    async remove(id: string, schoolId: string) {
        await this.findById(id, schoolId)
        return this.prisma.calendarEvent.delete({ where: { id } })
    }
}
