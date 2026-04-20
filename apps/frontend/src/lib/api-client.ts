import Cookies from 'js-cookie'
import env from './env'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  message?: string
  code?: string
  meta?: Record<string, unknown>
  errors?: Record<string, string[]>
  statusCode?: number
}

export interface ApiError {
  message: string
  statusCode: number
  code?: string
  meta?: Record<string, unknown>
  errors?: Record<string, string[]>
}

export type RequestMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'

interface RequestOptions {
  method?: RequestMethod
  body?: unknown
  headers?: Record<string, string>
  /** Override school-id header for this request */
  schoolId?: string
  /** Skip attaching auth token */
  noAuth?: boolean
  /** Query params appended to the URL */
  params?: Record<string, string | number | boolean | undefined>
  /** Request timeout in ms (default: 30s) */
  timeout?: number
  /** Next.js fetch cache/revalidation options */
  next?: NextFetchRequestConfig
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildUrl(
  endpoint: string,
  params?: Record<string, string | number | boolean | undefined>,
): string {
  const url = new URL(`${env.API_URL}${endpoint}`)

  if (params) {
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== '') {
        url.searchParams.set(key, String(value))
      }
    }
  }

  return url.toString()
}

function getAccessToken(): string | undefined {
  if (typeof window === 'undefined') return undefined
  return Cookies.get(env.ACCESS_TOKEN_COOKIE)
}

function getSchoolId(): string | undefined {
  if (typeof window === 'undefined') return undefined
  return Cookies.get(env.SCHOOL_ID_COOKIE)
}

function getCampusId(): string | undefined {
  if (typeof window === 'undefined') return undefined
  return Cookies.get('sms_selected_campus_id')
}

const PLAN_EXPIRED_CODE = 'PLAN_EXPIRED'
const PUBLIC_PATHS = new Set(['/', '/login', '/register', '/forgot-password', '/plan-expired'])

let lastRefreshFailure:
  | { code?: string; message?: string; meta?: Record<string, unknown> }
  | null = null

function toRecord(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined
  return value as Record<string, unknown>
}

function readMetaString(meta: Record<string, unknown> | undefined, key: string): string | undefined {
  const value = meta?.[key]
  return typeof value === 'string' && value.length > 0 ? value : undefined
}

function buildPlanExpiredUrl(
  message?: string,
  meta?: Record<string, unknown>,
  code = PLAN_EXPIRED_CODE,
): string {
  const params = new URLSearchParams()
  params.set('code', code)

  const schoolName = readMetaString(meta, 'schoolName')
  const expiry = readMetaString(meta, 'subscriptionExpiresAt')

  if (message) params.set('message', message)
  if (schoolName) params.set('schoolName', schoolName)
  if (expiry) params.set('expiry', expiry)

  const query = params.toString()
  return query ? `/plan-expired?${query}` : '/plan-expired'
}

function maybeRedirectToPlanExpired(
  code?: string,
  message?: string,
  meta?: Record<string, unknown>,
) {
  if (typeof window === 'undefined') return
  if (code !== PLAN_EXPIRED_CODE) return
  if (window.location.pathname === '/plan-expired') return
  if (PUBLIC_PATHS.has(window.location.pathname)) return

  window.location.href = buildPlanExpiredUrl(message, meta)
}

// ─── Token refresh logic ────────────────────────────────────────────────────

