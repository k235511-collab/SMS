import { Injectable, NotFoundException, ConflictException, BadRequestException, PreconditionFailedException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { PaginationDto, PaginatedResult } from '../../common/dto'
import { CreateAcademicYearDto, UpdateAcademicYearDto } from './dto'

@Injectable()
export class AcademicYearsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(schoolId: string, dto: CreateAcademicYearDto) {
    const existing = await this.prisma.academicYear.findFirst({
      where: { name: dto.name, schoolId },
    })

    if (existing) {
      throw new ConflictException('Academic year with this name already exists')
    }

    const startDate = new Date(dto.startDate)
    const endDate = new Date(dto.endDate)

    if (startDate >= endDate) {
      throw new BadRequestException('Start date must be before end date')
    }

    const overlapping = await this.prisma.academicYear.findFirst({
      where: {
        schoolId,
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
    })

    if (overlapping) {
      throw new ConflictException(`Academic year dates overlap with existing year '${overlapping.name}'`)
    }

    // If setting as current, unset others in the same school
    if (dto.isCurrent) {
      await this.prisma.academicYear.updateMany({
        where: { schoolId, isCurrent: true },
        data: { isCurrent: false },
      })
    }

    return this.prisma.academicYear.create({
      data: {
        name: dto.name,
        startDate,
        endDate,
        isCurrent: dto.isCurrent ?? false,
        schoolId,
      },
    })
  }

  async findAll(schoolId: string, query: PaginationDto): Promise<PaginatedResult<any>> {
    const where: any = { schoolId }

    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' }
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.academicYear.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: { startDate: 'desc' },
      }),
      this.prisma.academicYear.count({ where }),
    ])

    return new PaginatedResult(data, total, query.page ?? 1, query.pageSize ?? 20)
  }

  async findById(id: string, schoolId: string) {
    const year = await this.prisma.academicYear.findFirst({
      where: { id, schoolId },
    })

    if (!year) {
      throw new NotFoundException(`Academic year with ID "${id}" not found`)
    }

    return year
  }

  async update(id: string, schoolId: string, dto: UpdateAcademicYearDto) {
    const currentYear = await this.findById(id, schoolId)

    const startDate = dto.startDate ? new Date(dto.startDate) : currentYear.startDate
    const endDate = dto.endDate ? new Date(dto.endDate) : currentYear.endDate

    if (startDate >= endDate) {
      throw new BadRequestException('Start date must be before end date')
    }

    if (dto.startDate || dto.endDate) {
      const overlapping = await this.prisma.academicYear.findFirst({
        where: {
          schoolId,
          id: { not: id },
          startDate: { lte: endDate },
          endDate: { gte: startDate },
        },
      })

      if (overlapping) {
        throw new ConflictException(`Academic year dates overlap with existing year '${overlapping.name}'`)
      }
    }

    // If setting as current, unset others in the same school
    if (dto.isCurrent) {
      await this.prisma.academicYear.updateMany({
        where: { schoolId, isCurrent: true, id: { not: id } },
        data: { isCurrent: false },
      })
    }

    const data: any = { ...dto }
    if (dto.startDate) data.startDate = startDate
    if (dto.endDate) data.endDate = endDate

    return this.prisma.academicYear.update({ where: { id }, data })
  }

  async remove(id: string, schoolId: string) {
    await this.findById(id, schoolId)

    // Check for dependencies
    const [enrollments, invoices, exams, timetable, assignments] = await Promise.all([
      this.prisma.studentEnrollment.count({ where: { academicYearId: id } }),
      this.prisma.invoice.count({ where: { academicYearId: id } }),
      this.prisma.exam.count({ where: { academicYearId: id } }),
      this.prisma.timetableSlot.count({ where: { academicYearId: id } }),
      this.prisma.teacherClassAssignment.count({ where: { academicYearId: id } }),
    ])

    const totalDependencies = enrollments + invoices + exams + timetable + assignments

    if (totalDependencies > 0) {
      throw new PreconditionFailedException(
        `Cannot delete academic year: ${enrollments} students, ${invoices} invoices, ${exams} exams, ${timetable} timetable slots, and ${assignments} teacher assignments are linked to it.`,
      )
    }

    return this.prisma.academicYear.delete({ where: { id } })
  }

  async getCurrent(schoolId: string) {
    const where: any = { schoolId, isCurrent: true }

    const year = await this.prisma.academicYear.findFirst({
      where,
    })

    if (!year) {
      throw new NotFoundException('No current academic year set')
    }

    return year
  }
}
