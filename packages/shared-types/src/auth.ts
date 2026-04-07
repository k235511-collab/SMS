/** Authentication-related DTOs — aligned with backend auth module */

export interface LoginDto {
  email: string
  password: string
  schoolSlug: string
}

export interface RegisterDto {
  email: string
  password: string
  firstName: string
  lastName: string
  schoolSlug: string
  roleSlug?: string
}

export interface PlatformLoginDto {
  email: string
  password: string
}

export interface RefreshTokenDto {
  refreshToken: string
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface AuthUser {
  id: string
  email: string
  firstName: string
  lastName: string
  schoolId?: string
  role?: string
  isPlatformAdmin?: boolean
  campusId?: string | null
  campusName?: string | null
}

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  user: AuthUser
}
