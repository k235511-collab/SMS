-- Link exams with academic years for logical exam lifecycle grouping
ALTER TABLE "exams"
ADD COLUMN "academicYearId" TEXT;

ALTER TABLE "exams"
ADD CONSTRAINT "exams_academicYearId_fkey"
FOREIGN KEY ("academicYearId") REFERENCES "academic_years"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

CREATE INDEX "exams_academicYearId_idx" ON "exams"("academicYearId");
