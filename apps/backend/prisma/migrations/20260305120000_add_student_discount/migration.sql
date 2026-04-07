-- CreateEnum (idempotent)
DO $$ BEGIN
  CREATE TYPE "DiscountType" AS ENUM ('PERCENTAGE', 'FIXED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable: StudentEnrollment — add discount fields (idempotent)
ALTER TABLE "student_enrollments" ADD COLUMN IF NOT EXISTS "discountType" "DiscountType",
ADD COLUMN IF NOT EXISTS "discountValue" DOUBLE PRECISION;

-- AlterTable: Invoice — add discount audit fields (idempotent)
ALTER TABLE "invoices" ADD COLUMN IF NOT EXISTS "grossAmount" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "discountType" "DiscountType",
ADD COLUMN IF NOT EXISTS "discountValue" DOUBLE PRECISION,
ADD COLUMN IF NOT EXISTS "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0;
