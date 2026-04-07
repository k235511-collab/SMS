import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class ResourcesService {
    constructor(private readonly prisma: PrismaService) { }

    async create(schoolId: string, dto: any, uploadedById?: string, campusId?: string) {
        return this.prisma.resource.create({
            data: {
                title: dto.title, description: dto.description, fileUrl: dto.fileUrl, fileType: dto.fileType,
                fileSize: dto.fileSize, category: dto.category, isShared: dto.isShared ?? false,
                subjectId: dto.subjectId, classId: dto.classId, uploadedById, schoolId, campusId
            },
        })
    }

    async findAll(schoolId: string, query: { category?: string; subjectId?: string; search?: string; page?: number; pageSize?: number }, campusId?: string) {
        const where: any = { schoolId }
        if (campusId) where.campusId = campusId
        if (query.category) where.category = query.category
        if (query.subjectId) where.subjectId = query.subjectId
        if (query.search) {
            where.OR = [
                { title: { contains: query.search, mode: 'insensitive' } },
                { description: { contains: query.search, mode: 'insensitive' } },
            ]
        }
        const page = query.page ?? 1
        const pageSize = query.pageSize ?? 20
        const [data, total] = await this.prisma.$transaction([
            this.prisma.resource.findMany({ where, skip: (page - 1) * pageSize, take: pageSize, orderBy: { createdAt: 'desc' } }),
            this.prisma.resource.count({ where }),
        ])
        return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
    }

    async findById(id: string, schoolId: string) {
        const resource = await this.prisma.resource.findFirst({ where: { id, schoolId } })
        if (!resource) throw new NotFoundException(`Resource "${id}" not found`)
        return resource
    }

    async remove(id: string, schoolId: string) {
        await this.findById(id, schoolId)
        return this.prisma.resource.delete({ where: { id } })
    }
}
