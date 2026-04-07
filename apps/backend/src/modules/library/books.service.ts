import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { CreateBookDto, UpdateBookDto } from './dto'

@Injectable()
export class BooksService {
    constructor(private readonly prisma: PrismaService) { }

    async create(schoolId: string, dto: CreateBookDto, campusId?: string) {
        return this.prisma.book.create({ data: { ...dto, availableCopies: dto.totalCopies ?? 1, schoolId, campusId } })
    }

    async findAll(schoolId: string, query: { search?: string; category?: string; page?: number; pageSize?: number }, campusId?: string) {
        const where: any = { schoolId }
        if (campusId) where.campusId = campusId
        if (query.search) {
            where.OR = [
                { title: { contains: query.search, mode: 'insensitive' } },
                { author: { contains: query.search, mode: 'insensitive' } },
                { isbn: { contains: query.search, mode: 'insensitive' } },
            ]
        }
        if (query.category) where.category = query.category

        const page = query.page ?? 1
        const pageSize = query.pageSize ?? 20
        const [data, total] = await this.prisma.$transaction([
            this.prisma.book.findMany({
                where, skip: (page - 1) * pageSize, take: pageSize,
                include: { _count: { select: { bookIssues: true } } },
                orderBy: { title: 'asc' },
            }),
            this.prisma.book.count({ where }),
        ])
        return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
    }

    async findById(id: string, schoolId: string) {
        const book = await this.prisma.book.findFirst({
            where: { id, schoolId },
            include: { bookIssues: { include: { student: true }, orderBy: { issueDate: 'desc' }, take: 20 } },
        })
        if (!book) throw new NotFoundException(`Book "${id}" not found`)
        return book
    }

    async update(id: string, schoolId: string, dto: UpdateBookDto) {
        await this.findById(id, schoolId)
        return this.prisma.book.update({ where: { id }, data: dto })
    }

    async remove(id: string, schoolId: string) {
        await this.findById(id, schoolId)
        return this.prisma.book.delete({ where: { id } })
    }
}
