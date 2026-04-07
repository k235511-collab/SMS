import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { UpdateSchoolProfileDto } from './dto'

@Injectable()
export class SchoolsService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(schoolId: string) {
    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      include: {
        subscriptionPlan: true,
        _count: {
          select: {
            campuses: true,
            users: true,
            students: true,
            teachers: true,
            classes: true,
          },
        },
      },
    })

    if (!school) {
      throw new NotFoundException(`School with ID "${schoolId}" not found`)
    }

    return school
  }

  async updateProfile(schoolId: string, dto: UpdateSchoolProfileDto) {
    await this.findById(schoolId)

    return this.prisma.school.update({
      where: { id: schoolId },
      data: dto,
      include: { subscriptionPlan: true },
    })
  }

  async updateLogo(schoolId: string, logoUrl: string | null) {
    await this.findById(schoolId)

    return this.prisma.school.update({
      where: { id: schoolId },
      data: { logo: logoUrl },
    })
  }

  async getStats(schoolId: string) {
    const [students, teachers, users, campuses, classes] =
      await this.prisma.$transaction([
        this.prisma.student.count({ where: { schoolId, deletedAt: null, status: 'ACTIVE' } }),
        this.prisma.teacher.count({ where: { schoolId, isActive: true } }),
        this.prisma.user.count({ where: { schoolId, isActive: true } }),
        this.prisma.campus.count({ where: { schoolId, isActive: true } }),
        this.prisma.class.count({ where: { schoolId, deletedAt: null } }),
      ])

    return { students, teachers, users, campuses, classes }
  }
}
