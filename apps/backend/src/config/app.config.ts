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

export const supabaseConfig = registerAs('supabase', {
  url: { env: 'NEXT_PUBLIC_SUPABASE_URL', required: true },
  key: { env: 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY', required: true },
  bucket: { env: 'SUPABASE_BUCKET', default: 'uploads' },
  serviceRoleKey: { env: 'SUPABASE_SERVICE_ROLE_KEY' },
})
