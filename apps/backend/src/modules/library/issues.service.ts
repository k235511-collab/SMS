import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { IssueBookDto, ReturnBookDto } from './dto'

@Injectable()
export class IssuesService {
    constructor(private readonly prisma: PrismaService) { }

    async issueBook(schoolId: string, dto: IssueBookDto, campusId?: string) {
        const bookWhere: any = { id: dto.bookId, schoolId }
        if (campusId) bookWhere.campusId = campusId
        const book = await this.prisma.book.findFirst({ where: bookWhere })
        if (!book) throw new NotFoundException('Book not found')
        if (book.availableCopies <= 0) throw new BadRequestException('No copies available')

        const [issue] = await this.prisma.$transaction([
            this.prisma.bookIssue.create({
                data: { bookId: dto.bookId, studentId: dto.studentId, dueDate: new Date(dto.dueDate), schoolId },
                include: { book: true, student: true },
            }),
            this.prisma.book.update({ where: { id: dto.bookId }, data: { availableCopies: { decrement: 1 } } }),
        ])
        return issue
    }

    async returnBook(id: string, schoolId: string, dto: ReturnBookDto) {
        const issue = await this.prisma.bookIssue.findFirst({ where: { id, schoolId } })
        if (!issue) throw new NotFoundException('Book issue not found')
        if (issue.status === 'RETURNED') throw new BadRequestException('Book already returned')

        const [updated] = await this.prisma.$transaction([
            this.prisma.bookIssue.update({
                where: { id },
                data: { status: 'RETURNED', returnDate: new Date(), fine: dto.fine, remarks: dto.remarks },
                include: { book: true, student: true },
            }),
            this.prisma.book.update({ where: { id: issue.bookId }, data: { availableCopies: { increment: 1 } } }),
        ])
        return updated
    }

    async findAll(schoolId: string, query: { status?: string; studentId?: string; page?: number; pageSize?: number }, campusId?: string) {
        const where: any = { schoolId }
        if (campusId) where.book = { campusId }
        if (query.status) where.status = query.status
        if (query.studentId) where.studentId = query.studentId

        const page = query.page ?? 1
        const pageSize = query.pageSize ?? 20
        const [data, total] = await this.prisma.$transaction([
            this.prisma.bookIssue.findMany({
                where, include: { book: true, student: true },
                skip: (page - 1) * pageSize, take: pageSize,
                orderBy: { issueDate: 'desc' },
            }),
            this.prisma.bookIssue.count({ where }),
        ])
        return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
    }
}
