-- CreateTable
CREATE TABLE "report_card_templates" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "templateKey" TEXT NOT NULL,
    "templateName" TEXT NOT NULL,
    "description" TEXT,
    "htmlContent" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "report_card_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "report_card_templates_schoolId_templateKey_key"
ON "report_card_templates"("schoolId", "templateKey");

-- CreateIndex
CREATE INDEX "report_card_templates_schoolId_idx"
ON "report_card_templates"("schoolId");

-- AddForeignKey
ALTER TABLE "report_card_templates"
ADD CONSTRAINT "report_card_templates_schoolId_fkey"
FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
