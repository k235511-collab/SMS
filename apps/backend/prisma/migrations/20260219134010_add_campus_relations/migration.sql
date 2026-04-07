-- AlterTable
ALTER TABLE "classes" ADD COLUMN     "campusId" TEXT;

-- AlterTable
ALTER TABLE "teachers" ADD COLUMN     "campusId" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "campusId" TEXT;

-- CreateIndex
CREATE INDEX "classes_campusId_idx" ON "classes"("campusId");

-- CreateIndex
CREATE INDEX "teachers_campusId_idx" ON "teachers"("campusId");

-- CreateIndex
CREATE INDEX "users_campusId_idx" ON "users"("campusId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "campuses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "campuses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teachers" ADD CONSTRAINT "teachers_campusId_fkey" FOREIGN KEY ("campusId") REFERENCES "campuses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
