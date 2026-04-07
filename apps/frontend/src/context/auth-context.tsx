'use client'

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  useRef,
  type ReactNode,
} from 'react'
import Cookies from 'js-cookie'
import { authService } from '@/services/auth.service'
import env from '@/lib/env'
import { tryRefresh } from '@/lib/api-client'
import type {
  AuthState,
  AuthUser,
  LoginCredentials,
  RegisterCredentials,
  PermissionSlug,
} from '@/lib/auth-types'

// ─── Context shape ──────────────────────────────────────────────────────────

interface AuthContextValue extends AuthState {
  login: (credentials: LoginCredentials) => Promise<AuthUser>
  loginWithGoogle: (credential: string, schoolSlug?: string) => Promise<AuthUser>
  register: (credentials: RegisterCredentials) => Promise<AuthUser>
  logout: () => void
  /** Switch to a different school (same email must exist in target school) */
  switchSchool: (schoolId: string) => Promise<void>
  /** Check if the current user has a specific permission */
  hasPermission: (permission: PermissionSlug) => boolean
  /** Check if the current user has ALL of the specified permissions */
  hasAllPermissions: (...permissions: PermissionSlug[]) => boolean
  /** Check if the current user has ANY of the specified permissions */
  hasAnyPermission: (...permissions: PermissionSlug[]) => boolean
  /** Check if the user has a specific role slug */
  hasRole: (role: string) => boolean
  /** True when the user is permanently assigned to a single campus (e.g. principal, teacher) */
  isCampusLocked: boolean
  /** Manually refresh the current user profile from the backend */
  refreshUser: () => Promise<void>
  /** Manually update the current user state locally */
  updateUser: (data: Partial<AuthUser>) => void
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

// ─── Provider ───────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [permissions, setPermissions] = useState<PermissionSlug[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Proactive token refresh — runs every 13 minutes ──
  // Refreshes the access token 2 minutes before its 15-minute expiry
  const startProactiveRefresh = useCallback(() => {
    // Clear any existing interval
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current)
    }

    const REFRESH_INTERVAL = 13 * 60 * 1000 // 13 minutes

    refreshIntervalRef.current = setInterval(async () => {
      const refreshToken = Cookies.get(env.REFRESH_TOKEN_COOKIE)
      if (!refreshToken) {
        // No refresh token — stop the timer
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current)
          refreshIntervalRef.current = null
        }
        return
      }

