-- Step 1: Add currentAcademicYearId column to schools
-- IDs in this schema are String-backed (text), so keep type consistent.
ALTER TABLE "schools" ADD COLUMN IF NOT EXISTS "currentAcademicYearId" TEXT;

-- Earlier migration history did not capture these campus-scoped academic year columns.
-- Add them if missing so the shadow database can replay this migration deterministically.
ALTER TABLE "campuses" ADD COLUMN IF NOT EXISTS "currentAcademicYearId" TEXT;
ALTER TABLE "academic_years" ADD COLUMN IF NOT EXISTS "campusId" TEXT;

-- Step 2: Migrate current year from campus → school
-- Pick the first campus that has a currentAcademicYearId set
UPDATE "schools" s SET "currentAcademicYearId" = (
  SELECT c."currentAcademicYearId" FROM "campuses" c
  WHERE c."schoolId" = s."id" AND c."currentAcademicYearId" IS NOT NULL
  LIMIT 1
)
WHERE s."currentAcademicYearId" IS NULL;

-- Step 3: Deduplicate academic years that have the same name within a school
-- For each (name, schoolId) group, keep the one with the lowest campusId (or NULL campusId first),
-- and re-point all FK references from duplicates to the survivor.

-- 3a: Update student_enrollments to point to the surviving year
UPDATE "student_enrollments" se
SET "academicYearId" = survivor.id
FROM "academic_years" ay,
  (SELECT DISTINCT ON (name, "schoolId") id, name, "schoolId"
   FROM "academic_years"
   ORDER BY name, "schoolId", "campusId" NULLS FIRST, "createdAt" ASC) survivor
WHERE se."academicYearId" = ay.id
  AND ay.name = survivor.name
  AND ay."schoolId" = survivor."schoolId"
  AND ay.id != survivor.id;

-- 3b: Update exams to point to the surviving year
UPDATE "exams" e
SET "academicYearId" = survivor.id
FROM "academic_years" ay,
  (SELECT DISTINCT ON (name, "schoolId") id, name, "schoolId"
   FROM "academic_years"
   ORDER BY name, "schoolId", "campusId" NULLS FIRST, "createdAt" ASC) survivor
WHERE e."academicYearId" = ay.id
  AND ay.name = survivor.name
  AND ay."schoolId" = survivor."schoolId"
  AND ay.id != survivor.id;

-- 3c: Update timetable_slots to point to the surviving year
UPDATE "timetable_slots" ts
SET "academicYearId" = survivor.id
FROM "academic_years" ay,
  (SELECT DISTINCT ON (name, "schoolId") id, name, "schoolId"
   FROM "academic_years"
   ORDER BY name, "schoolId", "campusId" NULLS FIRST, "createdAt" ASC) survivor
WHERE ts."academicYearId" = ay.id
  AND ay.name = survivor.name
  AND ay."schoolId" = survivor."schoolId"
  AND ay.id != survivor.id;

-- 3d: Update grade_records to point to the surviving year
UPDATE "grade_records" gr
SET "academicYearId" = survivor.id
FROM "academic_years" ay,
  (SELECT DISTINCT ON (name, "schoolId") id, name, "schoolId"
   FROM "academic_years"
   ORDER BY name, "schoolId", "campusId" NULLS FIRST, "createdAt" ASC) survivor
WHERE gr."academicYearId" = ay.id
  AND ay.name = survivor.name
  AND ay."schoolId" = survivor."schoolId"
  AND ay.id != survivor.id;

-- 3e: Update teacher_class_assignments to point to the surviving year
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'teacher_class_assignments'
  ) THEN
    UPDATE "teacher_class_assignments" tca
    SET "academicYearId" = survivor.id
    FROM "academic_years" ay,
      (SELECT DISTINCT ON (name, "schoolId") id, name, "schoolId"
       FROM "academic_years"
       ORDER BY name, "schoolId", "campusId" NULLS FIRST, "createdAt" ASC) survivor
    WHERE tca."academicYearId" = ay.id
      AND ay.name = survivor.name
      AND ay."schoolId" = survivor."schoolId"
      AND ay.id != survivor.id;
  END IF;
END $$;

-- 3f: Update schools.currentAcademicYearId if it points to a duplicate
UPDATE "schools" s
SET "currentAcademicYearId" = survivor.id
FROM "academic_years" ay,
  (SELECT DISTINCT ON (name, "schoolId") id, name, "schoolId"
   FROM "academic_years"
   ORDER BY name, "schoolId", "campusId" NULLS FIRST, "createdAt" ASC) survivor
WHERE s."currentAcademicYearId" = ay.id
  AND ay.name = survivor.name
  AND ay."schoolId" = survivor."schoolId"
  AND ay.id != survivor.id;

-- 3g: Delete the duplicate academic years (non-survivors)
DELETE FROM "academic_years" ay
WHERE ay.id NOT IN (
  SELECT DISTINCT ON (name, "schoolId") id
  FROM "academic_years"
  ORDER BY name, "schoolId", "campusId" NULLS FIRST, "createdAt" ASC
);

-- Step 4: Remove campus-academic year relationship from campuses
ALTER TABLE "campuses" DROP COLUMN IF EXISTS "currentAcademicYearId";

-- Step 5: Drop old unique constraint and index, add new ones
DROP INDEX IF EXISTS "academic_years_campusId_idx";
ALTER TABLE "academic_years" DROP CONSTRAINT IF EXISTS "academic_years_name_schoolId_campusId_key";

-- Step 6: Drop campusId column from academic_years
ALTER TABLE "academic_years" DROP COLUMN IF EXISTS "campusId";

-- Step 7: Add new unique constraint (school-level)
CREATE UNIQUE INDEX IF NOT EXISTS "academic_years_name_schoolId_key" ON "academic_years"("name", "schoolId");

-- Step 8: Add FK and index for schools.currentAcademicYearId
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'schools_currentAcademicYearId_fkey'
  ) THEN
    ALTER TABLE "schools"
    ADD CONSTRAINT "schools_currentAcademicYearId_fkey"
    FOREIGN KEY ("currentAcademicYearId") REFERENCES "academic_years"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "schools_currentAcademicYearId_idx" ON "schools"("currentAcademicYearId");
