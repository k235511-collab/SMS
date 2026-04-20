import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import * as bcrypt from 'bcryptjs'
import { PrismaService } from '../../prisma/prisma.service'
import { requestContext } from '../../common/context'
import { OAuth2Client } from 'google-auth-library'
import { assertSchoolAccessOrThrow } from '../../common/policies/school-access.policy'

export interface AuthResult {
  accessToken: string
  refreshToken: string
  user: {
    id: string
    email: string
    firstName: string
    lastName: string
    schoolId?: string
    schoolName?: string | null
    schoolLogo?: string | null
    avatar?: string | null
    schoolSettings?: any
    role?: string
    isPlatformAdmin?: boolean
    campusId?: string | null
    campusName?: string | null
    teacherId?: string | null
    classTeacherOfId?: string | null
    mustChangePassword?: boolean
  }
}

interface JwtPayload {
  sub: string
  schoolId?: string
  roleId?: string
  role?: string
  isPlatformAdmin?: boolean
  teacherId?: string | null
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async login(email: string, password: string, schoolSlug?: string): Promise<AuthResult> {
    // 1. Try Platform Admin first
    const admin = await this.prisma.platformAdmin.findUnique({
      where: { email },
    })

    if (admin && admin.isActive) {
      const isValid = await bcrypt.compare(password, admin.passwordHash)
      if (isValid) {
        await this.prisma.platformAdmin.update({
          where: { id: admin.id },
          data: { lastLoginAt: new Date() },
        })
        await this.prisma.loginHistory
          .create({
            data: { email, success: true, userType: 'platform_admin', userId: admin.id },
          })
          .catch(() => {})

        const tokens = this.generateTokens({
          sub: admin.id,
          isPlatformAdmin: true,
        })

        return {
          ...tokens,
          user: {
            id: admin.id,
            email: admin.email,
            firstName: admin.firstName,
            lastName: admin.lastName,
            isPlatformAdmin: true,
          },
        }
      }
    }

    // 2. Try School User
    let schoolId: string | undefined

    if (schoolSlug) {
      const school = await this.prisma.school.findUnique({
        where: { slug: schoolSlug },
      })
      if (school) {
        schoolId = school.id
      }
    }

    // Search for user
    const userQuery: any = { email, isActive: true }
    if (schoolId) {
      userQuery.schoolId = schoolId
    }

    // Cross-school login intentionally bypasses tenant scoping so the same email
    // can be resolved before we know which school context the user belongs to.
    const user = await this.prisma.unscopedClient.user.findFirst({
      where: userQuery,
      include: {
        role: { select: { slug: true } },
        school: {
          select: {
            id: true,
            isActive: true,
            name: true,
            logo: true,
            settings: true,
            subscriptionExpiresAt: true,
          },
        },
        campus: { select: { id: true, name: true, code: true } },
        teacher: { select: { id: true, classTeacherOfId: true } },
      },
    })

    if (!user || !user.school) {
      throw new UnauthorizedException('Invalid email or password')
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException('Please sign in with Google')
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash)
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password')
    }

    assertSchoolAccessOrThrow({
      schoolId: user.school.id,
      schoolName: user.school.name,
      isActive: user.school.isActive,
      subscriptionExpiresAt: user.school.subscriptionExpiresAt,
    })

