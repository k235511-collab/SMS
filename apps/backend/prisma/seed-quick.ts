import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding minimal access data directly to DB...');

  const platformHash = await bcrypt.hash('platform123', 10);
  const adminHash = await bcrypt.hash('admin123', 10);

  try {
    // 1. Platform Admin
    await prisma.$executeRawUnsafe(`
      INSERT INTO "platform_admins" ("id", "email", "passwordHash", "firstName", "lastName", "createdAt", "updatedAt") 
      VALUES (
        gen_random_uuid(), 
        'platform@sms.com', 
        '${platformHash}', 
        'Platform', 
        'Admin', 
        NOW(), 
        NOW()
      )
      ON CONFLICT ("email") DO NOTHING;
    `);
    console.log('✅ Platform Admin inserted!');

    // 2. Demo School (needed to login as an admin)
    // First ensure there's a premium plan
    await prisma.$executeRawUnsafe(`
      INSERT INTO "subscription_plans" ("id", "name", "slug", "price", "maxStudents", "maxTeachers", "maxCampuses", "features", "createdAt", "updatedAt")
      VALUES (
        gen_random_uuid(),
        'Premium',
        'premium',
        99.99,
        5000,
        500,
        10,
        '["attendance", "exams", "finance", "audit", "timetable", "notifications"]'::jsonb,
        NOW(),
        NOW()
      )
      ON CONFLICT ("slug") DO NOTHING;
    `);

    // Insert demo school
    await prisma.$executeRawUnsafe(`
      INSERT INTO "schools" ("id", "name", "slug", "code", "isActive", "createdAt", "updatedAt")
      VALUES (
        gen_random_uuid(),
        'Demo International School',
        'demo-school',
        'DEMO',
        true,
        NOW(),
        NOW()
      )
      ON CONFLICT ("slug") DO NOTHING;
    `);
    console.log('✅ Demo School inserted!');

    // Get the school ID just created
    const schools: any[] = await prisma.$queryRawUnsafe(`SELECT id FROM "schools" WHERE slug = 'demo-school' LIMIT 1;`);
    const schoolId = schools[0]?.id;

    if (schoolId) {
      // 3. Admin User
      // Create role
      await prisma.$executeRawUnsafe(`
        INSERT INTO "roles" ("id", "name", "slug", "isSystem", "schoolId", "createdAt", "updatedAt")
        VALUES (
          gen_random_uuid(),
          'Super Admin',
          'super_admin',
          true,
          '${schoolId}',
          NOW(),
          NOW()
        )
        ON CONFLICT ("slug", "schoolId") DO NOTHING;
      `);

      const roles: any[] = await prisma.$queryRawUnsafe(`SELECT id FROM "roles" WHERE slug = 'super_admin' AND "schoolId" = '${schoolId}' LIMIT 1;`);
      const roleId = roles[0]?.id;

      if (roleId) {
        // Create user
        await prisma.$executeRawUnsafe(`
          INSERT INTO "users" ("id", "email", "passwordHash", "firstName", "lastName", "roleId", "schoolId", "createdAt", "updatedAt")
          VALUES (
            gen_random_uuid(),
            'admin@demo.com',
            '${adminHash}',
            'Super',
            'Admin',
            '${roleId}',
            '${schoolId}',
            NOW(),
            NOW()
          )
          ON CONFLICT ("email", "schoolId") DO NOTHING;
        `);
        console.log('✅ School Admin inserted!');
      }
    }

  } catch (err: any) {
    console.error('Failed to insert minimal data:', err.message);
  }

  console.log('Done!');
}

main().catch(console.error).finally(() => prisma.$disconnect());
