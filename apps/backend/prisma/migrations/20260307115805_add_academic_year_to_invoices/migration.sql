-- AlterTable
ALTER TABLE "invoices" ADD COLUMN "academicYearId" TEXT;

-- CreateIndex
CREATE INDEX "invoices_academicYearId_idx" ON "invoices"("academicYearId");

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "academic_years"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill: assign academicYearId to existing invoices based on dueDate falling within an academic year's range
UPDATE "invoices" i
SET "academicYearId" = ay.id
FROM "academic_years" ay
WHERE i."schoolId" = ay."schoolId"
  AND i."dueDate" >= ay."startDate"
  AND i."dueDate" <= ay."endDate"
  AND i."academicYearId" IS NULL;