      try {
        await tryRefresh()
      } catch {
        // Silent failure — the next API call will also attempt refresh
      }
    }, REFRESH_INTERVAL)
  }, [])

  // ── Bootstrap: check if session exists on mount ──
  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      const hasAccessToken = authService.isLoggedIn()
      const hasRefreshToken = !!Cookies.get(env.REFRESH_TOKEN_COOKIE)

      // No tokens at all — not logged in
      if (!hasAccessToken && !hasRefreshToken) {
        setIsLoading(false)
        return
      }

      // If access token is missing but refresh token exists, try refreshing first
      if (!hasAccessToken && hasRefreshToken) {
        const newToken = await tryRefresh()
        if (!newToken) {
          // Refresh failed — session is truly expired
          setIsLoading(false)
          return
        }
      }

      try {
        const [me, perms] = await Promise.all([
          authService.getMe(),
          authService.getMyPermissions(),
        ])

        if (cancelled) return

        if (me) {
          setUser(me)
          setPermissions(perms)
          // Start proactive refresh timer after successful bootstrap
          startProactiveRefresh()
        } else {
          // Token is invalid / expired
          authService.logout()
        }
      } catch {
        if (!cancelled) authService.logout()
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    bootstrap()
    return () => {
      cancelled = true
      // Clean up the refresh interval on unmount
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
        refreshIntervalRef.current = null
      }
    }
  }, [startProactiveRefresh])

  // ── Login ──
  const login = useCallback(async (credentials: LoginCredentials) => {
    const me = await authService.login(credentials)
    setUser(me)
    const perms = await authService.getMyPermissions()
    setPermissions(perms)
    startProactiveRefresh()
    return me
  }, [startProactiveRefresh])

  const loginWithGoogle = useCallback(async (credential: string, schoolSlug?: string) => {
    const me = await authService.loginWithGoogle(credential, schoolSlug)
    setUser(me)
    const perms = await authService.getMyPermissions()
    setPermissions(perms)
    startProactiveRefresh()
    return me
  }, [startProactiveRefresh])

  // ── Register ──
  const register = useCallback(async (credentials: RegisterCredentials) => {
    const me = await authService.register(credentials)
    setUser(me)
    const perms = await authService.getMyPermissions()
    setPermissions(perms)
    startProactiveRefresh()
    return me
  }, [startProactiveRefresh])


  // ── Logout ──
  const logout = useCallback(() => {
    // Stop the proactive refresh timer
    if (refreshIntervalRef.current) {
      clearInterval(refreshIntervalRef.current)
      refreshIntervalRef.current = null
    }
    localStorage.removeItem('sms_last_school_logo')
    localStorage.removeItem('sms_last_school_name')
    setUser(null)
    setPermissions([])
    authService.logout()
  }, [])

  // ── Refresh User ──
  const refreshUser = useCallback(async () => {
    try {
      const me = await authService.getMe()
      if (me) {
        setUser(me)
      }
    } catch (error) {
      console.error('Failed to refresh user:', error)
    }
  }, [])

  // ── Update User Locally ──
  const updateUser = useCallback((data: Partial<AuthUser>) => {
    setUser(prev => prev ? { ...prev, ...data } : null)
  }, [])

  // ── Switch School ──
  const switchSchool = useCallback(async (schoolId: string) => {
    const me = await authService.switchSchool(schoolId)
    setUser(me)
    const perms = await authService.getMyPermissions()
    setPermissions(perms)
  }, [])

  // ── Permission helpers ──
  const hasPermission = useCallback(
    (permission: PermissionSlug) => {
      if (permissions.includes('*')) return true
      return permissions.includes(permission)
    },
    [permissions],
  )

  const hasAllPermissions = useCallback(
    (...perms: PermissionSlug[]) =>
      perms.every((p) => hasPermission(p)),
    [hasPermission],
  )

  const hasAnyPermission = useCallback(
    (...perms: PermissionSlug[]) =>
      perms.some((p) => hasPermission(p)),
    [hasPermission],
  )

  const hasRole = useCallback(
    (role: string) => user?.role === role || user?.isPlatformAdmin === true,
    [user],
  )

  // ── Campus lock check ──
  // A user is campus-locked when they have an assigned campusId and are NOT
  // a platform_admin, super_admin, or admin (who can see all campuses).
  const isCampusLocked = useMemo(() => {
    if (!user?.campusId) return false
    if (user.isPlatformAdmin) return false
    const freeRoles = ['super_admin', 'admin']
    return !freeRoles.includes(user.role ?? '')
  }, [user])

  // ── Sync branding to localStorage for SplashScreen ──
  useEffect(() => {
    if (user) {
      if (user.schoolLogo) localStorage.setItem('sms_last_school_logo', user.schoolLogo)
      if (user.schoolName) localStorage.setItem('sms_last_school_name', user.schoolName)
    }
  }, [user])

  // ── Memoized context value ──
  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      permissions,
      isAuthenticated: !!user,
      isLoading,
      isPlatformAdmin: user?.isPlatformAdmin ?? false,
      login,
      loginWithGoogle,
      register,
      logout,
      switchSchool,
      hasPermission,
      hasAllPermissions,
      hasAnyPermission,
      hasRole,
      isCampusLocked,
      refreshUser,
      updateUser,
    }),
    [
      user,
      permissions,
      isLoading,
      login,
      loginWithGoogle,
      register,
      logout,
      switchSchool,
      hasPermission,
      hasAllPermissions,
      hasAnyPermission,
      hasRole,
      isCampusLocked,
      refreshUser,
      updateUser,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an <AuthProvider>')
  }
  return context
}
