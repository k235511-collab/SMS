import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { PaginationDto, PaginatedResult } from '../../common/dto'
import {
  CreateSchoolDto,
  UpdateSchoolDto,
  CreateSubscriptionPlanDto,
  UpdateSubscriptionPlanDto,
  SchoolFilterDto,
  SwitchSchoolAdminDto,
  SubmitSchoolRegistrationDto,
  RegistrationFilterDto,
  RejectRegistrationDto,
  ApproveRegistrationDto,
} from './dto'
import * as bcrypt from 'bcryptjs'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { assertSchoolAccessOrThrow } from '../../common/policies/school-access.policy'

@Injectable()
export class PlatformService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  // ═══════════════════════════════════════════════════════════════
  // SCHOOLS (Platform-level management)
  // ═══════════════════════════════════════════════════════════════

  async createSchool(dto: CreateSchoolDto) {
    const existing = await this.prisma.school.findFirst({
      where: { OR: [{ slug: dto.slug }, { code: dto.code }] },
    })

    if (existing) {
      throw new ConflictException('School with this slug or code already exists')
    }

    // Get ALL permissions so we can assign them to the super_admin role
    const allPermissions = await this.prisma.permission.findMany()

    return this.prisma.$transaction(async (tx) => {
      // 1. Create school
      const school = await tx.school.create({
        data: {
          name: dto.name,
          slug: dto.slug,
          code: dto.code,
          domain: dto.domain,
          address: dto.address,
          phone: dto.phone,
          email: dto.email,
          website: dto.website,
          subscriptionPlanId: dto.subscriptionPlanId,
          subscriptionExpiresAt: dto.subscriptionPlanId
            ? await this.calculateSubscriptionExpiry(dto.subscriptionPlanId)
            : null,
        },
        include: { subscriptionPlan: true },
      })

      // Always auto-create a default "Main Campus" for every new school
      await tx.campus.create({
        data: {
          name: 'Main Campus',
          code: 'MAIN',
          schoolId: school.id,
          isActive: true,
        },
      })

      // 2. Create default roles
      const superAdminRole = await tx.role.create({
        data: {
          name: 'Super Admin',
          slug: 'super_admin',
          description: 'Full school access',
          isSystem: true,
          schoolId: school.id,
        },
      })
      const adminRole = await tx.role.create({
        data: {
          name: 'Admin',
          slug: 'admin',
          description: 'Administrative access',
          isSystem: true,
          schoolId: school.id,
        },
      })
      const teacherRole = await tx.role.create({
        data: {
          name: 'Teacher',
          slug: 'teacher',
          description: 'Teacher access',
          isSystem: true,
          schoolId: school.id,
        },
      })
      await tx.role.create({
        data: {
          name: 'Student',
          slug: 'student',
          description: 'Student access',
          isSystem: true,
          schoolId: school.id,
        },
      })
      await tx.role.create({
        data: {
          name: 'Parent',
          slug: 'parent',
          description: 'Parent access',
          isSystem: true,
          schoolId: school.id,
        },
      })

      // 3. Assign ALL permissions to Super Admin role
      if (allPermissions.length > 0) {
        await tx.rolePermission.createMany({
          data: allPermissions.map((p) => ({
            roleId: superAdminRole.id,
            permissionId: p.id,
          })),
        })

        // 4. Assign all permissions (except platform:manage) to Admin role
        await tx.rolePermission.createMany({
          data: allPermissions
            .filter((p) => p.slug !== 'platform:manage')
            .map((p) => ({
              roleId: adminRole.id,
              permissionId: p.id,
            })),
        })

        // 5. Assign limited permissions to Teacher role
        const teacherPermSlugs = [
          'students:read',
          'teachers:read',
          'academics:read',
          'attendance:read',
          'attendance:create',
          'attendance:update',
          'exams:read',
          'exams:create',
          'exams:update',
          'assignments:read',
          'assignments:create',
          'assignments:update',
          'assignments:delete',
          'grades:read',
          'grades:create',
          'grades:update',
          'calendar:read',
        ]
        await tx.rolePermission.createMany({
          data: allPermissions
            .filter((p) => teacherPermSlugs.includes(p.slug))
            .map((p) => ({
              roleId: teacherRole.id,
              permissionId: p.id,
            })),
        })
      }

      // 6. Create admin user if credentials provided
      let adminUser = null
      if (dto.adminEmail) {
        let passwordHash = null
        if (dto.adminPassword) {
          passwordHash = await bcrypt.hash(dto.adminPassword, 10)
        }

        adminUser = await tx.user.create({
          data: {
            email: dto.adminEmail,
            passwordHash,
            googleId: dto.adminGoogleId || null,
            firstName: dto.adminFirstName || 'Admin',
            lastName: dto.adminLastName || 'User',
            schoolId: school.id,
            roleId: superAdminRole.id,
          },
        })
      }

      return {
        ...school,
        adminUser: adminUser ? { id: adminUser.id, email: adminUser.email } : null,
      }
    })
  }

  async findAllSchools(query: SchoolFilterDto): Promise<PaginatedResult<any>> {
    const where: any = {}

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { slug: { contains: query.search, mode: 'insensitive' } },
        { code: { contains: query.search, mode: 'insensitive' } },
      ]
    }

    // Status filter
    if (query.status === 'active') where.isActive = true
    else if (query.status === 'inactive') where.isActive = false

    // Plan filter
    if (query.planId) {
      where.subscriptionPlanId = query.planId === 'none' ? null : query.planId
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.school.findMany({
        where,
        include: {
          subscriptionPlan: true,
          _count: {
            select: { users: true, students: true, teachers: true, campuses: true },
          },
        },
        skip: query.skip,
        take: query.take,
        orderBy: { [query.sortBy ?? 'createdAt']: query.sortOrder ?? 'desc' },
      }),
      this.prisma.school.count({ where }),
    ])

    return new PaginatedResult(data, total, query.page ?? 1, query.pageSize ?? 20)
  }

  async findSchoolById(id: string) {
    const school = await this.prisma.school.findUnique({
      where: { id },
      include: {
        subscriptionPlan: true,
        campuses: true,
        _count: {
          select: {
            users: true,
            students: true,
            teachers: true,
            campuses: true,
            classes: true,
            sections: true,
            subjects: true,
            exams: true,
          },
        },
      },
    })

    if (!school) {
      throw new NotFoundException(`School with ID "${id}" not found`)
    }

    // Get last active user login
    const lastActiveUser = await this.prisma.user.findFirst({
      where: { schoolId: id, lastLoginAt: { not: null } },
      orderBy: { lastLoginAt: 'desc' },
      select: { lastLoginAt: true, firstName: true, lastName: true, email: true },
    })

    // Get recent users (last 5 registered)
    const recentUsers = await this.prisma.user.findMany({
      where: { schoolId: id },
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        isActive: true,
        createdAt: true,
        lastLoginAt: true,
        role: { select: { name: true, slug: true } },
      },
    })

    // Onboarding checklist
    const onboarding = {
      hasAdmin: (await this.prisma.user.count({ where: { schoolId: id } })) > 0,
      hasStudents: (school._count.students || 0) > 0,
      hasTeachers: (school._count.teachers || 0) > 0,
      hasClasses: (school._count.classes || 0) > 0,
      hasSubjects: (school._count.subjects || 0) > 0,
    }

    return { ...school, lastActiveUser, recentUsers, onboarding }
  }

  async updateSchool(id: string, dto: UpdateSchoolDto) {
    await this.findSchoolById(id)

    // If changing subscription plan, validate current usage against new plan limits
    if (dto.subscriptionPlanId) {
      const newPlan = await this.prisma.subscriptionPlan.findUnique({
        where: { id: dto.subscriptionPlanId },
      })
      if (!newPlan) throw new NotFoundException('Subscription plan not found')

      const counts = await this.prisma.school.findUnique({
        where: { id },
        select: {
          _count: { select: { students: true, teachers: true, campuses: true } },
        },
      })

      const violations: string[] = []
      if (newPlan.maxStudents != null && counts!._count.students > newPlan.maxStudents) {
        violations.push(
          `Students: ${counts!._count.students} exceeds plan limit of ${newPlan.maxStudents}`,
        )
      }
      if (newPlan.maxTeachers != null && counts!._count.teachers > newPlan.maxTeachers) {
        violations.push(
          `Teachers: ${counts!._count.teachers} exceeds plan limit of ${newPlan.maxTeachers}`,
        )
      }
      if (newPlan.maxCampuses != null && counts!._count.campuses > newPlan.maxCampuses) {
        violations.push(
          `Campuses: ${counts!._count.campuses} exceeds plan limit of ${newPlan.maxCampuses}`,
        )
      }
      if (violations.length > 0) {
        throw new BadRequestException(
          `Cannot downgrade plan. Current usage exceeds new plan limits:\n${violations.join('\n')}`,
        )
      }
    }

    // Validate slug/code uniqueness if changing
    if (dto.slug || dto.code) {
      const conditions: any[] = []
      if (dto.slug) conditions.push({ slug: dto.slug })
      if (dto.code) conditions.push({ code: dto.code })
      const conflict = await this.prisma.school.findFirst({
        where: { OR: conditions, NOT: { id } },
      })
      if (conflict) {
        throw new ConflictException('Another school with this slug or code already exists')
      }
    }

    // Handle subscription expiry calculation if plan changed or manual override provided
    const data: any = { ...dto }
    if (dto.subscriptionPlanId) {
      data.subscriptionExpiresAt = await this.calculateSubscriptionExpiry(dto.subscriptionPlanId)
    }
    if (dto.subscriptionExpiresAt) {
      data.subscriptionExpiresAt = new Date(dto.subscriptionExpiresAt)
    }

    return this.prisma.school.update({
      where: { id },
      data,
      include: { subscriptionPlan: true },
    })
  }

  async getSchoolAdmin(schoolId: string) {
    const superAdminRole = await this.prisma.role.findFirst({
      where: { slug: 'super_admin', schoolId },
    })

    if (!superAdminRole) {
      throw new NotFoundException('Super Admin role not found for this school')
    }

    const adminUser = await this.prisma.user.findFirst({
      where: { schoolId, roleId: superAdminRole.id },
      orderBy: { createdAt: 'asc' },
    })

    if (!adminUser) {
      throw new NotFoundException('No Super Admin user found for this school')
    }

    return {
      id: adminUser.id,
      email: adminUser.email,
      firstName: adminUser.firstName,
      lastName: adminUser.lastName,
      hasGoogleLogin: !!adminUser.googleId,
      hasPassword: !!adminUser.passwordHash,
    }
  }

  async switchSchoolAdmin(schoolId: string, dto: SwitchSchoolAdminDto) {
    await this.findSchoolById(schoolId)

    const superAdminRole = await this.prisma.role.findFirst({
      where: { slug: 'super_admin', schoolId },
    })

    if (!superAdminRole) {
      throw new NotFoundException('Super Admin role not found for this school')
    }

    const adminUser = await this.prisma.user.findFirst({
      where: { schoolId, roleId: superAdminRole.id },
      orderBy: { createdAt: 'asc' },
    })

    if (!adminUser) {
      throw new NotFoundException('No Super Admin user found for this school')
    }

    let passwordHash = adminUser.passwordHash
    if (dto.adminPassword) {
      passwordHash = await bcrypt.hash(dto.adminPassword, 10)
    } else if (dto.adminGoogleId) {
      passwordHash = null
    }

    const updatedUser = await this.prisma.user.update({
      where: { id: adminUser.id },
      data: {
        email: dto.adminEmail || adminUser.email,
        passwordHash,
        googleId:
          dto.adminGoogleId && dto.adminGoogleId !== 'existing'
            ? dto.adminGoogleId
            : dto.adminGoogleId === 'existing'
              ? adminUser.googleId
              : null,
        firstName: dto.adminFirstName || adminUser.firstName,
        lastName: dto.adminLastName || adminUser.lastName,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        googleId: true,
      },
    })

    return {
      success: true,
      user: {
        ...updatedUser,
        hasGoogleLogin: !!updatedUser.googleId,
      },
    }
  }

  async deleteSchool(id: string) {
    const school = await this.findSchoolById(id)

    // Cascade delete in correct order using transaction
    await this.prisma.$transaction(async (tx) => {
      // Delete dependent records in order (leaves → roots)
      await tx.examResult.deleteMany({ where: { schoolId: id } })
      await tx.attendance.deleteMany({ where: { schoolId: id } })
      await tx.feePayment.deleteMany({ where: { schoolId: id } })
      await tx.invoice.deleteMany({ where: { schoolId: id } })
      await tx.feeStructure.deleteMany({ where: { schoolId: id } })
      await tx.timetableSlot.deleteMany({ where: { schoolId: id } })
      await tx.notification.deleteMany({ where: { schoolId: id } })
      await tx.auditLog.deleteMany({ where: { schoolId: id } })
      await tx.exam.deleteMany({ where: { schoolId: id } })
      await tx.studentEnrollment.deleteMany({ where: { schoolId: id } })
      await tx.student.deleteMany({ where: { schoolId: id } })
      await tx.teacher.deleteMany({ where: { schoolId: id } })
      await tx.user.deleteMany({ where: { schoolId: id } })
      await tx.section.deleteMany({ where: { schoolId: id } })
      await tx.subject.deleteMany({ where: { schoolId: id } })
      await tx.class.deleteMany({ where: { schoolId: id } })
      await tx.academicYear.deleteMany({ where: { schoolId: id } })
      await tx.campus.deleteMany({ where: { schoolId: id } })
      // Delete role permissions before roles (FK constraint)
      const roleIds = (
        await tx.role.findMany({ where: { schoolId: id }, select: { id: true } })
      ).map((r) => r.id)
      if (roleIds.length > 0) {
        await tx.rolePermission.deleteMany({ where: { roleId: { in: roleIds } } })
      }
      await tx.role.deleteMany({ where: { schoolId: id } })
      await tx.school.delete({ where: { id } })
    })

    return { deleted: true, name: school.name }
  }

  async toggleSchoolStatus(id: string) {
    const school = await this.findSchoolById(id)
    const newStatus = !school.isActive

    // When suspending: also disable all users so they can't log in
    // When activating: re-enable all users
    const [updatedSchool] = await this.prisma.$transaction([
      this.prisma.school.update({
        where: { id },
        data: { isActive: newStatus },
        include: { subscriptionPlan: true },
      }),
      this.prisma.user.updateMany({
        where: { schoolId: id },
        data: { isActive: newStatus },
      }),
    ])

    return updatedSchool
  }

  // ═══════════════════════════════════════════════════════════════
  // IMPERSONATE SCHOOL
  // ═══════════════════════════════════════════════════════════════

  async impersonateSchool(schoolId: string) {
    const school = await this.findSchoolById(schoolId)

    assertSchoolAccessOrThrow({
      schoolId: school.id,
      schoolName: school.name,
      isActive: school.isActive,
      subscriptionExpiresAt: school.subscriptionExpiresAt,
    })

    // Find the super_admin user for this school
    const adminRole = await this.prisma.role.findFirst({
      where: { slug: 'super_admin', schoolId, campusId: null },
    })

    if (!adminRole) {
      throw new NotFoundException('No admin role found for this school')
    }

    const adminUser = await this.prisma.user.findFirst({
      where: { schoolId, roleId: adminRole.id, isActive: true },
      include: { role: { select: { name: true, slug: true, permissions: true } } },
    })

    if (!adminUser) {
      throw new NotFoundException('No active admin user found for this school')
    }

    // Generate JWT as the school's admin user
    const payload = {
      sub: adminUser.id,
      email: adminUser.email,
      schoolId: school.id,
      roleId: adminUser.roleId,
      roleName: adminUser.role.name,
      roleSlug: adminUser.role.slug,
      impersonated: true, // flag so we know it's an impersonation
    }

    const secret = this.configService.get<string>('JWT_SECRET', 'sms-saas-secret')
    const token = this.jwtService.sign(payload, { secret, expiresIn: '1h' })

    return {
      token,
      school: { id: school.id, name: school.name, slug: school.slug },
      user: {
        id: adminUser.id,
        email: adminUser.email,
        firstName: adminUser.firstName,
        lastName: adminUser.lastName,
        role: adminUser.role.name,
      },
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // ENHANCED STATS
  // ═══════════════════════════════════════════════════════════════

  async getStats() {
    const [
      totalSchools,
      activeSchools,
      inactiveSchools,
      totalUsers,
      totalStudents,
      totalTeachers,
      totalPlans,
    ] = await this.prisma.$transaction([
      this.prisma.school.count(),
      this.prisma.school.count({ where: { isActive: true } }),
      this.prisma.school.count({ where: { isActive: false } }),
      this.prisma.user.count(),
      this.prisma.student.count(),
      this.prisma.teacher.count(),
      this.prisma.subscriptionPlan.count(),
    ])

    // Monthly new schools (this month)
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const newSchoolsThisMonth = await this.prisma.school.count({
      where: { createdAt: { gte: startOfMonth } },
    })

    // Revenue (total price of plans assigned to active schools)
    const revenueData = await this.prisma.school.findMany({
      where: { isActive: true, subscriptionPlanId: { not: null } },
      select: { subscriptionPlan: { select: { price: true } } },
    })
    const monthlyRevenue = revenueData.reduce((sum, s) => sum + (s.subscriptionPlan?.price || 0), 0)

    return {
      totalSchools,
      activeSchools,
      inactiveSchools,
      totalUsers,
      totalStudents,
      totalTeachers,
      totalPlans,
      newSchoolsThisMonth,
      monthlyRevenue,
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // RECENT ACTIVITY
  // ═══════════════════════════════════════════════════════════════

  async getRecentActivity(limit = 20) {
    // Recent school registrations
    const recentSchools = await this.prisma.school.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        name: true,
        slug: true,
        isActive: true,
        createdAt: true,
        subscriptionPlan: { select: { name: true } },
      },
    })

    // Recent logins across platform
    const recentLogins = await this.prisma.user.findMany({
      where: { lastLoginAt: { not: null } },
      orderBy: { lastLoginAt: 'desc' },
      take: limit,
      select: {
        firstName: true,
        lastName: true,
        email: true,
        lastLoginAt: true,
        school: { select: { name: true, slug: true } },
      },
    })

    return { recentSchools, recentLogins }
  }

  // ═══════════════════════════════════════════════════════════════
  // SCHOOLS EXPIRING SOON
  // ═══════════════════════════════════════════════════════════════

  async getSchoolsOverview() {
    // Schools grouped by plan — flatten to { planName, count } for frontend
    const planData = await this.prisma.subscriptionPlan.findMany({
      include: {
        _count: { select: { schools: true } },
      },
      orderBy: { price: 'asc' },
    })

    const schoolsByPlan = planData.map((p) => ({
      planName: p.name,
      count: p._count.schools,
    }))

    // Schools without a plan
    const unassignedSchools = await this.prisma.school.count({
      where: { subscriptionPlanId: null },
    })

    // Top schools by student count — flatten for frontend
    const topSchoolsRaw = await this.prisma.school.findMany({
      include: {
        _count: { select: { students: true, teachers: true, users: true } },
      },
      orderBy: { students: { _count: 'desc' } },
      take: 10,
    })

    const topSchools = topSchoolsRaw.map((s) => ({
      id: s.id,
      name: s.name,
      slug: s.slug,
      studentCount: s._count.students,
    }))

    return { schoolsByPlan, unassignedSchools, topSchools }
  }

  // ═══════════════════════════════════════════════════════════════
  // PLATFORM AUDIT LOGS (cross-school)
  // ═══════════════════════════════════════════════════════════════

  async getPlatformAuditLogs(query: PaginationDto): Promise<PaginatedResult<any>> {
    const where: any = {}

    if (query.search) {
      where.OR = [
        { action: { contains: query.search, mode: 'insensitive' } },
        { module: { contains: query.search, mode: 'insensitive' } },
        { entityType: { contains: query.search, mode: 'insensitive' } },
      ]
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        include: {
          user: { select: { firstName: true, lastName: true, email: true } },
          school: { select: { name: true, slug: true } },
        },
        skip: query.skip,
        take: query.take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ])

    return new PaginatedResult(data, total, query.page ?? 1, query.pageSize ?? 20)
  }

  // ═══════════════════════════════════════════════════════════════
  // PLATFORM ADMINS
  // ═══════════════════════════════════════════════════════════════

  async findAllPlatformAdmins() {
    return this.prisma.platformAdmin.findMany({
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    })
  }

  async createPlatformAdmin(data: {
    email: string
    password: string
    firstName: string
    lastName: string
  }) {
    const existing = await this.prisma.platformAdmin.findUnique({ where: { email: data.email } })
    if (existing) throw new ConflictException('Platform admin with this email already exists')

    const passwordHash = await bcrypt.hash(data.password, 10)
    return this.prisma.platformAdmin.create({
      data: {
        email: data.email,
        passwordHash,
        firstName: data.firstName,
        lastName: data.lastName,
      },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        createdAt: true,
      },
    })
  }

  async togglePlatformAdminStatus(id: string) {
    const admin = await this.prisma.platformAdmin.findUnique({ where: { id } })
    if (!admin) throw new NotFoundException('Platform admin not found')

    return this.prisma.platformAdmin.update({
      where: { id },
      data: { isActive: !admin.isActive },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      },
    })
  }

  // ═══════════════════════════════════════════════════════════════
  // SUBSCRIPTION PLANS
  // ═══════════════════════════════════════════════════════════════

  async createPlan(dto: CreateSubscriptionPlanDto) {
    return this.prisma.subscriptionPlan.create({ data: dto })
  }

  async findAllPlans() {
    return this.prisma.subscriptionPlan.findMany({
      include: { _count: { select: { schools: true } } },
      orderBy: { price: 'asc' },
    })
  }

  async updatePlan(id: string, dto: UpdateSubscriptionPlanDto) {
    const existing = await this.prisma.subscriptionPlan.findUnique({ where: { id } })
    if (!existing) {
      throw new NotFoundException(`Subscription plan with ID "${id}" not found`)
    }

    // If lowering any limit, check no school on this plan exceeds the new limit
    const loweredLimits =
      (dto.maxStudents != null &&
        (existing.maxStudents == null || dto.maxStudents < existing.maxStudents)) ||
      (dto.maxTeachers != null &&
        (existing.maxTeachers == null || dto.maxTeachers < existing.maxTeachers)) ||
      (dto.maxCampuses != null &&
        (existing.maxCampuses == null || dto.maxCampuses < existing.maxCampuses))

    if (loweredLimits) {
      const schools = await this.prisma.school.findMany({
        where: { subscriptionPlanId: id },
        select: {
          name: true,
          _count: { select: { students: true, teachers: true, campuses: true } },
        },
      })

      const violations: string[] = []
      for (const school of schools) {
        if (dto.maxStudents != null && school._count.students > dto.maxStudents) {
          violations.push(
            `"${school.name}" has ${school._count.students} students (new limit: ${dto.maxStudents})`,
          )
        }
        if (dto.maxTeachers != null && school._count.teachers > dto.maxTeachers) {
          violations.push(
            `"${school.name}" has ${school._count.teachers} teachers (new limit: ${dto.maxTeachers})`,
          )
        }
        if (dto.maxCampuses != null && school._count.campuses > dto.maxCampuses) {
          violations.push(
            `"${school.name}" has ${school._count.campuses} campuses (new limit: ${dto.maxCampuses})`,
          )
        }
      }
      if (violations.length > 0) {
        throw new BadRequestException(
          `Cannot lower plan limits. Schools exceed new limits:\n${violations.join('\n')}`,
        )
      }
    }

    const { applyToExisting, ...planData } = dto

    const updatedPlan = await this.prisma.subscriptionPlan.update({
      where: { id },
      data: planData,
      include: { _count: { select: { schools: true } } },
    })

    // If duration changed and user explicitly requested sync
    if (
      applyToExisting &&
      (dto.durationDays !== undefined || existing.durationDays !== dto.durationDays)
    ) {
      const duration = dto.durationDays ?? updatedPlan.durationDays

      if (duration && duration > 0) {
        // Intentional raw SQL: one bulk update keeps plan synchronization atomic
        // and avoids loading every school row through Prisma one by one.
        await this.prisma.$executeRawUnsafe(
          `UPDATE schools 
           SET "subscriptionExpiresAt" = "createdAt" + ($1 || ' days')::interval 
           WHERE "subscriptionPlanId" = $2`,
          duration.toString(),
          id,
        )
      } else {
        // Reset to lifetime (null)
        await this.prisma.school.updateMany({
          where: { subscriptionPlanId: id },
          data: { subscriptionExpiresAt: null },
        })
      }
    }

    return updatedPlan
  }

  async deletePlan(id: string) {
    const existing = await this.prisma.subscriptionPlan.findUnique({
      where: { id },
      include: { _count: { select: { schools: true } } },
    })
    if (!existing) throw new NotFoundException('Plan not found')
    if (existing._count.schools > 0) {
      throw new ConflictException('Cannot delete plan that has schools assigned to it')
    }
    return this.prisma.subscriptionPlan.delete({ where: { id } })
  }

  // ═══════════════════════════════════════════════════════════════
  // PLATFORM SETTINGS
  // ═══════════════════════════════════════════════════════════════

  async getSettings(group?: string) {
    const where: any = group ? { group } : {}
    const settings = await this.prisma.platformSetting.findMany({ where, orderBy: { key: 'asc' } })
    // Return as { key: value } map grouped by group
    const result: Record<string, Record<string, string>> = {}
    for (const s of settings) {
      if (!result[s.group]) result[s.group] = {}
      result[s.group][s.key] = s.value
    }
    return result
  }

  async upsertSetting(key: string, value: string, group = 'general') {
    return this.prisma.platformSetting.upsert({
      where: { key },
      create: { key, value, group },
      update: { value },
    })
  }

  async updateSettings(settings: Array<{ key: string; value: string; group?: string }>) {
    const results = []
    for (const s of settings) {
      results.push(await this.upsertSetting(s.key, s.value, s.group || 'general'))
    }
    return results
  }

  // ═══════════════════════════════════════════════════════════════
  // LOGIN HISTORY
  // ═══════════════════════════════════════════════════════════════

  async getLoginHistory(query: PaginationDto): Promise<PaginatedResult<any>> {
    const where: any = {}

    if (query.search) {
      where.email = { contains: query.search, mode: 'insensitive' }
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.loginHistory.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.loginHistory.count({ where }),
    ])

    return new PaginatedResult(data, total, query.page ?? 1, query.pageSize ?? 20)
  }

  async recordLogin(params: {
    email: string
    success: boolean
    userType: string
    userId?: string
    schoolId?: string
    ipAddress?: string
    userAgent?: string
  }) {
    return this.prisma.loginHistory.create({ data: params })
  }

  // ═══════════════════════════════════════════════════════════════
  // SCHOOL REGISTRATION REQUESTS (self-service signup + approval)
  // ═══════════════════════════════════════════════════════════════

  private slugify(s: string): string {
    return s
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
  }

  private codeify(s: string): string {
    return s
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '-')
      .substring(0, 8)
  }

  /**
   * Submit a school registration request (public — no auth required).
   * Auto-generates slug and code from school name.
   * Password is hashed before storage. Does NOT create school yet.
   */
  async submitRegistration(dto: SubmitSchoolRegistrationDto) {
    // Validate: must have either password or googleId
    if (!dto.adminPassword && !dto.adminGoogleId) {
      throw new BadRequestException('Either a password or Google account is required')
    }

    // Auto-generate slug and code
    let slug = this.slugify(dto.schoolName)
    let code = this.codeify(dto.schoolName)

    // Ensure uniqueness — append random suffix if needed
    const existingSlug = await this.prisma.schoolRegistration.findUnique({ where: { slug } })
    const existingSchoolSlug = await this.prisma.school.findUnique({ where: { slug } })
    if (existingSlug || existingSchoolSlug) {
      const suffix = Math.random().toString(36).substring(2, 6)
      slug = `${slug}-${suffix}`
    }

    const existingCode = await this.prisma.schoolRegistration.findUnique({ where: { code } })
    const existingSchoolCode = await this.prisma.school.findUnique({ where: { code } })
    if (existingCode || existingSchoolCode) {
      const suffix = Math.random().toString(36).substring(2, 4).toUpperCase()
      code = `${code}-${suffix}`
    }

    // Check if admin email already has a pending registration
    const existingPending = await this.prisma.schoolRegistration.findFirst({
      where: { adminEmail: dto.adminEmail, status: 'PENDING' },
    })
    if (existingPending) {
      throw new ConflictException(
        'A registration request with this email is already pending review',
      )
    }

    // Hash password if provided
    let adminPasswordHash: string | null = null
    if (dto.adminPassword) {
      adminPasswordHash = await bcrypt.hash(dto.adminPassword, 10)
    }

    const registration = await this.prisma.schoolRegistration.create({
      data: {
        schoolName: dto.schoolName,
        slug,
        code,
        email: dto.email || null,
        phone: dto.phone || null,
        address: dto.address || null,
        domain: dto.domain || null,
        website: dto.website || null,
        adminEmail: dto.adminEmail,
        adminFirstName: dto.adminFirstName,
        adminLastName: dto.adminLastName,
        adminGoogleId: dto.adminGoogleId,
        adminPasswordHash,
      },
    })

    return {
      id: registration.id,
      schoolName: registration.schoolName,
      adminEmail: registration.adminEmail,
      status: registration.status,
      createdAt: registration.createdAt,
    }
  }

  /**
   * List all registration requests (platform admin only).
   */
  async findAllRegistrations(query: RegistrationFilterDto): Promise<PaginatedResult<any>> {
    const where: any = {}

    if (query.status) {
      where.status = query.status
    }

    if (query.search) {
      where.OR = [
        { schoolName: { contains: query.search, mode: 'insensitive' } },
        { adminEmail: { contains: query.search, mode: 'insensitive' } },
      ]
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.schoolRegistration.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.schoolRegistration.count({ where }),
    ])

    return new PaginatedResult(data, total, query.page ?? 1, query.pageSize ?? 20)
  }

  /**
   * Get pending registration count (for badge in admin nav).
   */
  async getPendingRegistrationCount(): Promise<number> {
    return this.prisma.schoolRegistration.count({ where: { status: 'PENDING' } })
  }

  /**
   * Approve a registration — creates the actual school using existing createSchool() logic.
   * This ensures full consistency: roles, permissions, campus, admin user all created.
   */
  async approveRegistration(id: string, dto: ApproveRegistrationDto, reviewedBy: string) {
    const registration = await this.prisma.schoolRegistration.findUnique({ where: { id } })
    if (!registration) throw new NotFoundException('Registration not found')
    if (registration.status !== 'PENDING') {
      throw new BadRequestException(`Registration is already ${registration.status.toLowerCase()}`)
    }

    // Create school using the existing createSchool method (ensures roles, permissions, campus, admin)
    const createSchoolDto: CreateSchoolDto = {
      name: registration.schoolName,
      slug: registration.slug,
      code: registration.code,
      email: registration.email ?? undefined,
      phone: registration.phone ?? undefined,
      address: registration.address ?? undefined,
      domain: registration.domain ?? undefined,
      website: registration.website ?? undefined,
      adminEmail: registration.adminEmail,
      adminFirstName: registration.adminFirstName,
      adminLastName: registration.adminLastName,
      adminGoogleId: registration.adminGoogleId ?? undefined,
      // Pass raw password hash — we need to handle this specially
    }

    // We need to create the school with the pre-hashed password, so we call createSchool
    // but override the password flow since we already have the hash
    const school = await this.createSchoolFromRegistration(registration, dto.subscriptionPlanId)

    // Update registration status
    await this.prisma.schoolRegistration.update({
      where: { id },
      data: {
        status: 'APPROVED',
        reviewedAt: new Date(),
        reviewedBy,
        schoolId: school.id,
      },
    })

    return {
      registration: { id, status: 'APPROVED' },
      school: { id: school.id, name: school.name, slug: school.slug },
    }
  }

  /**
   * Internal: create school from a registration (uses pre-hashed password).
   */
  private async createSchoolFromRegistration(reg: any, planId: string) {
    const existing = await this.prisma.school.findFirst({
      where: { OR: [{ slug: reg.slug }, { code: reg.code }] },
    })
    if (existing) {
      throw new ConflictException('School with this slug or code already exists')
    }

    const allPermissions = await this.prisma.permission.findMany()

    return this.prisma.$transaction(async (tx) => {
      const school = await tx.school.create({
        data: {
          name: reg.schoolName,
          slug: reg.slug,
          code: reg.code,
          domain: reg.domain || null,
          address: reg.address,
          phone: reg.phone,
          email: reg.email,
          website: reg.website,
          subscriptionPlanId: planId,
          subscriptionExpiresAt: await this.calculateSubscriptionExpiry(planId),
        },
        include: { subscriptionPlan: true },
      })

      // Create default campus
      await tx.campus.create({
        data: { name: 'Main Campus', code: 'MAIN', schoolId: school.id, isActive: true },
      })

      // Create default roles
      const superAdminRole = await tx.role.create({
        data: {
          name: 'Super Admin',
          slug: 'super_admin',
          description: 'Full school access',
          isSystem: true,
          schoolId: school.id,
        },
      })
      const adminRole = await tx.role.create({
        data: {
          name: 'Admin',
          slug: 'admin',
          description: 'Administrative access',
          isSystem: true,
          schoolId: school.id,
        },
      })
      const teacherRole = await tx.role.create({
        data: {
          name: 'Teacher',
          slug: 'teacher',
          description: 'Teacher access',
          isSystem: true,
          schoolId: school.id,
        },
      })
      await tx.role.create({
        data: {
          name: 'Student',
          slug: 'student',
          description: 'Student access',
          isSystem: true,
          schoolId: school.id,
        },
      })
      await tx.role.create({
        data: {
          name: 'Parent',
          slug: 'parent',
          description: 'Parent access',
          isSystem: true,
          schoolId: school.id,
        },
      })

      // Assign permissions
      if (allPermissions.length > 0) {
        await tx.rolePermission.createMany({
          data: allPermissions.map((p) => ({ roleId: superAdminRole.id, permissionId: p.id })),
        })
        await tx.rolePermission.createMany({
          data: allPermissions
            .filter((p) => p.slug !== 'platform:manage')
            .map((p) => ({ roleId: adminRole.id, permissionId: p.id })),
        })
        const teacherPermSlugs = [
          'students:read',
          'teachers:read',
          'academics:read',
          'attendance:read',
          'attendance:create',
          'attendance:update',
          'exams:read',
          'exams:create',
          'exams:update',
          'assignments:read',
          'assignments:create',
          'assignments:update',
          'assignments:delete',
          'grades:read',
          'grades:create',
          'grades:update',
          'calendar:read',
        ]
        await tx.rolePermission.createMany({
          data: allPermissions
            .filter((p) => teacherPermSlugs.includes(p.slug))
            .map((p) => ({ roleId: teacherRole.id, permissionId: p.id })),
        })
      }

      // Create admin user with pre-hashed password
      await tx.user.create({
        data: {
          email: reg.adminEmail,
          passwordHash: reg.adminPasswordHash,
          googleId: reg.adminGoogleId || null,
          firstName: reg.adminFirstName,
          lastName: reg.adminLastName,
          schoolId: school.id,
          roleId: superAdminRole.id,
        },
      })

      return school
    })
  }

  /**
   * Reject a registration request.
   */
  async rejectRegistration(id: string, dto: RejectRegistrationDto, reviewedBy: string) {
    const registration = await this.prisma.schoolRegistration.findUnique({ where: { id } })
    if (!registration) throw new NotFoundException('Registration not found')
    if (registration.status !== 'PENDING') {
      throw new BadRequestException(`Registration is already ${registration.status.toLowerCase()}`)
    }

    await this.prisma.schoolRegistration.update({
      where: { id },
      data: {
        status: 'REJECTED',
        rejectionReason: dto.reason,
        reviewedAt: new Date(),
        reviewedBy,
      },
    })

    return { id, status: 'REJECTED', reason: dto.reason }
  }

  // ═══════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════

  private async calculateSubscriptionExpiry(
    planId: string,
    startDate: Date = new Date(),
  ): Promise<Date | null> {
    const plan = await this.prisma.subscriptionPlan.findUnique({ where: { id: planId } })
    if (!plan || !plan.durationDays) return null

    const expiryDate = new Date(startDate)
    expiryDate.setDate(expiryDate.getDate() + plan.durationDays)
    return expiryDate
  }
}
