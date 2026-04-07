import { SetMetadata } from '@nestjs/common'
import { PermissionSlug } from '../constants'

export const PERMISSIONS_KEY = 'permissions'

/**
 * Requires one or more permissions to access an endpoint.
 *
 * @example
 * ```ts
 * @RequirePermission(Permission.CREATE_STUDENT)
 * @RequirePermission(Permission.CREATE_STUDENT, Permission.READ_STUDENT)
 * ```
 *
 * Platform admins (`isPlatformAdmin`) bypass this check entirely.
 * The `super_admin` role also bypasses all permission checks.
 */
export const RequirePermission = (...permissions: PermissionSlug[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions)
