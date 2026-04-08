import { registerAs as nestRegisterAs } from '@nestjs/config'
import { registerAs } from './register-as'

export const appConfig = registerAs('app', {
  nodeEnv: { env: 'NODE_ENV', default: 'development' },
  port: { env: 'PORT', default: 4000, transform: Number },
  apiPrefix: { env: 'API_PREFIX', default: 'api/v1' },
  corsOrigins: { env: 'CORS_ORIGINS', default: 'http://localhost:3000' },
  throttleTtl: { env: 'THROTTLE_TTL', default: 60, transform: Number },
  throttleLimit: { env: 'THROTTLE_LIMIT', default: 100, transform: Number },
})

export const databaseConfig = registerAs('database', {
  url: { env: 'DATABASE_URL', required: true },
})

export const jwtConfig = registerAs('jwt', {
  secret: { env: 'JWT_SECRET', required: true },
  expiration: { env: 'JWT_EXPIRATION', default: '15m' },
  refreshSecret: { env: 'JWT_REFRESH_SECRET', required: true },
  refreshExpiration: { env: 'JWT_REFRESH_EXPIRATION', default: '7d' },
})

export const supabaseConfig = nestRegisterAs('supabase', () => {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  const key =
    process.env.SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
  const bucket = process.env.SUPABASE_BUCKET || 'uploads'
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  const missing: string[] = []
  if (!url) missing.push('SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL')
  if (!key) {
    missing.push(
      'SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY (legacy fallback: SUPABASE_PUBLISHABLE_DEFAULT_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY)',
    )
  }

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`,
    )
  }

  const validatedUrl = url!
  const validatedKey = key!

  return {
    url: validatedUrl,
    key: validatedKey,
    bucket,
    serviceRoleKey,
  }
})
