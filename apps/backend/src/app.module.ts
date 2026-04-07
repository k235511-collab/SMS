import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core'
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler'

// Config
import { appConfig, databaseConfig, jwtConfig, supabaseConfig } from './config'

// Infrastructure
import { PrismaModule } from './prisma/prisma.module'
import { GlobalExceptionFilter } from './common/filters'
import { LoggingInterceptor, TransformInterceptor } from './common/interceptors'
import { JwtAuthGuard, PermissionsGuard, CampusGuard } from './common/guards'
import { TenantMiddleware } from './common/middleware'

// Feature modules
import { HealthModule } from './modules/health/health.module'
import { AuthModule } from './modules/auth/auth.module'
import { PlatformModule } from './modules/platform/platform.module'
import { SchoolsModule } from './modules/schools/schools.module'
import { CampusesModule } from './modules/campuses/campuses.module'
import { UsersModule } from './modules/users/users.module'
import { RolesModule } from './modules/roles/roles.module'
import { PermissionsModule } from './modules/permissions/permissions.module'
import { StudentsModule } from './modules/students/students.module'
import { ParentsModule } from './modules/parents/parents.module'
import { TeachersModule } from './modules/teachers/teachers.module'
import { AcademicsModule } from './modules/academics/academics.module'
import { AttendanceModule } from './modules/attendance/attendance.module'
import { ExamsModule } from './modules/exams/exams.module'
import { FinanceModule } from './modules/finance/finance.module'
import { AuditModule } from './modules/audit/audit.module'
import { AcademicYearsModule } from './modules/academic-years/academic-years.module'
import { TimetableModule } from './modules/timetable/timetable.module'
import { NotificationsModule } from './modules/notifications/notifications.module'

// Enterprise modules
import { AssignmentsModule } from './modules/assignments/assignments.module'
import { GradesModule } from './modules/grades/grades.module'
import { CalendarModule } from './modules/calendar/calendar.module'
import { CommunicationsModule } from './modules/communications/communications.module'
import { ReportsModule } from './modules/reports/reports.module'
import { ResourcesModule } from './modules/resources/resources.module'
import { FeatureFlagsModule } from './modules/feature-flags/feature-flags.module'
import { BackupModule } from './modules/backup/backup.module'
import { AnalyticsModule } from './modules/analytics/analytics.module'
import { UploadsModule } from './modules/uploads/uploads.module'
import { ServeStaticModule } from '@nestjs/serve-static'
import { join } from 'path'

@Module({
  imports: [
    // Global config
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [appConfig, databaseConfig, jwtConfig, supabaseConfig],
    }),

    // Static files
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      serveRoot: '/',
    }),

    // Rate limiting
    ThrottlerModule.forRoot({
      ttl: parseInt(process.env.THROTTLE_TTL || '60', 10) * 1000,
      limit: parseInt(process.env.THROTTLE_LIMIT || '100', 10),
    } as any),

    // Database
    PrismaModule,

    // Global modules
    AuditModule,

    // Feature modules
    HealthModule,
    AuthModule,
    PlatformModule,
    SchoolsModule,
    CampusesModule,
    UsersModule,
    RolesModule,
    PermissionsModule,
    StudentsModule,
    ParentsModule,
    TeachersModule,
    AcademicsModule,
    AttendanceModule,
    ExamsModule,
    FinanceModule,
    AcademicYearsModule,
    TimetableModule,
    NotificationsModule,

    // Enterprise modules
    AssignmentsModule,
    GradesModule,
    CalendarModule,
    CommunicationsModule,
    ReportsModule,
    ResourcesModule,
    FeatureFlagsModule,
    BackupModule,
    AnalyticsModule,
    UploadsModule,
  ],
  providers: [

    // Global JWT auth guard — use @Public() to bypass
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // Global permission guard — use @RequirePermission() to enforce
    { provide: APP_GUARD, useClass: PermissionsGuard },
    // Global campus guard — enforces campus-scoped users stay within their campus
    { provide: APP_GUARD, useClass: CampusGuard },
    // Global rate limiting guard (disabled here to avoid DI issues in local run)
    // { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Global exception filter
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    // Global interceptors
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TransformInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantMiddleware).forRoutes('*')
  }
}
