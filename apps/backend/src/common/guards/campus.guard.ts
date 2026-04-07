import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

/**
 * Campus Security Guard
 *
 * Runs AFTER JwtAuthGuard. Inspects the `x-campus-id` header:
 *
 * - Platform admins & super_admins → no restriction (can query any campus)
 * - Users with `campusId = NULL` (admins) → no restriction
 * - Users with `campusId` set (principals, teachers) →
 *     • If no x-campus-id header → auto-inject their campus id
 *     • If x-campus-id matches their campus → allow
 *     • If x-campus-id differs → 403 Forbidden
 *
 * This guard turns the campus header from a voluntary filter into
 * a security boundary for campus-scoped users.
 */
@Injectable()
export class CampusGuard implements CanActivate {
  private readonly logger = new Logger(CampusGuard.name)

  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()
    const user = request.user

    // Not authenticated yet — let JwtAuthGuard handle it
    if (!user) return true

    // Platform admin — no campus restriction
    if (user.isPlatformAdmin === true) return true

    // Must have a userId to resolve campus
    if (!user.userId) return true

    // Resolve user's assigned campus (with request-scope caching)
    const userCampusId = await this.resolveUserCampus(request, user)

    // User has no campus assignment (super_admin, admin) — allow any campus
    if (!userCampusId) return true

    // User IS campus-scoped — enforce
    const requestedCampusId = request.headers['x-campus-id']

    if (!requestedCampusId) {
      // No campus header sent — auto-inject so data is always scoped
      request.headers['x-campus-id'] = userCampusId
      return true
    }

    if (requestedCampusId === userCampusId) {
      return true
    }

    // Mismatch — campus-scoped user trying to access another campus
    this.logger.warn(
      `User ${user.userId} (campus ${userCampusId}) attempted to access campus ${requestedCampusId}`,
    )
    throw new ForbiddenException(
      'You do not have access to this campus. You can only view data from your assigned campus.',
    )
  }

  /**
   * Resolve and cache the user's assigned campusId from DB.
   * Returns null if user has no campus (admin / super_admin).
   */
  private async resolveUserCampus(
    request: any,
    user: any,
  ): Promise<string | null> {
    // Return from request-scope cache
    if (request.__userCampusId !== undefined) {
      return request.__userCampusId
    }

    try {
      const dbUser = await this.prisma.unscopedClient.user.findUnique({
        where: { id: user.userId },
        select: {
          campusId: true,
          role: { select: { slug: true } },
        },
      })

      // Super-admin always gets unrestricted access
      if (dbUser?.role?.slug === 'super_admin') {
        request.__userCampusId = null
        return null
      }

      const campusId = dbUser?.campusId ?? null
      request.__userCampusId = campusId
      return campusId
    } catch (error) {
      this.logger.error(`Failed to resolve campus for user ${user.userId}`, error)
      request.__userCampusId = null
      return null
    }
  }
}
