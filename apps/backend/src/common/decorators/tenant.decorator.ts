import { createParamDecorator, ExecutionContext } from '@nestjs/common'

/**
 * Extracts the schoolId from the authenticated user's JWT payload
 * or falls back to the x-school-id header.
 */
export const TenantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest()
    return request.schoolId
  },
)
