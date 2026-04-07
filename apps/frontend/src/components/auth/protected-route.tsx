'use client'

import { useEffect, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/context/auth-context'
import type { PermissionSlug } from '@/lib/auth-types'

interface ProtectedRouteProps {
  children: ReactNode
  /** Required permission to access this route */
  permission?: PermissionSlug
  /** ALL of these permissions required */
  permissions?: PermissionSlug[]
  /** Required role slug */
  role?: string
  /** Any of these roles is sufficient */
  roles?: string[]
  /** Redirect path when access denied (default: /dashboard) */
  redirectTo?: string
  /** Custom loading component */
  loadingComponent?: ReactNode
}

/**
 * Client-side route guard that checks authentication + authorization.
 * Use this to wrap page content for client-rendered protected pages.
 *
 * The Edge middleware handles the first layer (cookie presence).
 * This component handles the second layer (permissions/roles).
 *
 * @example
 * ```tsx
 * export default function AdminPage() {
 *   return (
 *     <ProtectedRoute role="admin">
 *       <AdminContent />
 *     </ProtectedRoute>
 *   )
 * }
 * ```
 */
export function ProtectedRoute({
  children,
  permission,
  permissions,
  role,
  roles,
  redirectTo = '/dashboard',
  loadingComponent,
}: ProtectedRouteProps) {
  const {
    isAuthenticated,
    isLoading,
    user,
    hasPermission,
    hasAllPermissions,
    hasRole,
  } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (isLoading) return

    if (!isAuthenticated) {
      router.replace('/login')
      return
    }

    let allowed = true

    if (permission) {
      allowed = hasPermission(permission)
    } else if (permissions) {
      allowed = hasAllPermissions(...permissions)
    }

    if (allowed && role) {
      allowed = hasRole(role)
    } else if (allowed && roles) {
      allowed = roles.some((r) => hasRole(r))
    }

    if (!allowed) {
      router.replace(redirectTo)
    }
  }, [
    isAuthenticated,
    isLoading,
    user,
    permission,
    permissions,
    role,
    roles,
    redirectTo,
    router,
    hasPermission,
    hasAllPermissions,
    hasRole,
  ])

  if (isLoading) {
    return (
      loadingComponent ?? (
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary-200 border-t-primary-600" />
        </div>
      )
    )
  }

  if (!isAuthenticated) return null

  return <>{children}</>
}
