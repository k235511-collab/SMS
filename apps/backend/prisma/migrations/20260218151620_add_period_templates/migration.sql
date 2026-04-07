-- CreateTable
CREATE TABLE "period_templates" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isBreak" BOOLEAN NOT NULL DEFAULT false,
    "schoolId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "period_templates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "period_templates_schoolId_idx" ON "period_templates"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "period_templates_schoolId_startTime_key" ON "period_templates"("schoolId", "startTime");

-- AddForeignKey
ALTER TABLE "period_templates" ADD CONSTRAINT "period_templates_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
