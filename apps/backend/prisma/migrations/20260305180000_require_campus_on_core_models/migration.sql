-- ============================================================
-- Migration: require_campus_on_core_models
-- 
-- For every school, ensure a default campus exists, then assign
-- any orphaned classes / fee_structures / expenses to that campus.
-- Finally make campusId NOT NULL on those three tables.
-- ============================================================

-- 1. Create a default "Main Campus" for any school that doesn't have one yet
INSERT INTO "campuses" ("id", "name", "code", "schoolId", "isActive", "createdAt", "updatedAt")
SELECT
  gen_random_uuid(),
  'Main Campus',
  'MAIN',
  s."id",
  true,
  NOW(),
  NOW()
FROM "schools" s
WHERE NOT EXISTS (
  SELECT 1 FROM "campuses" c WHERE c."schoolId" = s."id"
);

-- 1.5. fee_structures was missing campusId in earlier migration history.
-- Add it here so the migration can replay cleanly on a fresh shadow database.
ALTER TABLE "fee_structures" ADD COLUMN IF NOT EXISTS "campusId" TEXT;

-- 2. Backfill classes: assign orphaned classes to their school's first campus
UPDATE "classes"
SET "campusId" = (
  SELECT c."id" FROM "campuses" c
  WHERE c."schoolId" = "classes"."schoolId"
  ORDER BY c."createdAt" ASC
  LIMIT 1
)
WHERE "campusId" IS NULL;

-- 3. Backfill fee_structures: assign orphaned fee structures
UPDATE "fee_structures"
SET "campusId" = (
  SELECT c."id" FROM "campuses" c
  WHERE c."schoolId" = "fee_structures"."schoolId"
  ORDER BY c."createdAt" ASC
  LIMIT 1
)
WHERE "campusId" IS NULL;

-- 4. Backfill expenses: assign orphaned expenses
UPDATE "expenses"
SET "campusId" = (
  SELECT c."id" FROM "campuses" c
  WHERE c."schoolId" = "expenses"."schoolId"
  ORDER BY c."createdAt" ASC
  LIMIT 1
)
WHERE "campusId" IS NULL;

-- 5. Make campusId NOT NULL
ALTER TABLE "classes" ALTER COLUMN "campusId" SET NOT NULL;
ALTER TABLE "fee_structures" ALTER COLUMN "campusId" SET NOT NULL;
ALTER TABLE "expenses" ALTER COLUMN "campusId" SET NOT NULL;

-- 6. Ensure fee_structures campus relation exists in replayed databases
CREATE INDEX IF NOT EXISTS "fee_structures_campusId_idx" ON "fee_structures"("campusId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'fee_structures_campusId_fkey'
  ) THEN
    ALTER TABLE "fee_structures"
    ADD CONSTRAINT "fee_structures_campusId_fkey"
    FOREIGN KEY ("campusId") REFERENCES "campuses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
