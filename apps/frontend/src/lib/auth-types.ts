// ─── Auth types aligned with backend API contract ───────────────────────────

/** JWT payload shape (lean — permissions resolved from DB) */
export interface JwtPayload {
  sub: string
  schoolId?: string
  roleId?: string
  isPlatformAdmin?: boolean
  iat: number
  exp: number
}

/** Login request — matches backend LoginDto */
export interface LoginCredentials {
  email: string
  password: string
  schoolSlug?: string
}

/** Register request — matches backend RegisterDto */
export interface RegisterCredentials {
  email: string
  password: string
  firstName: string
  lastName: string
  schoolSlug: string
  roleSlug?: string
}

/** Platform admin login — matches backend PlatformLoginDto */
export interface PlatformLoginCredentials {
  email: string
  password: string
}

/** Auth response from backend — matches AuthResult */
export interface AuthResult {
  accessToken: string
  refreshToken: string
  user: AuthUser
}

/** User shape returned from auth endpoints */
export interface AuthUser {
  id: string
  email: string
  firstName: string
  lastName: string
  schoolId?: string
  schoolName?: string
  schoolSlug?: string
  schoolLogo?: string | null
  avatar?: string | null
  schoolSettings?: any
  role?: string
  isPlatformAdmin?: boolean
  /** The campus this user is permanently assigned to (null = school-wide access) */
  campusId?: string | null
  campusName?: string | null
  /** Teacher record ID for this user (null if not a teacher) */
  teacherId?: string | null
  /** Class ID this teacher is class teacher of (null if subject teacher only) */
  classTeacherOfId?: string | null
  /** When true, user must change password before using the app */
  mustChangePassword?: boolean
}

/** Permission slug type — mirrors backend PermissionSlug */
export type PermissionSlug = string

/** Shape stored in auth context */
export interface AuthState {
  user: AuthUser | null
  permissions: PermissionSlug[]
  isAuthenticated: boolean
  isLoading: boolean
  isPlatformAdmin: boolean
}
