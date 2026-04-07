import { createParamDecorator, ExecutionContext } from '@nestjs/common'

/**
 * Extracts the optional campusId from the x-campus-id request header.
 * Returns undefined when no campus is selected (i.e. "All Campuses").
 */
export const CampusId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest()
    const campusId = request.headers['x-campus-id']
    return campusId || undefined
  },
)
