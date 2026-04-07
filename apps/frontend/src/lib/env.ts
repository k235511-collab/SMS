/** Environment configuration — validated at build time via Next.js */

const isProd = process.env.NODE_ENV === 'production'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ''

// Warn if production build uses localhost fallbacks
if (isProd && API_URL.includes('localhost')) {
  console.error(
    '\x1b[31m[ENV ERROR]\x1b[0m NEXT_PUBLIC_API_URL is not set or still points to localhost in production.',
  )
}

const env = {
  /** Backend API base URL */
  API_URL,

  /** Application name */
  APP_NAME: process.env.NEXT_PUBLIC_APP_NAME || 'SMS SaaS',

  /** Frontend URL */
  APP_URL,

  /** Google Client ID */
  GOOGLE_CLIENT_ID,

  /** Auth cookie names */
  ACCESS_TOKEN_COOKIE: 'sms_access_token',
  REFRESH_TOKEN_COOKIE: 'sms_refresh_token',
  SCHOOL_ID_COOKIE: 'sms_school_id',

  /** Cookie max-age in seconds */
  // Access token cookie lives 20 minutes (5 min buffer over 15 min JWT)
  // so the cookie survives long enough for the refresh mechanism to fire
  ACCESS_TOKEN_MAX_AGE: 20 * 60, // 20 minutes
  REFRESH_TOKEN_MAX_AGE: 7 * 24 * 60 * 60, // 7 days
} as const

export default env
