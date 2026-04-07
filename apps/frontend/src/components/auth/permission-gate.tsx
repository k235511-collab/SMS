'use client'

import type { ReactNode } from 'react'
import { useAuth } from '@/context/auth-context'
import type { PermissionSlug } from '@/lib/auth-types'

// ─── Permission gate ────────────────────────────────────────────────────────

interface PermissionGateProps {
  /** Single permission required */
  permission?: PermissionSlug
  /** ALL of these permissions are required */
  permissions?: PermissionSlug[]
  /** ANY of these permissions is sufficient */
  anyPermission?: PermissionSlug[]
  /** Rendered when the user has the required permission(s) */
  children: ReactNode
  /** Optional fallback when the user lacks permission */
  fallback?: ReactNode
}

/**
 * Declarative permission-based rendering.
 *
 * @example
 * ```tsx
 * <PermissionGate permission="students:create">
 *   <CreateStudentButton />
 * </PermissionGate>
 *
 * <PermissionGate anyPermission={['students:read', 'students:create']} fallback={<NoAccess />}>
 *   <StudentTable />
 * </PermissionGate>
 * ```
 */
export function PermissionGate({
  permission,
  permissions,
  anyPermission,
  children,
  fallback = null,
}: PermissionGateProps) {
  const { hasPermission, hasAllPermissions, hasAnyPermission } = useAuth()

  let allowed = true

  if (permission) {
    allowed = hasPermission(permission)
  } else if (permissions) {
    allowed = hasAllPermissions(...permissions)
  } else if (anyPermission) {
    allowed = hasAnyPermission(...anyPermission)
  }

  return allowed ? <>{children}</> : <>{fallback}</>
}

// ─── Role gate ──────────────────────────────────────────────────────────────

interface RoleGateProps {
  /** Required role slug (e.g. 'admin', 'teacher') */
  role?: string
  /** Any of these roles is sufficient */
  roles?: string[]
  children: ReactNode
  fallback?: ReactNode
}

/**
 * Declarative role-based rendering.
 *
 * @example
 * ```tsx
 * <RoleGate role="admin">
 *   <AdminPanel />
 * </RoleGate>
 *
 * <RoleGate roles={['admin', 'teacher']}>
 *   <GradeEntry />
 * </RoleGate>
 * ```
 */
export function RoleGate({ role, roles, children, fallback = null }: RoleGateProps) {
  const { hasRole } = useAuth()

  let allowed = false

  if (role) {
    allowed = hasRole(role)
  } else if (roles) {
    allowed = roles.some((r) => hasRole(r))
  }

  return allowed ? <>{children}</> : <>{fallback}</>
}

// ─── Platform admin only ────────────────────────────────────────────────────

interface PlatformOnlyProps {
  children: ReactNode
  fallback?: ReactNode
}

/**
 * Only renders children for platform admins.
 *
 * @example
 * ```tsx
 * <PlatformOnly>
 *   <ManageSchoolsButton />
 * </PlatformOnly>
 * ```
 */
export function PlatformOnly({ children, fallback = null }: PlatformOnlyProps) {
  const { isPlatformAdmin } = useAuth()
  return isPlatformAdmin ? <>{children}</> : <>{fallback}</>
}
