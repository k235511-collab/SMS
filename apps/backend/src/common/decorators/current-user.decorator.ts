import { createParamDecorator, ExecutionContext } from '@nestjs/common'

/**
 * Extracts the current authenticated user from the request.
 * Optionally pass a field name to extract a specific property.
 */
export const CurrentUser = createParamDecorator(
  (data: string | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest()
    const user = request.user
    return data ? user?.[data] : user
  },
)
