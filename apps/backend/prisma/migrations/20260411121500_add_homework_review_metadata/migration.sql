-- Homework review metadata for assignments
-- Keeps existing assignment workflows intact while enabling admin review state.

DO $$
BEGIN
  CREATE TYPE "HomeworkReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'NEEDS_REVISION');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END
$$;

ALTER TABLE "assignments"
  ADD COLUMN IF NOT EXISTS "reviewStatus" "HomeworkReviewStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS "reviewNote" TEXT,
  ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "reviewedById" TEXT;

CREATE INDEX IF NOT EXISTS "assignments_reviewStatus_idx" ON "assignments"("reviewStatus");
CREATE INDEX IF NOT EXISTS "assignments_reviewedById_idx" ON "assignments"("reviewedById");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'assignments_reviewedById_fkey'
  ) THEN
    ALTER TABLE "assignments"
      ADD CONSTRAINT "assignments_reviewedById_fkey"
      FOREIGN KEY ("reviewedById") REFERENCES "users"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;
