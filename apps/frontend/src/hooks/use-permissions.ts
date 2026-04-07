'use client'

import { useAuth } from '@/context/auth-context'
import type { PermissionSlug } from '@/lib/auth-types'

/**
 * Hook for permission-based conditional rendering and access checks.
 *
 * @example
 * ```tsx
 * const { can, canAll, canAny } = usePermissions()
 *
 * if (can('students:create')) {
 *   // show create button
 * }
 * ```
 */
export function usePermissions() {
  const { hasPermission, hasAllPermissions, hasAnyPermission, isPlatformAdmin } =
    useAuth()

  return {
    /** Check a single permission */
    can: (permission: PermissionSlug) => hasPermission(permission),

    /** Check that ALL permissions are present */
    canAll: (...permissions: PermissionSlug[]) => hasAllPermissions(...permissions),

    /** Check that ANY permission is present */
    canAny: (...permissions: PermissionSlug[]) => hasAnyPermission(...permissions),

    /** True if the user is a platform admin (all permissions) */
    isPlatformAdmin,
  }
}
