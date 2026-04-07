import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { PERMISSIONS_KEY } from '../decorators'
import { PrismaService } from '../../prisma/prisma.service'

/**
 * Enterprise RBAC Permission Guard
 *
 * Evaluation order:
 * 1. No `@RequirePermission()` on handler → allow (open endpoint)
 * 2. No authenticated user → 403
 * 3. Platform admin (`isPlatformAdmin === true`) → allow (full bypass)
 * 4. Resolve permissions from request-scope cache or DB
 *    – If role slug is 'super_admin' → allow (full bypass via '*' sentinel)
 * 5. Verify every required permission exists in user's set → allow or 403
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  private readonly logger = new Logger(PermissionsGuard.name)

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Read required permissions from decorator metadata
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [
      context.getHandler(),
      context.getClass(),
    ])

    // No decorator → open endpoint
    if (!required || required.length === 0) {
      return true
    }

    const request = context.switchToHttp().getRequest()
    const user = request.user

    // 2. Must be authenticated
    if (!user) {
      throw new ForbiddenException('Authentication required')
    }

    // 3. Platform admin bypasses all RBAC checks
    if (user.isPlatformAdmin === true) {
      return true
    }

    // 4. Resolve permission slugs (request-scope cache → DB)
    const permissions = await this.resolvePermissions(request, user)

    // Super-admin bypass — resolvePermissions returns ['*'] for super_admin role
    if (permissions.includes('*')) {
      return true
    }

    // 5. Every required permission must exist in user's set
    const permissionSet = new Set(permissions)
    const missing = required.filter((p) => !permissionSet.has(p))

    if (missing.length > 0) {
      this.logger.warn(
        `User ${user.userId} denied: missing [${missing.join(', ')}]`,
      )
      throw new ForbiddenException(
        `Insufficient permissions. Missing: ${missing.join(', ')}`,
      )
    }

    return true
  }

  /**
   * Returns the user's permission slugs from the request-scope cache
   * or falls back to a DB lookup via userId.
   * Returns `['*']` as a sentinel for super_admin role (full bypass).
   */
  private async resolvePermissions(
    request: any,
    user: any,
  ): Promise<string[]> {
    // Return from request-scope cache if already resolved
    if (request.__permissions) {
      return request.__permissions
    }

    // Must have userId to query DB
    if (!user.userId) {
      request.__permissions = []
      return []
    }

    try {
      const dbUser = await this.prisma.user.findUnique({
        where: { id: user.userId },
        select: {
          role: {
            select: {
              slug: true,
              permissions: {
                select: {
                  permission: {
                    select: { slug: true },
                  },
                },
              },
            },
          },
        },
      })

      // Super-admin bypass — grant all permissions
      if (dbUser?.role?.slug === 'super_admin') {
        request.__permissions = ['*']
        return ['*']
      }

      const slugs =
        dbUser?.role?.permissions?.map((rp) => rp.permission.slug) ?? []

      // Cache in request scope — subsequent guard calls in same request skip DB
      request.__permissions = slugs
      return slugs
    } catch (error) {
      this.logger.error(`Failed to load permissions for user ${user.userId}`, error)
      request.__permissions = []
      return []
    }
  }
}
