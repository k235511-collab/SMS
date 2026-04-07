import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { PaginationDto, PaginatedResult } from '../../common/dto'
import { CreateCampusDto, UpdateCampusDto } from './dto'

@Injectable()
export class CampusesService {
  constructor(private readonly prisma: PrismaService) {}

  private async ensureDefaultCampusForSingleCampusPlan(schoolId: string) {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      include: {
        subscriptionPlan: true,
        _count: { select: { campuses: true } },
      },
    })

    const isSingleCampusPlan =
      school?.subscriptionPlan?.slug === 'free' ||
      (school?.subscriptionPlan?.maxCampuses != null && school.subscriptionPlan.maxCampuses <= 1)

    if (isSingleCampusPlan && (school?._count.campuses ?? 0) === 0) {
      await this.prisma.campus.create({
        data: {
          name: 'Main Campus',
          code: 'MAIN',
          schoolId,
          isActive: true,
        },
      })
    }
  }

  private async assertSuperAdmin(schoolId: string, userId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, schoolId },
      include: { role: true },
    })

    if (!user || user.role?.slug !== 'super_admin') {
      throw new ForbiddenException('Only super admin can manage campuses')
    }
  }

  async create(schoolId: string, userId: string, dto: CreateCampusDto) {
    await this.assertSuperAdmin(schoolId, userId)

    // Check plan limit
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      include: {
        subscriptionPlan: true,
        _count: { select: { campuses: true } },
      },
    })

    const isSingleCampusPlan =
      school?.subscriptionPlan?.slug === 'free' ||
      (school?.subscriptionPlan?.maxCampuses != null && school.subscriptionPlan.maxCampuses <= 1)

    if (isSingleCampusPlan) {
      throw new BadRequestException(
        'Campus creation is locked for your current plan. Upgrade your plan to add more campuses.',
      )
    }

    if (school?.subscriptionPlan?.maxCampuses != null) {
      if (school._count.campuses >= school.subscriptionPlan.maxCampuses) {
        throw new BadRequestException(
          `Campus limit reached (${school.subscriptionPlan.maxCampuses}). Upgrade your plan to add more campuses.`,
        )
      }
    }

    const existing = await this.prisma.campus.findUnique({
      where: { code_schoolId: { code: dto.code, schoolId } },
    })

    if (existing) {
      throw new ConflictException(
        'Campus with this code already exists in this school',
      )
    }

    return this.prisma.campus.create({
      data: { ...dto, schoolId },
      include: {
        _count: { select: { classes: true, teachers: true, users: true } },
      },
    })
  }

  async findAll(
    schoolId: string,
    query: PaginationDto,
  ): Promise<PaginatedResult<any>> {
    await this.ensureDefaultCampusForSingleCampusPlan(schoolId)

    const where: any = { schoolId }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
      ]
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.campus.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: { [query.sortBy ?? 'createdAt']: query.sortOrder ?? 'desc' },
        include: {
          _count: { select: { classes: true, teachers: true, users: true } },
        },
      }),
      this.prisma.campus.count({ where }),
    ])

    return new PaginatedResult(
      data,
      total,
      query.page ?? 1,
      query.pageSize ?? 20,
    )
  }

  /** Unpaginated list for dropdowns / selectors */
  async findAllSimple(schoolId: string) {
    await this.ensureDefaultCampusForSingleCampusPlan(schoolId)

    return this.prisma.campus.findMany({
      where: { schoolId, isActive: true },
      orderBy: { name: 'asc' },
      select: { id: true, name: true, code: true },
    })
  }

  async findById(id: string, schoolId: string) {
    const campus = await this.prisma.campus.findFirst({
      where: { id, schoolId },
      include: {
        _count: { select: { classes: true, teachers: true, users: true } },
      },
    })

    if (!campus) {
      throw new NotFoundException(`Campus with ID "${id}" not found`)
    }

    return campus
  }

  async update(id: string, schoolId: string, userId: string, dto: UpdateCampusDto) {
    await this.assertSuperAdmin(schoolId, userId)
    await this.findById(id, schoolId)

    return this.prisma.campus.update({
      where: { id },
      data: dto,
      include: {
        _count: { select: { classes: true, teachers: true, users: true } },
      },
    })
  }

  async remove(id: string, schoolId: string, userId: string) {
    await this.assertSuperAdmin(schoolId, userId)
    const campus = await this.findById(id, schoolId)

    // Block delete if campus has assigned classes
    if ((campus as any)._count?.classes > 0) {
      throw new BadRequestException(
        `Cannot delete campus "${campus.name}" because it has ${(campus as any)._count.classes} class(es) assigned. Reassign them first.`,
      )
    }

    return this.prisma.campus.delete({ where: { id } })
  }
}
