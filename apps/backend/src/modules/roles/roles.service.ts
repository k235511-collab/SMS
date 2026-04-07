import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { PaginationDto, PaginatedResult } from '../../common/dto'
import { CreateRoleDto, UpdateRoleDto, AssignPermissionsDto } from './dto'

@Injectable()
export class RolesService {
  constructor(private readonly prisma: PrismaService) {}

  private scopeWhere(schoolId: string, campusId?: string) {
    if (!campusId) return { schoolId }
    return {
      schoolId,
      OR: [{ campusId }, { campusId: null }],
    }
  }

  async create(schoolId: string, dto: CreateRoleDto, campusId?: string) {
    const existing = await this.prisma.role.findFirst({
      where: {
        slug: dto.slug,
        schoolId,
        campusId: campusId ?? null,
      },
    })

    if (existing) {
      throw new ConflictException('Role with this slug already exists in this scope')
    }

    return this.prisma.role.create({
      data: { ...dto, schoolId, campusId: campusId ?? null },
      include: { permissions: { include: { permission: true } } },
    })
  }

  async findAll(schoolId: string, query: PaginationDto, campusId?: string): Promise<PaginatedResult<any>> {
    const where: any = this.scopeWhere(schoolId, campusId)

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { slug: { contains: query.search, mode: 'insensitive' } },
      ]
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.role.findMany({
        where,
        include: {
          permissions: { include: { permission: true } },
          _count: { select: { users: true } },
        },
        skip: query.skip,
        take: query.take,
        orderBy: { [query.sortBy ?? 'createdAt']: query.sortOrder ?? 'desc' },
      }),
      this.prisma.role.count({ where }),
    ])

    return new PaginatedResult(data, total, query.page ?? 1, query.pageSize ?? 20)
  }

  async findById(id: string, schoolId: string, campusId?: string) {
    const scoped: any = this.scopeWhere(schoolId, campusId)
    const role = await this.prisma.role.findFirst({
      where: { id, ...scoped },
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { users: true } },
      },
    })

    if (!role) {
      throw new NotFoundException(`Role with ID "${id}" not found`)
    }

    return role
  }

  async update(id: string, schoolId: string, dto: UpdateRoleDto, campusId?: string) {
    const role = await this.findById(id, schoolId, campusId)

    if (role.isSystem && (dto.slug || dto.name)) {
      throw new BadRequestException('Cannot modify system role name or slug')
    }

    return this.prisma.role.update({
      where: { id },
      data: dto,
      include: { permissions: { include: { permission: true } } },
    })
  }

  async remove(id: string, schoolId: string, campusId?: string) {
    const role = await this.findById(id, schoolId, campusId)

    if (role.isSystem) {
      throw new BadRequestException('Cannot delete system roles')
    }

    if ((role as any)._count?.users > 0) {
      throw new BadRequestException('Cannot delete a role assigned to users')
    }

    return this.prisma.role.delete({ where: { id } })
  }

  async assignPermissions(id: string, schoolId: string, dto: AssignPermissionsDto, campusId?: string) {
    const role = await this.findById(id, schoolId, campusId)

    if (dto.permissionIds.length > 0 && role.slug !== 'super_admin') {
      const campusesPermissionCount = await this.prisma.permission.count({
        where: {
          id: { in: dto.permissionIds },
          module: 'campuses',
        },
      })

      if (campusesPermissionCount > 0) {
        throw new BadRequestException('Campuses permissions can only be assigned to super_admin role')
      }
    }

    // Remove existing permissions and replace
    await this.prisma.rolePermission.deleteMany({ where: { roleId: id } })

    if (dto.permissionIds.length > 0) {
      await this.prisma.rolePermission.createMany({
        data: dto.permissionIds.map((permissionId) => ({
          roleId: id,
          permissionId,
        })),
      })
    }

    return this.findById(id, schoolId, campusId)
  }

  async setAsDefault(id: string, schoolId: string, campusId?: string) {
    const role = await this.findById(id, schoolId, campusId)

    // Only get current permission slugs
    const currentPermissions = role.permissions.map((p) => p.permission.slug)

    return this.prisma.role.update({
      where: { id },
      data: { defaultPermissions: currentPermissions },
    })
  }

  async restoreDefaults(id: string, schoolId: string, campusId?: string) {
    const role = await this.findById(id, schoolId, campusId)

    if (!role.defaultPermissions) {
      throw new BadRequestException('No default permissions set for this role')
    }

    const defaultSlugs = role.defaultPermissions as string[]

    // Find permission IDs for these slugs
    const permissions = await this.prisma.permission.findMany({
      where: { slug: { in: defaultSlugs } },
      select: { id: true },
    })

    const permissionIds = permissions.map((p) => p.id)

    // Use existing assignPermissions logic
    return this.assignPermissions(id, schoolId, { permissionIds }, campusId)
  }
}
