-- AlterTable
ALTER TABLE "invoices" ADD COLUMN "billingMonth" INTEGER,
ADD COLUMN "billingYear" INTEGER;

-- CreateIndex
CREATE INDEX "invoices_billingMonth_billingYear_idx" ON "invoices"("billingMonth", "billingYear");

-- CreateIndex (unique constraint for duplicate prevention)
CREATE UNIQUE INDEX "invoices_studentId_feeStructureId_billingMonth_billingYear_key" ON "invoices"("studentId", "feeStructureId", "billingMonth", "billingYear");
