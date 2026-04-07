import 'reflect-metadata'
import { NestFactory } from '@nestjs/core'
import { ValidationPipe, Logger } from '@nestjs/common'
import { ThrottlerGuard } from '@nestjs/throttler'
import { Reflector } from '@nestjs/core'
// Force restart trigger 4
import { ConfigService } from '@nestjs/config'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import helmet from 'helmet'
import compression from 'compression'
import { AppModule } from './app.module'

function parseCorsOrigins(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((s) => s.trim())
    // Normalize common mistakes like trailing slash
    .map((s) => (s.endsWith('/') ? s.slice(0, -1) : s))
    .filter(Boolean)
}

async function bootstrap() {
  const logger = new Logger('Bootstrap')
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  })
  const configService = app.get(ConfigService)

  // Shutdown hooks — ensures Prisma $disconnect fires on SIGTERM/SIGINT
  app.enableShutdownHooks()

  // CORS — must be before helmet so preflight OPTIONS responses work
  const allowedOrigins = parseCorsOrigins(
    configService.get<string>('CORS_ORIGINS', process.env.CORS_ORIGINS || ''),
  )
  logger.log(
    `CORS origins: ${allowedOrigins.length ? allowedOrigins.join(', ') : '(none)'}`,
  )
  app.enableCors({
    origin: (origin, cb) => {
      // Allow non-browser requests (no Origin header)
      if (!origin) return cb(null, true)
      const normalized = origin.endsWith('/') ? origin.slice(0, -1) : origin
      return cb(null, allowedOrigins.includes(normalized))
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-school-id', 'x-campus-id'],
  })

  // Security headers — configured to not conflict with CORS
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      crossOriginOpenerPolicy: { policy: 'unsafe-none' },
      contentSecurityPolicy: false, // CSP is handled by the frontend
    }),
  )

  // Response compression
  app.use(compression())

  // Global prefix
  const apiPrefix = configService.get<string>('API_PREFIX', 'api/v1')
  app.setGlobalPrefix(apiPrefix, { exclude: ['health'] })

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  )

  // Register ThrottlerGuard at runtime to avoid DI ordering issues
  // try {
  //   // strict: false allows getting providers that are not exported from the module
  //   const throttler = app.get(ThrottlerGuard, { strict: false })
  //   if (throttler) app.useGlobalGuards(throttler)
  // } catch (e: any) {
  //   logger.warn(`ThrottlerGuard not found, rate limiting might be disabled: ${e.message}`)
  // }

  // Swagger
  const swaggerConfig = new DocumentBuilder()
    .setTitle('SMS SaaS API')
    .setDescription('Multi-tenant School Management System API')
    .setVersion('1.0')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', name: 'x-school-id', in: 'header' }, 'school-id')
    .build()
  const document = SwaggerModule.createDocument(app, swaggerConfig)
  SwaggerModule.setup('docs', app, document)

  const port = configService.get<number>('PORT', 4000)
  await app.listen(port)
  logger.log(`Backend running on http://localhost:${port}`)
  logger.log(`Swagger docs at http://localhost:${port}/docs`)
}

bootstrap()
