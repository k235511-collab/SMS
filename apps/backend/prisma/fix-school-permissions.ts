/**
 * Fix existing schools that were created without role permissions.
 *
 * Run with: npx ts-node prisma/fix-school-permissions.ts
 *           or: npx tsx prisma/fix-school-permissions.ts
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const ALL_PERMISSION_SLUGS = [
  'users:create', 'users:read', 'users:update', 'users:delete',
  'roles:create', 'roles:read', 'roles:update', 'roles:delete',
  'schools:create', 'schools:read', 'schools:update', 'schools:delete',
  'campuses:create', 'campuses:read', 'campuses:update', 'campuses:delete',
  'students:create', 'students:read', 'students:update', 'students:delete',
  'teachers:create', 'teachers:read', 'teachers:update', 'teachers:delete',
  'academics:create', 'academics:read', 'academics:update', 'academics:delete',
  'attendance:create', 'attendance:read', 'attendance:update', 'attendance:delete',
  'exams:create', 'exams:read', 'exams:update', 'exams:delete',
  'finance:create', 'finance:read', 'finance:update', 'finance:delete',
  'assignments:create', 'assignments:read', 'assignments:update', 'assignments:delete',
  'grades:create', 'grades:read', 'grades:update', 'grades:delete',
  'library:create', 'library:read', 'library:update', 'library:delete',
  'transport:create', 'transport:read', 'transport:update', 'transport:delete',
  'calendar:create', 'calendar:read', 'calendar:update', 'calendar:delete',
  'communications:create', 'communications:read',
  'analytics:read',
  'reports:read',
  'resources:create', 'resources:read', 'resources:delete',
  'notifications:create', 'notifications:read',
  'backup:manage',
  'feature-flags:manage',
  'audit:read',
  'platform:manage',
]

const TEACHER_PERM_SLUGS = [
  'students:read',
  'teachers:read',
  'academics:read',
  'attendance:read',
  'attendance:create',
  'attendance:update',
  'attendance:delete',
  'exams:read',
  'exams:create',
  'exams:update',
  'assignments:read',
  'assignments:create',
  'assignments:update',
  'assignments:delete',
  'grades:read',
  'grades:create',
  'grades:update',
  'calendar:read',
]

async function fixSchoolPermissions() {
  // Ensure the global permission catalog exists
  for (const slug of ALL_PERMISSION_SLUGS) {
    const [module, action] = slug.split(':')
    await prisma.permission.upsert({
      where: { slug },
      update: {},
      create: {
        slug,
        name: `${action.charAt(0).toUpperCase() + action.slice(1)} ${module.charAt(0).toUpperCase() + module.slice(1)}`,
        module,
        action,
      },
    })
  }

  const allPermissions = await prisma.permission.findMany()
  if (allPermissions.length === 0) {
    console.log('No permissions found in the database. Run seed first.')
    return
  }

  const schools = await prisma.school.findMany({ select: { id: true, name: true } })
  console.log(`Found ${schools.length} school(s) to check.\n`)

  // Default roles that every school should have
  const defaultRoles = [
    { slug: 'super_admin', name: 'Super Admin', description: 'Full school access' },
    { slug: 'admin', name: 'Admin', description: 'Administrative access' },
    { slug: 'principal', name: 'Principal', description: 'Campus principal access' },
    { slug: 'teacher', name: 'Teacher', description: 'Teacher access' },
    { slug: 'student', name: 'Student', description: 'Student access' },
    { slug: 'parent', name: 'Parent', description: 'Parent access' },
  ]

  for (const school of schools) {
    console.log(`--- Processing: ${school.name} (${school.id}) ---`)

    // Ensure all default roles exist
    for (const defaultRole of defaultRoles) {
      const existing = await prisma.role.findFirst({
        where: { slug: defaultRole.slug, schoolId: school.id, campusId: null },
      })
      if (!existing) {
        await prisma.role.create({
          data: {
            name: defaultRole.name,
            slug: defaultRole.slug,
            description: defaultRole.description,
            isSystem: true,
            schoolId: school.id,
            campusId: null,
          },
        })
        console.log(`  ✚ Created missing role: ${defaultRole.name} (${defaultRole.slug})`)
      }
    }

    // Get all roles for this school (including newly created ones)
    const roles = await prisma.role.findMany({
      where: { schoolId: school.id },
      include: { permissions: { include: { permission: true } } },
    })

    for (const role of roles) {
      const existingPermSlugs = role.permissions.map((rp) => rp.permission.slug)
      let targetPermissions: typeof allPermissions = []

      if (role.slug === 'super_admin') {
        targetPermissions = allPermissions
      } else if (role.slug === 'admin') {
        targetPermissions = allPermissions.filter((p) => p.slug !== 'platform:manage')
      } else if (role.slug === 'principal') {
        targetPermissions = allPermissions.filter((p) => !['platform:manage', 'schools:create', 'schools:delete'].includes(p.slug))
      } else if (role.slug === 'teacher') {
        targetPermissions = allPermissions.filter((p) => TEACHER_PERM_SLUGS.includes(p.slug))
      } else {
        // student, parent — skip, no default permissions
        continue
      }

      // Find missing permissions
      const missing = targetPermissions.filter((p) => !existingPermSlugs.includes(p.slug))

      if (missing.length === 0) {
        console.log(`  ✓ ${role.name} (${role.slug}) — all ${existingPermSlugs.length} permissions OK`)
        continue
      }

      // Create the missing role permissions
      await prisma.rolePermission.createMany({
        data: missing.map((p) => ({
          roleId: role.id,
          permissionId: p.id,
        })),
        skipDuplicates: true,
      })

      console.log(
        `  ✚ ${role.name} (${role.slug}) — added ${missing.length} permissions (had ${existingPermSlugs.length}, now ${existingPermSlugs.length + missing.length})`,
      )
    }

    // Also create default academic year if none exists
    const yearCount = await prisma.academicYear.count({ where: { schoolId: school.id } })
    if (yearCount === 0) {
      const currentYear = new Date().getFullYear()
      await prisma.academicYear.create({
        data: {
          name: `${currentYear}-${currentYear + 1}`,
          startDate: new Date(`${currentYear}-04-01`),
          endDate: new Date(`${currentYear + 1}-03-31`),
          isCurrent: true,
          schoolId: school.id,
        },
      })
      console.log(`  ✚ Created default academic year ${currentYear}-${currentYear + 1}`)
    }

    console.log()
  }

  console.log('Done! All schools now have correct role permissions.')
}

fixSchoolPermissions()
  .catch((e) => {
    console.error('Error:', e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
