import { Injectable, NestMiddleware } from '@nestjs/common'
import { Request, Response, NextFunction } from 'express'
import { requestContext, RequestContext } from '../context'

/**
 * Extracts school context from subdomain / header / JWT and wraps the
 * rest of the request lifecycle inside an AsyncLocalStorage context.
 *
 * Downstream code (Prisma middleware, guards, services) can call
 * `getRequestContext()` from anywhere in the call stack — no DI needed.
 *
 * Why a NestJS middleware and not an interceptor?
 *  → Middleware runs before guards, so PrismaService can access the
 *    context even during guard-level DB queries.
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    // Subdomain extraction (e.g. acme.sms.io → "acme")
    const host = req.headers.host || ''
    const parts = host.split('.')
    if (parts.length >= 3) {
      ;(req as any).schoolSlug = parts[0]
    }

    // schoolId comes from the JWT payload (set by JwtStrategy → req.user)
    // or from the x-school-id header (for service-to-service calls).
    // At this point in the lifecycle req.user may NOT be populated yet
    // (guards run after middleware), so we only read the header here.
    // The TenantGuard will overwrite req.schoolId with the JWT value.
    const headerSchoolId = req.headers['x-school-id'] as string | undefined

    const ctx: RequestContext = {
      schoolId: headerSchoolId ?? null,
      userId: null,
      campusId: null,
      role: null,
      isPlatformAdmin: false,
      teacherId: null,
    }

    // Wrap the rest of the request in the async context
    requestContext.run(ctx, () => next())
  }
}
