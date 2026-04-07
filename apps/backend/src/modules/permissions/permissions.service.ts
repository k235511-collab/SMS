import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { CreatePermissionDto } from './dto'

const DEFAULT_PERMISSIONS: CreatePermissionDto[] = [
  // Students
  { name: 'students:create', module: 'students', action: 'create', description: 'Create students' },
  { name: 'students:read', module: 'students', action: 'read', description: 'View students' },
  { name: 'students:update', module: 'students', action: 'update', description: 'Update students' },
  { name: 'students:delete', module: 'students', action: 'delete', description: 'Delete students' },
  // Teachers
  { name: 'teachers:create', module: 'teachers', action: 'create', description: 'Create teachers' },
  { name: 'teachers:read', module: 'teachers', action: 'read', description: 'View teachers' },
  { name: 'teachers:update', module: 'teachers', action: 'update', description: 'Update teachers' },
  { name: 'teachers:delete', module: 'teachers', action: 'delete', description: 'Delete teachers' },
  // Parents
  { name: 'parents:create', module: 'parents', action: 'create', description: 'Create parents' },
  { name: 'parents:read', module: 'parents', action: 'read', description: 'View parents' },
  { name: 'parents:update', module: 'parents', action: 'update', description: 'Update parents' },
  { name: 'parents:delete', module: 'parents', action: 'delete', description: 'Delete parents' },
  // Academics
  { name: 'academics:create', module: 'academics', action: 'create', description: 'Create academic records' },
  { name: 'academics:read', module: 'academics', action: 'read', description: 'View academic records' },
  { name: 'academics:update', module: 'academics', action: 'update', description: 'Update academic records' },
  { name: 'academics:delete', module: 'academics', action: 'delete', description: 'Delete academic records' },
  // Timetable
  { name: 'timetable:create', module: 'timetable', action: 'create', description: 'Create timetable records' },
  { name: 'timetable:read', module: 'timetable', action: 'read', description: 'View timetable records' },
  { name: 'timetable:update', module: 'timetable', action: 'update', description: 'Update timetable records' },
  { name: 'timetable:delete', module: 'timetable', action: 'delete', description: 'Delete timetable records' },
  // Finance
  { name: 'finance:create', module: 'finance', action: 'create', description: 'Create financial records' },
  { name: 'finance:read', module: 'finance', action: 'read', description: 'View financial records' },
  { name: 'finance:update', module: 'finance', action: 'update', description: 'Update financial records' },
  { name: 'finance:delete', module: 'finance', action: 'delete', description: 'Delete financial records' },
  // Attendance
  { name: 'attendance:create', module: 'attendance', action: 'create', description: 'Create attendance records' },
  { name: 'attendance:read', module: 'attendance', action: 'read', description: 'View attendance records' },
  { name: 'attendance:update', module: 'attendance', action: 'update', description: 'Update attendance records' },
  { name: 'attendance:delete', module: 'attendance', action: 'delete', description: 'Delete attendance records' },
  // Users
  { name: 'users:create', module: 'users', action: 'create', description: 'Create users' },
  { name: 'users:read', module: 'users', action: 'read', description: 'View users' },
  { name: 'users:update', module: 'users', action: 'update', description: 'Update users' },
  { name: 'users:delete', module: 'users', action: 'delete', description: 'Delete users' },
  // Roles
  { name: 'roles:create', module: 'roles', action: 'create', description: 'Create roles' },
  { name: 'roles:read', module: 'roles', action: 'read', description: 'View roles' },
  { name: 'roles:update', module: 'roles', action: 'update', description: 'Update roles' },
  { name: 'roles:delete', module: 'roles', action: 'delete', description: 'Delete roles' },
  // Schools
  { name: 'schools:create', module: 'schools', action: 'create', description: 'Create schools' },
  { name: 'schools:read', module: 'schools', action: 'read', description: 'View schools' },
  { name: 'schools:update', module: 'schools', action: 'update', description: 'Update schools' },
  { name: 'schools:delete', module: 'schools', action: 'delete', description: 'Delete schools' },
  // Campuses
  { name: 'campuses:create', module: 'campuses', action: 'create', description: 'Create campuses' },
  { name: 'campuses:read', module: 'campuses', action: 'read', description: 'View campuses' },
  { name: 'campuses:update', module: 'campuses', action: 'update', description: 'Update campuses' },
  { name: 'campuses:delete', module: 'campuses', action: 'delete', description: 'Delete campuses' },
]

@Injectable()
export class PermissionsService {
  private readonly logger = new Logger(PermissionsService.name)

  constructor(private readonly prisma: PrismaService) {}

  async findAll(module?: string) {
    const where = module ? { module } : {}
    return this.prisma.permission.findMany({
      where,
      orderBy: [{ module: 'asc' }, { action: 'asc' }],
    })
  }

  async findByModule(module: string) {
    return this.prisma.permission.findMany({
      where: { module },
      orderBy: { action: 'asc' },
    })
  }

  async seed() {
    let created = 0
    let skipped = 0

    for (const perm of DEFAULT_PERMISSIONS) {
      try {
        await this.prisma.permission.upsert({
          where: { name: perm.name },
          update: {},
          create: {
            name: perm.name,
            slug: perm.name,
            module: perm.module,
            action: perm.action,
            description: perm.description,
          },
        })
        created++
      } catch (error) {
        skipped++
        this.logger.warn(`Skipped permission "${perm.name}": ${(error as Error).message}`)
      }
    }

    this.logger.log(`Permissions seed complete: ${created} created/verified, ${skipped} skipped`)

    return {
      message: 'Permissions seeded successfully',
      total: DEFAULT_PERMISSIONS.length,
      created,
      skipped,
    }
  }
}
