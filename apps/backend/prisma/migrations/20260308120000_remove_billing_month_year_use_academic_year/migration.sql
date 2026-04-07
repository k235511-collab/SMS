-- Remove the old unique constraint based on billingMonth/billingYear
DROP INDEX IF EXISTS "invoices_studentId_feeStructureId_billingMonth_billingYear_key";

-- Remove the billingMonth/billingYear index
DROP INDEX IF EXISTS "invoices_billingMonth_billingYear_idx";

-- Drop the billing columns
ALTER TABLE "invoices" DROP COLUMN IF EXISTS "billingMonth";
ALTER TABLE "invoices" DROP COLUMN IF EXISTS "billingYear";

-- Add new unique constraint based on academicYearId
CREATE UNIQUE INDEX "invoices_studentId_feeStructureId_academicYearId_key" ON "invoices"("studentId", "feeStructureId", "academicYearId");
