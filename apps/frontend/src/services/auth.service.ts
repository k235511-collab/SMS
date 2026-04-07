import Cookies from 'js-cookie'
import env from '@/lib/env'
import { api } from '@/lib/api-client'
import type {
  AuthResult,
  AuthUser,
  LoginCredentials,
  RegisterCredentials,
  PlatformLoginCredentials,
  PermissionSlug,
} from '@/lib/auth-types'

// ─── Cookie management ──────────────────────────────────────────────────────

function setAuthCookies(result: AuthResult): void {
  const secure = typeof window !== 'undefined' && window.location.protocol === 'https:'

  Cookies.set(env.ACCESS_TOKEN_COOKIE, result.accessToken, {
    expires: env.ACCESS_TOKEN_MAX_AGE / 86400,
    sameSite: 'lax',
    secure,
  })

  Cookies.set(env.REFRESH_TOKEN_COOKIE, result.refreshToken, {
    expires: env.REFRESH_TOKEN_MAX_AGE / 86400,
    sameSite: 'lax',
    secure,
  })

  if (result.user.schoolId) {
    Cookies.set(env.SCHOOL_ID_COOKIE, result.user.schoolId, {
      expires: env.REFRESH_TOKEN_MAX_AGE / 86400,
      sameSite: 'lax',
      secure,
    })
  }

  // If user is campus-locked, pre-set the campus cookie so the very first
  // API calls after login use the correct campus ID.
  if (result.user.campusId) {
    Cookies.set('sms_selected_campus_id', result.user.campusId, {
      expires: env.REFRESH_TOKEN_MAX_AGE / 86400,
      sameSite: 'lax',
      secure,
    })
  }
}

function clearAuthCookies(): void {
  Cookies.remove(env.ACCESS_TOKEN_COOKIE)
  Cookies.remove(env.REFRESH_TOKEN_COOKIE)
  Cookies.remove(env.SCHOOL_ID_COOKIE)
  Cookies.remove('sms_selected_campus_id')
}

// ─── Auth service ───────────────────────────────────────────────────────────

export const authService = {
  /**
   * Login a tenant user (school-scoped).
   * Stores tokens in cookies and returns the auth user.
   */
  async login(credentials: LoginCredentials): Promise<AuthUser> {
    const res = await api.post<AuthResult>('/auth/login', credentials, {
      noAuth: true,
    })

    if (!res.success || !res.data) {
      throw new AuthError(res.message || 'Login failed', res.statusCode)
    }

    setAuthCookies(res.data)
    return res.data.user
  },

  /**
   * Login with Google OAuth.
   * schoolSlug is optional — if omitted, looks up user globally by email.
   */
  async loginWithGoogle(credential: string, schoolSlug?: string): Promise<AuthUser> {
    const res = await api.post<AuthResult>('/auth/google', { credential, schoolSlug }, {
      noAuth: true,
    })

    if (!res.success || !res.data) {
      throw new AuthError(res.message || 'Google Login failed', res.statusCode)
    }

    setAuthCookies(res.data)
    return res.data.user
  },

  /**
   * Register a new user in a school.
   */
  async register(credentials: RegisterCredentials): Promise<AuthUser> {
    const res = await api.post<AuthResult>('/auth/register', credentials, {
      noAuth: true,
    })

    if (!res.success || !res.data) {
      throw new AuthError(res.message || 'Registration failed', res.statusCode)
    }

    setAuthCookies(res.data)
    return res.data.user
  },

  /**
   * Logout — clear all auth cookies and redirect to login.
   */
  logout(): void {
    clearAuthCookies()
    if (typeof window !== 'undefined') {
      window.location.href = '/login'
    }
  },

  /**
   * Fetch the current user's profile (validates that the session is alive).
   */
  async getMe(): Promise<AuthUser | null> {
    const res = await api.get<AuthUser>('/auth/me')
    if (!res.success || !res.data) return null

    return res.data
  },

  /**
   * Fetch the current user's permission slugs.
   * Used by the `usePermissions` hook and role-based rendering.
   */
  async getMyPermissions(): Promise<PermissionSlug[]> {
    const res = await api.get<{ permissions: PermissionSlug[] }>('/auth/me/permissions')
    if (!res.success || !res.data) return []
    return res.data.permissions
  },

  /** Check if there's a valid session (access or refresh token present) */
  isLoggedIn(): boolean {
    return !!Cookies.get(env.ACCESS_TOKEN_COOKIE) || !!Cookies.get(env.REFRESH_TOKEN_COOKIE)
  },

  /** Get the stored school ID */
  getSchoolId(): string | undefined {
    return Cookies.get(env.SCHOOL_ID_COOKIE)
  },

  /** Get all schools the current user can switch to */
  async getMySchools(): Promise<{ currentSchoolId: string | null; schools: SchoolSwitchItem[] }> {
    const res = await api.get<{ currentSchoolId: string | null; schools: SchoolSwitchItem[] }>('/auth/my-schools')
    if (!res.success || !res.data) return { currentSchoolId: null, schools: [] }
    return res.data
  },

  /** Switch to a different school (same email must exist) */
  async switchSchool(schoolId: string): Promise<AuthUser> {
    const res = await api.post<AuthResult>('/auth/switch-school', { schoolId })
    if (!res.success || !res.data) {
      throw new AuthError(res.message || 'Switch failed', res.statusCode)
    }
    setAuthCookies(res.data)
    return res.data.user
  },
} as const

/** Shape of a school item in the switcher */
export interface SchoolSwitchItem {
  userId: string
  schoolId: string
  schoolName: string
  schoolSlug: string
  schoolLogo: string | null
  role: string
  roleSlug: string
  isCurrent: boolean
}

// ─── Auth error class ───────────────────────────────────────────────────────

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly statusCode?: number,
  ) {
    super(message)
    this.name = 'AuthError'
  }
}
