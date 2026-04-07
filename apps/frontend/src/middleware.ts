import { NextResponse, type NextRequest } from 'next/server'

/**
 * Next.js Edge Middleware — Route Protection + Role Routing
 *
 * Runs at the edge before every matched request.
 * Checks for the presence of an access token cookie.
 *
 * Protected routes: /dashboard/**, /platform/**, /settings/**
 * Public routes: /login, /register, /forgot-password, /
 *
 * If an unauthenticated user hits a protected route → redirect to /login
 * If an authenticated user hits /login or /register → redirect based on role
 * Teachers use the same /dashboard layout — scoped by permissions + class assignments
 */

const PUBLIC_ROUTES = new Set(['/', '/login', '/register', '/forgot-password'])
const AUTH_ROUTES = new Set(['/login', '/register'])

const ACCESS_TOKEN_COOKIE = 'sms_access_token'
const REFRESH_TOKEN_COOKIE = 'sms_refresh_token'

/** Decode JWT payload without verification (edge-compatible, no deps) */
function decodeJwtPayload(token: string | undefined): Record<string, any> {
  if (!token) return {}
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return {}
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const decoded = atob(payload)
    return JSON.parse(decoded)
  } catch {
    return {}
  }
}

/** Get the correct home route for a user based on role */
function getHomeRoute(payload: Record<string, any>): string {
  if (payload.isPlatformAdmin) return '/platform'
  // Teachers land on My Classes instead of Dashboard
  if (payload.teacherId) return '/dashboard/my-classes'
  return '/dashboard'
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value
  const refreshToken = request.cookies.get(REFRESH_TOKEN_COOKIE)?.value

  // User has a valid session if either token exists
  // (the client-side api-client will handle refreshing the access token)
  const hasSession = !!accessToken || !!refreshToken

  const isPublicRoute = PUBLIC_ROUTES.has(pathname)
  const isAuthRoute = AUTH_ROUTES.has(pathname)
  const isApiRoute = pathname.startsWith('/api')
  const isStaticAsset =
    pathname.startsWith('/_next') || pathname.startsWith('/favicon') || pathname.includes('.')

  // Skip middleware for API routes and static assets
  if (isApiRoute || isStaticAsset) {
    return NextResponse.next()
  }

  if (hasSession) {
    const payload = decodeJwtPayload(accessToken)

    // Authenticated user trying to access login/register → redirect to role-appropriate home
    if (isAuthRoute) {
      return NextResponse.redirect(new URL(getHomeRoute(payload), request.url))
    }
  }

  // Unauthenticated user trying to access protected route → redirect to login
  // Only redirect if BOTH access and refresh tokens are missing
  if (!hasSession && !isPublicRoute) {
    const loginUrl = new URL('/login', request.url)
    // Preserve the intended destination so we can redirect after login
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