let refreshPromise: Promise<string | null> | null = null

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = Cookies.get(env.REFRESH_TOKEN_COOKIE)
  if (!refreshToken) return null

  try {
    const res = await fetch(`${env.API_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })

    if (!res.ok) {
      const failurePayload = await res.json().catch(() => ({}))
      const failureCode =
        typeof failurePayload?.code === 'string' ? failurePayload.code : undefined
      const failureMessage =
        typeof failurePayload?.message === 'string' ? failurePayload.message : undefined
      const failureMeta = toRecord(failurePayload?.meta)

      lastRefreshFailure = {
        code: failureCode,
        message: failureMessage,
        meta: failureMeta,
      }

      maybeRedirectToPlanExpired(failureCode, failureMessage, failureMeta)
      return null
    }

    const envelope = await res.json().catch(() => ({}))
    const data = envelope.data || envelope
    const { accessToken, refreshToken: newRefresh } = data

    lastRefreshFailure = null

    Cookies.set(env.ACCESS_TOKEN_COOKIE, accessToken, {
      expires: env.ACCESS_TOKEN_MAX_AGE / 86400,
      sameSite: 'lax',
      secure: window.location.protocol === 'https:',
    })

    if (newRefresh) {
      Cookies.set(env.REFRESH_TOKEN_COOKIE, newRefresh, {
        expires: env.REFRESH_TOKEN_MAX_AGE / 86400,
        sameSite: 'lax',
        secure: window.location.protocol === 'https:',
      })
    }

    return accessToken as string
  } catch {
    lastRefreshFailure = null
    return null
  }
}

/**
 * Coalesces concurrent refresh attempts into a single request.
 * Prevents thundering herd on 401 responses.
 * Exported so auth-context can use it for proactive refresh.
 */
export async function tryRefresh(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

// ─── Core fetch wrapper ─────────────────────────────────────────────────────

/**
 * Centralized API client.
 *
 * - Attaches JWT from cookies automatically
 * - Sends `x-school-id` header for tenant context
 * - Auto-refreshes on 401 (once) then retries
 * - Converts non-2xx responses into typed ApiError
 * - Supports AbortController timeout
 */
export async function apiClient<T>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<ApiResponse<T>> {
  const {
    method = 'GET',
    body,
    headers = {},
    schoolId,
    noAuth = false,
    params,
    timeout = 30_000,
    next: nextConfig,
  } = options

  const url = buildUrl(endpoint, params)

  const isFormData = body instanceof FormData
  const requestHeaders: Record<string, string> = {
    ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
    ...headers,
  }

  // Attach auth token
  if (!noAuth) {
    const token = getAccessToken()
    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`
    }
  }

  // Attach school context
  const sid = schoolId ?? getSchoolId()
  if (sid) {
    requestHeaders['x-school-id'] = sid
  }

  // Attach campus context (if user has selected a campus)
  const cid = getCampusId()
  if (cid) {
    requestHeaders['x-campus-id'] = cid
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeout)

  try {
    const res = await fetch(url, {
      method,
      headers: requestHeaders,
      body: isFormData ? (body as FormData) : body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
      cache: 'no-store',
      ...(nextConfig ? { next: nextConfig } : {}),
    })

    clearTimeout(timer)

    // 401 — try refresh once
    if (res.status === 401 && !noAuth) {
      const newToken = await tryRefresh()
      if (newToken) {
        requestHeaders['Authorization'] = `Bearer ${newToken}`
        const retryController = new AbortController()
        const retryTimer = setTimeout(() => retryController.abort(), timeout)
        try {
          const retryRes = await fetch(url, {
            method,
            headers: requestHeaders,
            body: isFormData ? (body as FormData) : body ? JSON.stringify(body) : undefined,
            signal: retryController.signal,
          })
          clearTimeout(retryTimer)
          const retryData = await retryRes.json().catch(() => ({}))
          if (!retryRes.ok) {
            const retryCode =
              typeof retryData?.code === 'string' ? retryData.code : undefined
            const retryMeta = toRecord(retryData?.meta)

            maybeRedirectToPlanExpired(retryCode, retryData?.message, retryMeta)

            return {
              success: false,
              message: retryData.message || 'Request failed after token refresh',
              statusCode: retryRes.status,
              code: retryCode,
              meta: retryMeta,
              errors: retryData.errors,
            }
          }
          const retryPayload = retryData?.data !== undefined ? retryData.data : retryData
          return { success: true, data: retryPayload as T, statusCode: retryRes.status }
        } catch (retryError) {
          clearTimeout(retryTimer)
          if (retryError instanceof DOMException && retryError.name === 'AbortError') {
            return { success: false, message: 'Retry request timed out', statusCode: 408 }
          }
          return { success: false, message: 'Retry request failed', statusCode: 0 }
        }
      }

      if (lastRefreshFailure?.code === PLAN_EXPIRED_CODE) {
        maybeRedirectToPlanExpired(
          lastRefreshFailure.code,
          lastRefreshFailure.message,
          lastRefreshFailure.meta,
        )
        return {
          success: false,
          message:
            lastRefreshFailure.message ||
            'Your subscription plan has expired. Please renew to continue.',
          statusCode: 403,
          code: lastRefreshFailure.code,
          meta: lastRefreshFailure.meta,
        }
      }

      // Refresh failed — redirect to login
      if (typeof window !== 'undefined') {
        Cookies.remove(env.ACCESS_TOKEN_COOKIE)
        Cookies.remove(env.REFRESH_TOKEN_COOKIE)
        window.location.href = '/login'
      }

      return {
        success: false,
        message: 'Session expired. Please log in again.',
        statusCode: 401,
      }
    }

    const data = await res.json().catch(() => ({}))

    if (!res.ok) {
      const msg = Array.isArray(data.message)
        ? data.message.join(', ')
        : data.message || `Request failed (${res.status})`
      const code = typeof data.code === 'string' ? data.code : undefined
      const meta = toRecord(data.meta)

      maybeRedirectToPlanExpired(code, msg, meta)

      const safeMessage =
        res.status >= 500 ? 'Something went wrong. Please try again later.' : msg
      return {
        success: false,
        message: safeMessage,
        statusCode: res.status,
        code,
        meta,
        errors: data.errors,
      }
    }

    // Backend wraps responses as { success, data, timestamp }.
    // Unwrap the envelope so callers get the inner payload directly.
    const payload = data?.data !== undefined ? data.data : data

    return { success: true, data: payload as T, statusCode: res.status }
  } catch (error) {
    clearTimeout(timer)

    if (error instanceof DOMException && error.name === 'AbortError') {
      return { success: false, message: 'Request timed out', statusCode: 408 }
    }

    return {
      success: false,
      message: error instanceof Error ? error.message : 'Network error',
      statusCode: 0,
    }
  }
}

// ─── Convenience methods ────────────────────────────────────────────────────

export const api = {
  get<T>(endpoint: string, options?: Omit<RequestOptions, 'method' | 'body'>) {
    return apiClient<T>(endpoint, { ...options, method: 'GET' })
  },
  post<T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) {
    return apiClient<T>(endpoint, { ...options, method: 'POST', body })
  },
  put<T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) {
    return apiClient<T>(endpoint, { ...options, method: 'PUT', body })
  },
  patch<T>(endpoint: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>) {
    return apiClient<T>(endpoint, { ...options, method: 'PATCH', body })
  },
  delete<T>(endpoint: string, options?: Omit<RequestOptions, 'method' | 'body'>) {
    return apiClient<T>(endpoint, { ...options, method: 'DELETE' })
  },
} as const
