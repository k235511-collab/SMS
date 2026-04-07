-- AlterTable: FeePayment — add soft-delete support for trash (idempotent)
ALTER TABLE "fee_payments" ADD COLUMN IF NOT EXISTS "deletedAt" TIMESTAMP(3);

-- Index for efficient trash filtering (idempotent)
CREATE INDEX IF NOT EXISTS "fee_payments_deletedAt_idx" ON "fee_payments"("deletedAt");