    // Update last login
    await this.prisma.unscopedClient.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    })

    const teacherId = (user as any).teacher?.id || null
    const classTeacherOfId = await this.resolveLegacyClassTeacherOfId(
      teacherId,
      user.schoolId,
      (user as any).teacher?.classTeacherOfId || null,
    )

    // Generate tokens for the school context found
    const tokens = this.generateTokens({
      sub: user.id,
      schoolId: user.schoolId,
      roleId: user.roleId,
      role: user.role.slug,
      teacherId,
    })

    return {
      ...tokens,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        schoolId: user.schoolId,
        schoolName: user.school?.name || null,
        schoolLogo: user.school?.logo || null,
        schoolSettings: user.school?.settings || null,
        role: user.role.slug,
        avatar: user.avatar,
        campusId: user.campusId || null,
        campusName: user.campus?.name || null,
        teacherId,
        classTeacherOfId,
        mustChangePassword: (user as any).mustChangePassword ?? false,
      },
    }
  }

  async googleSignIn(googleIdToken: string, schoolSlug?: string): Promise<AuthResult> {
    const clientId = this.configService.get<string>('GOOGLE_CLIENT_ID')
    const client = new OAuth2Client(clientId)

    try {
      const ticket = await client.verifyIdToken({
        idToken: googleIdToken,
        audience: clientId,
      })
      const payload = ticket.getPayload()
      if (!payload || !payload.email) {
        throw new UnauthorizedException('Invalid Google token payload')
      }

      const { email, sub: googleId } = payload

      let schoolId: string | undefined
      if (schoolSlug) {
        const school = await this.prisma.school.findUnique({
          where: { slug: schoolSlug },
        })
        if (school) {
          schoolId = school.id
        }
      }

      const userQuery: any = { email, isActive: true }
      if (schoolId) {
        userQuery.schoolId = schoolId
      }

      // Google sign-in also needs cross-tenant lookup before the tenant context
      // is finalized, so this path intentionally uses the unscoped client.
      const user = await this.prisma.unscopedClient.user.findFirst({
        where: userQuery,
        include: {
          role: { select: { slug: true } },
          school: {
            select: {
              id: true,
              isActive: true,
              name: true,
              logo: true,
              settings: true,
              subscriptionExpiresAt: true,
            },
          },
          campus: { select: { id: true, name: true, code: true } },
          teacher: { select: { id: true, classTeacherOfId: true } },
        },
      })

      if (!user || !user.school) {
        throw new UnauthorizedException(
          'This Google account is not registered to any school. Please contact your administrator.',
        )
      }

      assertSchoolAccessOrThrow({
        schoolId: user.school.id,
        schoolName: user.school.name,
        isActive: user.school.isActive,
        subscriptionExpiresAt: user.school.subscriptionExpiresAt,
      })

      if (user.googleId !== googleId) {
        await this.prisma.unscopedClient.user.update({
          where: { id: user.id },
          data: { googleId, lastLoginAt: new Date() },
        })
      } else {
        await this.prisma.unscopedClient.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        })
      }

      const teacherId = (user as any).teacher?.id || null
      const classTeacherOfId = await this.resolveLegacyClassTeacherOfId(
        teacherId,
        user.schoolId,
        (user as any).teacher?.classTeacherOfId || null,
      )

      const tokens = this.generateTokens({
        sub: user.id,
        schoolId: user.schoolId,
        roleId: user.roleId,
        role: user.role.slug,
        teacherId,
      })

      return {
        ...tokens,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          schoolId: user.schoolId,
          schoolName: user.school?.name || null,
          schoolLogo: user.school?.logo || null,
          schoolSettings: user.school?.settings || null,
          role: user.role.slug,
          avatar: user.avatar,
          campusId: user.campusId || null,
          campusName: user.campus?.name || null,
          teacherId,
          classTeacherOfId,
          mustChangePassword: (user as any).mustChangePassword ?? false,
        },
      }
    } catch (error: any) {
      if (
        error?.name === 'UnauthorizedException' ||
        typeof error?.getStatus === 'function' ||
        error?.response?.statusCode === 401
      ) {
        throw error
      }
      console.error('Google Sign-In Error:', error)
      throw new UnauthorizedException('Google sign-in failed. Please try again.')
    }
  }

  async register(
    email: string,
    password: string,
    firstName: string,
    lastName: string,
    schoolSlug: string,
    roleSlug?: string,
  ): Promise<AuthResult> {
    // 1. Find the school
    const school = await this.prisma.school.findUnique({
      where: { slug: schoolSlug },
    })

    if (!school) {
      throw new NotFoundException('School not found')
    }

    assertSchoolAccessOrThrow({
      schoolId: school.id,
      schoolName: school.name,
      isActive: school.isActive,
      subscriptionExpiresAt: school.subscriptionExpiresAt,
    })

    return requestContext.run(
      {
        schoolId: school.id,
        isPlatformAdmin: false,
        userId: null,
        campusId: null,
        role: null,
        teacherId: null,
      },
      async () => {
        // 2. Check if user already exists in this school
        const existingUser = await this.prisma.user.findUnique({
          where: { email_schoolId: { email, schoolId: school.id } },
        })

        if (existingUser) {
          throw new ConflictException('User with this email already exists in this school')
        }

        // 3. Find the role (default to 'student' if not specified)
        const role = await this.prisma.role.findFirst({
          where: { slug: roleSlug || 'student', schoolId: school.id, campusId: null },
        })

        if (!role) {
          throw new NotFoundException('Role not found in this school')
        }

        // 4. Hash password and create user
        const passwordHash = await bcrypt.hash(password, 10)

        const user = await this.prisma.user.create({
          data: {
            email,
            passwordHash,
            firstName,
            lastName,
            schoolId: school.id,
            roleId: role.id,
          },
        })

        // 5. Generate tokens
        const tokens = this.generateTokens({
          sub: user.id,
          schoolId: user.schoolId,
          roleId: role.id,
          role: role.slug,
        })

        return {
          ...tokens,
          user: {
            id: user.id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            schoolId: user.schoolId,
            schoolName: school.name,
            schoolLogo: school.logo,
            schoolSettings: school.settings,
            role: role.slug,
            avatar: user.avatar,
          },
        }
      },
    )
  }

  async refreshToken(token: string): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      const payload = this.jwtService.verify<JwtPayload>(token, {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      })

      // Platform admin refresh
      if (payload.isPlatformAdmin) {
        const admin = await this.prisma.platformAdmin.findUnique({
          where: { id: payload.sub },
        })

        if (!admin || !admin.isActive) {
          throw new UnauthorizedException('Platform admin not found or deactivated')
        }

        return this.generateTokens({
          sub: admin.id,
          isPlatformAdmin: true,
        })
      }

      // Tenant user refresh — use unscoped lookup to avoid missing tenant-context issues
      const user = await this.prisma.unscopedClient.user.findUnique({
        where: { id: payload.sub },
        include: {
          role: { select: { slug: true } },
          teacher: { select: { id: true, classTeacherOfId: true } },
          school: {
            select: {
              id: true,
              name: true,
              isActive: true,
              subscriptionExpiresAt: true,
            },
          },
        },
      })

      if (!user || !user.isActive) {
        throw new UnauthorizedException('User not found or deactivated')
      }

      if (!user.school) {
        throw new UnauthorizedException('School not found')
      }

      assertSchoolAccessOrThrow({
        schoolId: user.school.id,
        schoolName: user.school.name,
        isActive: user.school.isActive,
        subscriptionExpiresAt: user.school.subscriptionExpiresAt,
      })

      return this.generateTokens({
        sub: user.id,
        schoolId: user.schoolId,
        roleId: user.roleId,
        role: user.role?.slug,
        teacherId: (user as any).teacher?.id || null,
      })
    } catch (error: any) {
      if (typeof error?.getStatus === 'function') {
        throw error
      }
      throw new UnauthorizedException('Invalid or expired refresh token')
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // PLATFORM ADMIN LOGIN
  // ═══════════════════════════════════════════════════════════════

  async getPlatformAdminProfile(adminId: string) {
    const admin = await this.prisma.platformAdmin.findUnique({
      where: { id: adminId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        isActive: true,
      },
    })

    if (!admin) {
      throw new NotFoundException('Platform admin not found')
    }

    return {
      ...admin,
      isPlatformAdmin: true,
      role: 'platform_admin',
    }
  }

  /**
   * Get the current user's profile by userId.
   * Uses unscopedClient since auth controller has no TenantGuard,
   * and Prisma extensions don't reliably inherit nested ALS contexts.
   */
  async getProfile(userId: string, schoolId: string) {
    const db = this.prisma.unscopedClient

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        avatar: true,
        isActive: true,
        schoolId: true,
        campusId: true,
        mustChangePassword: true,
        school: {
          select: {
            id: true,
            name: true,
            slug: true,
            logo: true,
            settings: true,
            isActive: true,
            subscriptionExpiresAt: true,
          },
        },
        role: { select: { id: true, name: true, slug: true } },
        campus: { select: { id: true, name: true, code: true } },
        teacher: { select: { id: true, classTeacherOfId: true } },
      },
    })

    if (!user) {
      throw new NotFoundException('User not found')
    }

    // Security: verify user belongs to the claimed school
    if (user.schoolId !== schoolId) {
      throw new UnauthorizedException('User does not belong to this school')
    }

    if (!user.school) {
      throw new UnauthorizedException('School not found')
    }

    assertSchoolAccessOrThrow({
      schoolId: user.school.id,
      schoolName: user.school.name,
      isActive: user.school.isActive,
      subscriptionExpiresAt: user.school.subscriptionExpiresAt,
    })

    const teacherId = (user as any).teacher?.id || null
    const classTeacherOfId = await this.resolveLegacyClassTeacherOfId(
      teacherId,
      schoolId,
      (user as any).teacher?.classTeacherOfId || null,
    )

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      avatar: user.avatar,
      isActive: user.isActive,
      schoolId: user.schoolId,
      schoolName: user.school?.name || null,
      schoolSlug: user.school?.slug || null,
      schoolLogo: user.school?.logo || null,
      schoolSettings: user.school?.settings || null,
      role: user.role.slug,
      isPlatformAdmin: false,
      campusId: user.campusId || null,
      campusName: user.campus?.name || null,
      teacherId,
      classTeacherOfId,
      mustChangePassword: (user as any).mustChangePassword ?? false,
    }
  }

  /**
   * Get all schools where a user with this email has an account.
   * Enables the school-switcher feature.
   *
   * Uses unscopedClient to bypass tenant isolation — intentionally
   * cross-tenant to find the same email across all schools.
   */
  async getMySchools(userId: string, currentSchoolId: string) {
    const db = this.prisma.unscopedClient

    const currentUser = await db.user.findUnique({
      where: { id: userId },
      select: { email: true, schoolId: true },
    })
    if (!currentUser) return { currentSchoolId: null, schools: [] }

    // Find all user records with same email across ALL schools
    const users = await db.user.findMany({
      where: { email: currentUser.email, isActive: true },
      select: {
        id: true,
        schoolId: true,
        school: { select: { id: true, name: true, slug: true, logo: true, isActive: true } },
        role: { select: { name: true, slug: true } },
      },
    })

    return {
      currentSchoolId: currentUser.schoolId,
      schools: users
        .filter((u) => u.school?.isActive)
        .map((u) => ({
          userId: u.id,
          schoolId: u.school!.id,
          schoolName: u.school!.name,
          schoolSlug: u.school!.slug,
          schoolLogo: u.school!.logo,
          role: u.role?.name || 'User',
          roleSlug: u.role?.slug || 'user',
          isCurrent: u.schoolId === currentUser.schoolId,
        })),
    }
  }

  /**
   * Switch to a different school (same email must exist in the target school).
   * Generates new JWT tokens scoped to the target school.
   *
   * Uses unscopedClient to bypass tenant isolation — intentionally
   * cross-tenant to find the user in the target school.
   */
  async switchSchool(userId: string, currentSchoolId: string, targetSchoolId: string) {
    const db = this.prisma.unscopedClient

    const currentUser = await db.user.findUnique({
      where: { id: userId },
      select: { email: true },
    })
    if (!currentUser) throw new UnauthorizedException('User not found')

    // Find the user account in the target school
    const targetUser = await db.user.findFirst({
      where: { email: currentUser.email, schoolId: targetSchoolId, isActive: true },
      include: {
        role: { select: { slug: true, name: true } },
        school: {
          select: {
            id: true,
            name: true,
            slug: true,
            isActive: true,
            subscriptionExpiresAt: true,
          },
        },
        teacher: { select: { id: true, classTeacherOfId: true } },
      },
    })

    if (!targetUser) throw new UnauthorizedException('No access to this school')
    if (!targetUser.school) throw new UnauthorizedException('School not found')

    assertSchoolAccessOrThrow({
      schoolId: targetUser.school.id,
      schoolName: targetUser.school.name,
      isActive: targetUser.school.isActive,
      subscriptionExpiresAt: targetUser.school.subscriptionExpiresAt,
    })

    // Generate new tokens for the target school context
    const tokens = this.generateTokens({
      sub: targetUser.id,
      schoolId: targetUser.schoolId,
      roleId: targetUser.roleId,
      role: targetUser.role?.slug,
      teacherId: (targetUser as any).teacher?.id || null,
    })

    const teacherId = (targetUser as any).teacher?.id || null
    const classTeacherOfId = await this.resolveLegacyClassTeacherOfId(
      teacherId,
      targetUser.schoolId,
      (targetUser as any).teacher?.classTeacherOfId || null,
    )

    return {
      ...tokens,
      user: {
        id: targetUser.id,
        email: targetUser.email,
        firstName: targetUser.firstName,
        lastName: targetUser.lastName,
        schoolId: targetUser.schoolId,
        schoolName: targetUser.school?.name,
        role: targetUser.role?.slug,
        avatar: targetUser.avatar,
        teacherId,
        classTeacherOfId,
        mustChangePassword: (targetUser as any).mustChangePassword ?? false,
      },
    }
  }

  private async resolveLegacyClassTeacherOfId(
    teacherId: string | null,
    schoolId: string | undefined,
    fallbackClassTeacherOfId: string | null,
  ): Promise<string | null> {
    if (fallbackClassTeacherOfId) {
      return fallbackClassTeacherOfId
    }

    if (!teacherId || !schoolId) {
      return null
    }

    const classTeacherRow = await this.prisma.unscopedClient.teacherClassAssignment.findFirst({
      where: {
        teacherId,
        schoolId,
        isActive: true,
        subjectId: null,
      },
      orderBy: { createdAt: 'asc' },
      select: { classId: true },
    })

    return classTeacherRow?.classId ?? null
  }

  /**
   * Get all permission slugs for a user's role.
   */
  async getUserPermissions(userId: string, roleId: string | null): Promise<string[]> {
    if (!roleId) return []

    const rolePermissions = await this.prisma.rolePermission.findMany({
      where: { roleId },
      include: { permission: { select: { slug: true } } },
    })

    return rolePermissions.map((rp) => rp.permission.slug)
  }

  /**
   * Change the current user's password.
   */
  async changePassword(
    userId: string,
    isPlatformAdmin: boolean,
    currentPassword: string,
    newPassword: string,
  ) {
    if (isPlatformAdmin) {
      const admin = await this.prisma.platformAdmin.findUnique({ where: { id: userId } })
      if (!admin) throw new NotFoundException('Admin not found')

      const isValid = await bcrypt.compare(currentPassword, admin.passwordHash)
      if (!isValid) throw new UnauthorizedException('Current password is incorrect')

      const newHash = await bcrypt.hash(newPassword, 10)
      await this.prisma.platformAdmin.update({
        where: { id: userId },
        data: { passwordHash: newHash },
      })
    } else {
      const user = await this.prisma.user.findUnique({ where: { id: userId } })
      if (!user) throw new NotFoundException('User not found')

      if (!user.passwordHash) {
        throw new UnauthorizedException('Users registered via Google cannot change passwords')
      }

      const isValid = await bcrypt.compare(currentPassword, user.passwordHash)
      if (!isValid) throw new UnauthorizedException('Current password is incorrect')

      const newHash = await bcrypt.hash(newPassword, 10)
      await this.prisma.user.update({
        where: { id: userId },
        data: { passwordHash: newHash, mustChangePassword: false },
      })
    }

    return { message: 'Password changed successfully' }
  }

  private generateTokens(payload: JwtPayload): { accessToken: string; refreshToken: string } {
    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get<string>('JWT_SECRET'),
      expiresIn: this.configService.get<string>('JWT_EXPIRATION', '15m'),
    })

    const refreshToken = this.jwtService.sign(
      {
        sub: payload.sub,
        schoolId: payload.schoolId,
        roleId: payload.roleId,
        role: payload.role,
        isPlatformAdmin: payload.isPlatformAdmin,
        teacherId: payload.teacherId,
      },
      {
        secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.configService.get<string>('JWT_REFRESH_EXPIRATION', '7d'),
      },
    )

    return { accessToken, refreshToken }
  }
}
