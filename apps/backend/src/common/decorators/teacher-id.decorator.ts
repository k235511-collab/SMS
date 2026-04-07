import { createParamDecorator, ExecutionContext } from '@nestjs/common'

/**
 * Extracts the teacherId from the authenticated user's JWT payload.
 * Returns null when the current user is not a teacher.
 */
export const TeacherId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | null => {
    const request = ctx.switchToHttp().getRequest()
    return request.user?.teacherId ?? request.user?.teacherProfileId ?? null
  },
)
