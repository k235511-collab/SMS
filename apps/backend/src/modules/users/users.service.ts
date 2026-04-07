import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { PaginationDto, PaginatedResult } from '../../common/dto'
import { CreateUserDto, UpdateUserDto } from './dto'
import * as bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(schoolId: string, dto: CreateUserDto, campusId?: string) {
    // Check if user exists in this school
    const existing = await this.prisma.user.findUnique({
      where: { email_schoolId: { email: dto.email, schoolId } },
    })

    if (existing) {
      throw new ConflictException('User with this email already exists in this school')
    }

    // Verify role belongs to this school
    const role = await this.prisma.role.findFirst({
      where: { id: dto.roleId, schoolId },
    })

    if (!role) {
      throw new NotFoundException('Role not found in this school')
    }

    const passwordHash = await bcrypt.hash(dto.password, 10)

    // Campus priority: explicit dto.campusId > header campusId
    const resolvedCampusId = dto.campusId || campusId || undefined

    return this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        gender: dto.gender,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        bloodGroup: dto.bloodGroup,
        address: dto.address,
        cnic: dto.cnic,
        profession: dto.profession,
        qualification: dto.qualification,
        avatar: dto.avatar,
        schoolId,
        roleId: dto.roleId,
        campusId: resolvedCampusId,
      },
      include: { role: true },
    })
  }

  async findAll(
    schoolId: string,
    query: PaginationDto,
    campusId?: string,
  ): Promise<PaginatedResult<any>> {
    // Exclude parent-role users (they have internal placeholder emails)
    const parentRole = await this.prisma.role.findFirst({
      where: { slug: 'parent', schoolId },
      select: { id: true },
    })

    const where: any = { schoolId }
    if (parentRole) {
      where.roleId = { not: parentRole.id }
    }
    if (campusId) where.campusId = campusId

    if (query.search) {
      where.OR = [
        { firstName: { contains: query.search, mode: 'insensitive' } },
        { lastName: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
      ]
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        include: { role: true },
        skip: query.skip,
        take: query.take,
        orderBy: { [query.sortBy ?? 'createdAt']: query.sortOrder ?? 'desc' },
      }),
      this.prisma.user.count({ where }),
    ])

    return new PaginatedResult(data, total, query.page ?? 1, query.pageSize ?? 20)
  }

  async findById(id: string, schoolId: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, schoolId },
      include: {
        role: {
          include: {
            permissions: { include: { permission: true } },
          },
        },
      },
    })

    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`)
    }

    return user
  }

  async update(id: string, schoolId: string, dto: UpdateUserDto) {
    await this.findById(id, schoolId)

    const data: any = { ...dto }

    if (dto.password) {
      data.passwordHash = await bcrypt.hash(dto.password, 10)
      delete data.password
    }

    return this.prisma.user.update({
      where: { id },
      data,
      include: { role: true },
    })
  }

  async resetPassword(
    id: string,
    schoolId: string,
    actorUserId: string,
    meta?: { ipAddress?: string; userAgent?: string; campusId?: string | null },
  ) {
    const user = await this.prisma.user.findFirst({
      where: { id, schoolId },
      select: { id: true, email: true, googleId: true, passwordHash: true, mustChangePassword: true },
    })
    if (!user) {
      throw new NotFoundException(`User with ID "${id}" not found`)
    }

    // Professional default: do not allow setting a password for Google-only accounts.
    if (!user.passwordHash && user.googleId) {
      throw new BadRequestException('This user signs in with Google and cannot be reset with a password.')
    }

    const temporaryPassword = randomBytes(9).toString('base64url') // 12 chars, URL-safe
    const passwordHash = await bcrypt.hash(temporaryPassword, 10)

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id },
        data: { passwordHash, mustChangePassword: true },
      }),
      this.prisma.auditLog.create({
        data: {
          action: 'RESET_PASSWORD',
          module: 'users',
          entityType: 'User',
          entityId: id,
          oldData: { mustChangePassword: user.mustChangePassword },
          newData: { mustChangePassword: true },
          ipAddress: meta?.ipAddress,
          userAgent: meta?.userAgent,
          schoolId,
          campusId: meta?.campusId ?? null,
          userId: actorUserId,
        },
      }),
    ])

    return { temporaryPassword }
  }

  async updateAvatar(id: string, schoolId: string, avatarUrl: string | null) {
    await this.findById(id, schoolId)

    return this.prisma.user.update({
      where: { id },
      data: { avatar: avatarUrl },
      include: { role: true },
    })
  }

  async remove(id: string, schoolId: string) {
    await this.findById(id, schoolId)
    return this.prisma.user.delete({ where: { id } })
  }
}
