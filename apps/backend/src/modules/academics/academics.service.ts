import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { PaginationDto, PaginatedResult } from '../../common/dto'
import {
  CreateClassDto,
  UpdateClassDto,
  CreateSectionDto,
  UpdateSectionDto,
  CreateSubjectDto,
  UpdateSubjectDto,
  AssignSubjectToClassDto,
} from './dto'

@Injectable()
export class AcademicsService {
  constructor(private readonly prisma: PrismaService) { }

  // ═══════════════════════════════════════════════════════════════
  // CLASSES
  // ═══════════════════════════════════════════════════════════════

  async createClass(schoolId: string, dto: CreateClassDto, campusId?: string) {
    if (!campusId) {
      throw new BadRequestException('Campus is required to create a class')
    }

    // Check uniqueness: code must be unique within campus
    const existing = await this.prisma.class.findFirst({
      where: {
        code: dto.code,
        schoolId,
        campusId,
        deletedAt: null,
      },
    })

    if (existing) {
      throw new ConflictException('Class with this code already exists in this campus')
    }

    return this.prisma.class.create({
      data: { ...dto, schoolId, campusId },
      include: { sections: true, subjects: true, campus: true },
    })
  }

  async findAllClasses(schoolId: string, query: PaginationDto & { deleted?: string }, campusId?: string): Promise<PaginatedResult<any>> {
    const where: any = { schoolId }
    if (campusId) where.campusId = campusId
    if (query.deleted === 'true') {
      where.deletedAt = { not: null }
    } else {
      where.deletedAt = null
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
      ]
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.class.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: { sortOrder: 'asc' },
        include: { sections: { where: { deletedAt: null }, orderBy: { name: 'asc' } }, campus: true },
      }),
      this.prisma.class.count({ where }),
    ])

    return new PaginatedResult(data, total, query.page ?? 1, query.pageSize ?? 20)
  }

  async findClassById(id: string, schoolId: string) {
    const cls = await this.prisma.class.findFirst({
      where: { id, schoolId },
      include: {
        sections: { where: { deletedAt: null } },
      },
    })

    if (!cls) {
      throw new NotFoundException(`Class with ID "${id}" not found`)
    }

    return cls
  }

  async updateClass(id: string, schoolId: string, dto: UpdateClassDto) {
    await this.findClassById(id, schoolId)

    return this.prisma.class.update({
      where: { id },
      data: dto,
      include: { sections: true, subjects: true },
    })
  }

  async removeClass(id: string, schoolId: string) {
    const cls = await this.findClassById(id, schoolId)
    // Soft delete
    return this.prisma.class.update({
      where: { id },
      data: { deletedAt: new Date() },
    })
  }

  async restoreClass(id: string, schoolId: string) {
    const cls = await this.prisma.class.findFirst({ where: { id, schoolId } })
    if (!cls) throw new NotFoundException(`Class with ID "${id}" not found`)

    return this.prisma.class.update({
      where: { id },
      data: { deletedAt: null },
    })
  }

  async deleteClassPermanently(id: string, schoolId: string) {
    const cls = await this.prisma.class.findFirst({ where: { id, schoolId } })
    if (!cls) throw new NotFoundException(`Class with ID "${id}" not found`)
    return this.prisma.class.delete({ where: { id } })
  }

  // ═══════════════════════════════════════════════════════════════
  // SECTIONS
  // ═══════════════════════════════════════════════════════════════

  async createSection(schoolId: string, dto: CreateSectionDto) {
    // Verify class belongs to school
    const cls = await this.prisma.class.findFirst({
      where: { id: dto.classId, schoolId },
    })

    if (!cls) {
      throw new NotFoundException('Class not found in this school')
    }

    const existing = await this.prisma.section.findUnique({
      where: { name_classId: { name: dto.name, classId: dto.classId } },
    })

    if (existing) {
      throw new ConflictException('Section with this name already exists in this class')
    }

    return this.prisma.section.create({
      data: {
        name: dto.name,
        capacity: dto.capacity,
        classId: dto.classId,
        schoolId,
      },
      include: { class: true },
    })
  }

  async findSectionsByClass(classId: string, schoolId: string) {
    await this.findClassById(classId, schoolId)

    return this.prisma.section.findMany({
      where: { classId, schoolId, deletedAt: null },
      include: { class: true },
      orderBy: { name: 'asc' },
    })
  }

  async findAllSections(schoolId: string, query: PaginationDto & { deleted?: string }, campusId?: string): Promise<PaginatedResult<any>> {
    const where: any = { schoolId }
    if (campusId) where.class = { campusId }
    if (query.deleted === 'true') {
      where.deletedAt = { not: null }
    } else {
      where.deletedAt = null
    }

    if (query.search) {
      where.name = { contains: query.search, mode: 'insensitive' }
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.section.findMany({
        where,
        include: { class: true },
        skip: query.skip,
        take: query.take,
        orderBy: { name: 'asc' },
      }),
      this.prisma.section.count({ where }),
    ])

    return new PaginatedResult(data, total, query.page ?? 1, query.pageSize ?? 20)
  }

  async updateSection(id: string, schoolId: string, dto: UpdateSectionDto) {
    const existing = await this.prisma.section.findFirst({ where: { id, schoolId } })

    if (!existing) {
      throw new NotFoundException(`Section with ID "${id}" not found`)
    }

    return this.prisma.section.update({
      where: { id },
      data: dto,
      include: { class: true },
    })
  }

  async removeSection(id: string, schoolId: string) {
    const existing = await this.prisma.section.findFirst({ where: { id, schoolId } })

    if (!existing) {
      throw new NotFoundException(`Section with ID "${id}" not found`)
    }

    return this.prisma.section.update({
      where: { id },
      data: { deletedAt: new Date() },
    })
  }

  async restoreSection(id: string, schoolId: string) {
    const section = await this.prisma.section.findFirst({ where: { id, schoolId } })
    if (!section) throw new NotFoundException(`Section with ID "${id}" not found`)

    return this.prisma.section.update({
      where: { id },
      data: { deletedAt: null },
    })
  }

  async deleteSectionPermanently(id: string, schoolId: string) {
    const section = await this.prisma.section.findFirst({ where: { id, schoolId } })
    if (!section) throw new NotFoundException(`Section with ID "${id}" not found`)
    return this.prisma.section.delete({ where: { id } })
  }

  // ═══════════════════════════════════════════════════════════════
  // SUBJECTS
  // ═══════════════════════════════════════════════════════════════

  async createSubject(schoolId: string, dto: CreateSubjectDto, campusId?: string) {
    // Verify class exists and belongs to school
    const cls = await this.prisma.class.findFirst({
      where: { id: dto.classId, schoolId, ...(campusId ? { campusId } : {}) },
    })
    if (!cls) throw new NotFoundException('Class not found')

    const existing = await this.prisma.subject.findFirst({
      where: { code: dto.code, classId: dto.classId, schoolId },
    })

    if (existing) {
      throw new ConflictException('Subject with this code already exists in this class')
    }

    return this.prisma.subject.create({
      data: { ...dto, schoolId },
    })
  }

  async findAllSubjects(schoolId: string, query: PaginationDto & { deleted?: string; classId?: string }, campusId?: string): Promise<PaginatedResult<any>> {
    const where: any = { schoolId }
    if (campusId) where.class = { ...where.class, campusId }
    if (query.deleted === 'true') {
      where.deletedAt = { not: null }
    } else {
      where.deletedAt = null
    }

    if (query.classId) {
      where.classId = query.classId
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
      ]
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.subject.findMany({
        where,
        include: {
          _count: { select: { examResults: true } },
        },
        skip: query.skip,
        take: query.take,
        orderBy: { [query.sortBy ?? 'name']: query.sortOrder ?? 'asc' },
      }),
      this.prisma.subject.count({ where }),
    ])

    return new PaginatedResult(data, total, query.page ?? 1, query.pageSize ?? 20)
  }

  async updateSubject(id: string, schoolId: string, dto: UpdateSubjectDto, campusId?: string) {
    const subject = await this.prisma.subject.findFirst({
      where: { id, schoolId, ...(campusId ? { class: { campusId } } : {}) },
    })

    if (!subject) {
      throw new NotFoundException(`Subject with ID "${id}" not found`)
    }

    return this.prisma.subject.update({
      where: { id },
      data: dto as any,
    })
  }

  async removeSubject(id: string, schoolId: string, campusId?: string) {
    const subject = await this.prisma.subject.findFirst({
      where: { id, schoolId, ...(campusId ? { class: { campusId } } : {}) },
    })

    if (!subject) {
      throw new NotFoundException(`Subject with ID "${id}" not found`)
    }

    return this.prisma.subject.update({
      where: { id },
      data: { deletedAt: new Date() },
    })
  }

  async restoreSubject(id: string, schoolId: string, campusId?: string) {
    const subject = await this.prisma.subject.findFirst({
      where: { id, schoolId, ...(campusId ? { class: { campusId } } : {}) },
    })
    if (!subject) throw new NotFoundException(`Subject with ID "${id}" not found`)

    return this.prisma.subject.update({
      where: { id },
      data: { deletedAt: null },
    })
  }

  async deleteSubjectPermanently(id: string, schoolId: string, campusId?: string) {
    const subject = await this.prisma.subject.findFirst({
      where: { id, schoolId, ...(campusId ? { class: { campusId } } : {}) },
    })
    if (!subject) throw new NotFoundException(`Subject with ID "${id}" not found`)
    return this.prisma.subject.delete({ where: { id } })
  }
}
