/*
  Warnings:

  - You are about to drop the `class_subjects` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[code,classId,schoolId]` on the table `subjects` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "class_subjects" DROP CONSTRAINT "class_subjects_classId_fkey";

-- DropForeignKey
ALTER TABLE "class_subjects" DROP CONSTRAINT "class_subjects_schoolId_fkey";

-- DropForeignKey
ALTER TABLE "class_subjects" DROP CONSTRAINT "class_subjects_subjectId_fkey";

-- DropIndex
DROP INDEX "subjects_code_schoolId_key";

-- AlterTable
ALTER TABLE "subjects" ADD COLUMN     "classId" TEXT;

-- DropTable
DROP TABLE "class_subjects";

-- CreateIndex
CREATE INDEX "subjects_classId_idx" ON "subjects"("classId");

-- CreateIndex
CREATE UNIQUE INDEX "subjects_code_classId_schoolId_key" ON "subjects"("code", "classId", "schoolId");

-- AddForeignKey
ALTER TABLE "subjects" ADD CONSTRAINT "subjects_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
