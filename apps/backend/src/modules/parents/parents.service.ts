import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { LinkParentDto, UpdateParentLinkDto } from './dto'
import * as bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'

@Injectable()
export class ParentsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Create a parent profile (stored as User internally) + optionally link to a student */
  async createParent(schoolId: string, dto: {
    firstName: string
    lastName: string
    phone?: string
    gender?: any
    cnic?: string
    profession?: string
    qualification?: string
    address?: string
    avatar?: string
    // Optional: link to student immediately
    studentId?: string
    relationship?: string
  }, campusId?: string) {
    // Find parent role
    let parentRole = await this.prisma.role.findFirst({
      where: { slug: 'parent', schoolId },
    })
    if (!parentRole) {
      parentRole = await (this.prisma as any).unscopedClient.role.findFirst({
        where: { slug: 'parent', schoolId },
      })
    }
    if (!parentRole) {
      throw new NotFoundException('Parent role not found. Please create a "parent" role first.')
    }

    // Auto-generate placeholder email & password (parents don't login)
    const placeholderEmail = `parent-${randomUUID()}@internal.local`
    const passwordHash = await bcrypt.hash(randomUUID(), 10)

    const user = await this.prisma.user.create({
      data: {
        email: placeholderEmail,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        gender: dto.gender,
        cnic: dto.cnic,
        profession: dto.profession,
        qualification: dto.qualification,
        address: dto.address,
        avatar: dto.avatar,
        schoolId,
        roleId: parentRole.id,
        campusId: campusId || undefined,
      },
      include: { role: true },
    })

    // If studentId provided, link immediately
    if (dto.studentId) {
      await this.prisma.parentStudent.create({
        data: {
          parentId: user.id,
          studentId: dto.studentId,
          relationship: (dto.relationship as any) || 'GUARDIAN',
          isPrimary: true,
          schoolId,
        },
      })
    }

    return user
  }

  /** Link a parent (User) to a student */
  async linkParent(schoolId: string, dto: LinkParentDto) {
    // Verify parent user exists in this school
    const parent = await this.prisma.user.findFirst({
      where: { id: dto.parentId, schoolId },
      include: { role: true },
    })
    if (!parent) throw new NotFoundException('Parent user not found in this school')

    // Verify student exists in this school
    const student = await this.prisma.student.findFirst({
      where: { id: dto.studentId, schoolId },
    })
    if (!student) throw new NotFoundException('Student not found in this school')

    // Check if link already exists
    const existing = await this.prisma.parentStudent.findUnique({
      where: { parentId_studentId: { parentId: dto.parentId, studentId: dto.studentId } },
    })
    if (existing) throw new ConflictException('This parent is already linked to this student')

    // If marking as primary, unset any existing primary for this student
    if (dto.isPrimary) {
      await this.prisma.parentStudent.updateMany({
        where: { studentId: dto.studentId, schoolId, isPrimary: true },
        data: { isPrimary: false },
      })
    }

    return this.prisma.parentStudent.create({
      data: {
        parentId: dto.parentId,
        studentId: dto.studentId,
        relationship: dto.relationship || 'GUARDIAN',
        isPrimary: dto.isPrimary || false,
        schoolId,
      },
      include: {
        parent: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        student: { select: { id: true, firstName: true, lastName: true, rollNumber: true } },
      },
    })
  }

  /** Remove a parent-student link */
  async unlinkParent(id: string, schoolId: string) {
    const link = await this.prisma.parentStudent.findFirst({ where: { id, schoolId } })
    if (!link) throw new NotFoundException('Parent-student link not found')
    return this.prisma.parentStudent.delete({ where: { id } })
  }

  /** Update relationship or primary flag */
  async updateLink(id: string, schoolId: string, dto: UpdateParentLinkDto) {
    const link = await this.prisma.parentStudent.findFirst({ where: { id, schoolId } })
    if (!link) throw new NotFoundException('Parent-student link not found')

    // If marking as primary, unset others
    if (dto.isPrimary) {
      await this.prisma.parentStudent.updateMany({
        where: { studentId: link.studentId, schoolId, isPrimary: true, NOT: { id } },
        data: { isPrimary: false },
      })
    }

    return this.prisma.parentStudent.update({
      where: { id },
      data: dto,
      include: {
        parent: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        student: { select: { id: true, firstName: true, lastName: true, rollNumber: true } },
      },
    })
  }

  /** Get all parents for a student */
  async getParentsForStudent(studentId: string, schoolId: string) {
    const student = await this.prisma.student.findFirst({ where: { id: studentId, schoolId } })
    if (!student) throw new NotFoundException('Student not found')

    return this.prisma.parentStudent.findMany({
      where: { studentId, schoolId },
      include: {
        parent: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, avatar: true } },
      },
      orderBy: [{ isPrimary: 'desc' }, { createdAt: 'asc' }],
    })
  }

  /** Get all children for a parent user */
  async getChildrenForParent(parentId: string, schoolId: string) {
    return this.prisma.parentStudent.findMany({
      where: { parentId, schoolId },
      include: {
        student: {
          select: {
            id: true, firstName: true, lastName: true, rollNumber: true,
            dateOfBirth: true, gender: true, isActive: true,
            class: { select: { id: true, name: true } },
            section: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })
  }

  /** Get all parents (Users with parent role) in a school, including linked children */
  async findAll(schoolId: string, campusId?: string) {
    // Find parent role
    let parentRole = await this.prisma.role.findFirst({
      where: { slug: 'parent', schoolId },
    })
    if (!parentRole) {
      parentRole = await (this.prisma as any).unscopedClient?.role?.findFirst?.({
        where: { slug: 'parent', schoolId },
      }) ?? null
    }
    if (!parentRole) return []

    const where: any = { schoolId, roleId: parentRole.id }
    if (campusId) where.campusId = campusId

    return this.prisma.user.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        gender: true,
        cnic: true,
        profession: true,
        qualification: true,
        address: true,
        avatar: true,
        isActive: true,
        createdAt: true,
        children: {
          include: {
            student: {
              select: {
                id: true, firstName: true, lastName: true, rollNumber: true,
                class: { select: { id: true, name: true } },
                section: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  /** Search parents by name, phone, CNIC (for student modal autocomplete) */
  async searchParents(schoolId: string, query: string, campusId?: string) {
    let parentRole = await this.prisma.role.findFirst({
      where: { slug: 'parent', schoolId },
    })
    if (!parentRole) {
      parentRole = await (this.prisma as any).unscopedClient?.role?.findFirst?.({
        where: { slug: 'parent', schoolId },
      }) ?? null
    }
    if (!parentRole) return []

    const where: any = { schoolId, roleId: parentRole.id }
    if (campusId) where.campusId = campusId

    if (query && query.trim()) {
      const q = query.trim()
      where.OR = [
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
        { phone: { contains: q, mode: 'insensitive' } },
        { cnic: { contains: q, mode: 'insensitive' } },
        { profession: { contains: q, mode: 'insensitive' } },
      ]
    }

    return this.prisma.user.findMany({
      where,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        cnic: true,
        profession: true,
      },
      take: 20,
      orderBy: { firstName: 'asc' },
    })
  }
}
