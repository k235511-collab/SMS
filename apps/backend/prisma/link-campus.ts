import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    const schools: any[] = await prisma.$queryRawUnsafe(`SELECT id, name, slug FROM schools`)
    console.log(`Found ${schools.length} school(s)`)

    for (const school of schools) {
        console.log(`\n--- Processing: ${school.name} (${school.slug}) ---`)

        // Check if campus already exists
        const campuses: any[] = await prisma.$queryRawUnsafe(
            `SELECT id, name FROM campuses WHERE "schoolId" = $1 LIMIT 1`, school.id
        )

        let campusId: string

        if (campuses.length === 0) {
            const newCampuses: any[] = await prisma.$queryRawUnsafe(
                `INSERT INTO campuses (id, name, code, "schoolId", "isActive", "createdAt", "updatedAt")
         VALUES (gen_random_uuid(), 'Main Campus', 'MAIN', $1, true, NOW(), NOW())
         RETURNING id`, school.id
            )
            campusId = newCampuses[0].id
            console.log(`  ✚ Created Main Campus: ${campusId}`)
        } else {
            campusId = campuses[0].id
            console.log(`  ✓ Campus already exists: ${campuses[0].name} (${campusId})`)
        }

        // Link classes
        const r1 = await prisma.$executeRawUnsafe(
            `UPDATE classes SET "campusId" = $1 WHERE "schoolId" = $2 AND "campusId" IS NULL`, campusId, school.id
        )
        console.log(`  → Linked ${r1} class(es)`)

        // Link teachers
        const r2 = await prisma.$executeRawUnsafe(
            `UPDATE teachers SET "campusId" = $1 WHERE "schoolId" = $2 AND "campusId" IS NULL`, campusId, school.id
        )
        console.log(`  → Linked ${r2} teacher(s)`)

        // Link users
        const r3 = await prisma.$executeRawUnsafe(
            `UPDATE users SET "campusId" = $1 WHERE "schoolId" = $2 AND "campusId" IS NULL`, campusId, school.id
        )
        console.log(`  → Linked ${r3} user(s)`)

        // Link academic years
        const r4 = await prisma.$executeRawUnsafe(
            `UPDATE academic_years SET "campusId" = $1 WHERE "schoolId" = $2 AND "campusId" IS NULL`, campusId, school.id
        )
        console.log(`  → Linked ${r4} academic year(s)`)

        // Link roles (keep system roles without campus, they are school-wide)
        // We skip roles intentionally — system roles should remain without a specific campus
    }

    console.log('\n✅ All done!')
}

main()
    .catch((e) => {
        console.error('Error:', e)
        process.exit(1)
    })
    .finally(() => prisma.$disconnect())
