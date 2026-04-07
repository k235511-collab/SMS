-- Migration: Make student rollNumber and teacher employeeId unique per campus instead of per school
-- 1. Add campusId column to students (nullable first for backfill)
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "campusId" TEXT;

-- 2. Backfill students: use class's campusId, or school's first campus as fallback
UPDATE "students" s
SET "campusId" = COALESCE(
  (SELECT c."campusId" FROM "classes" c WHERE c."id" = s."classId"),
  (SELECT cp."id" FROM "campuses" cp WHERE cp."schoolId" = s."schoolId" ORDER BY cp."createdAt" ASC LIMIT 1)
)
WHERE s."campusId" IS NULL;

-- 3. For any school that has no campus yet, create a "Main Campus"
INSERT INTO "campuses" ("id", "name", "code", "address", "isActive", "schoolId", "createdAt", "updatedAt")
SELECT
  gen_random_uuid()::text,
  'Main Campus',
  'MAIN',
  NULL,
  true,
  s."schoolId",
  NOW(),
  NOW()
FROM "students" s
WHERE s."campusId" IS NULL
GROUP BY s."schoolId"
ON CONFLICT DO NOTHING;

-- 4. Backfill any remaining students (those whose school just got a campus)
UPDATE "students" s
SET "campusId" = (
  SELECT cp."id" FROM "campuses" cp WHERE cp."schoolId" = s."schoolId" ORDER BY cp."createdAt" ASC LIMIT 1
)
WHERE s."campusId" IS NULL;

-- 5. Make campusId NOT NULL on students
ALTER TABLE "students" ALTER COLUMN "campusId" SET NOT NULL;

-- 6. Add foreign key constraint
ALTER TABLE "students"
ADD CONSTRAINT "students_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "campuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- 7. Drop old school-scoped unique constraint and add campus-scoped one for students
ALTER TABLE "students" DROP CONSTRAINT IF EXISTS "students_rollNumber_schoolId_key";
ALTER TABLE "students" ADD CONSTRAINT "students_rollNumber_campusId_key" UNIQUE ("rollNumber", "campusId");

-- 8. Add index on students.campusId
CREATE INDEX IF NOT EXISTS "students_campusId_idx" ON "students"("campusId");

-- 9. Backfill teachers: use school's first campus for any teacher without campusId
UPDATE "teachers" t
SET "campusId" = (
  SELECT cp."id" FROM "campuses" cp WHERE cp."schoolId" = t."schoolId" ORDER BY cp."createdAt" ASC LIMIT 1
)
WHERE t."campusId" IS NULL;

-- 10. Make teacher campusId NOT NULL
ALTER TABLE "teachers" ALTER COLUMN "campusId" SET NOT NULL;

-- 11. Drop old school-scoped unique constraint and add campus-scoped one for teachers
ALTER TABLE "teachers" DROP CONSTRAINT IF EXISTS "teachers_employeeId_schoolId_key";
ALTER TABLE "teachers" ADD CONSTRAINT "teachers_employeeId_campusId_key" UNIQUE ("employeeId", "campusId");
