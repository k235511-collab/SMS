-- 1. Create Academic Year
INSERT INTO academic_years (id, "schoolId", name, "startDate", "endDate", "isCurrent", "isActive", "createdAt", "updatedAt")
VALUES (
  '12345678-1234-1234-1234-123456789abc', 
  '6a73e1a7-2126-45c3-8abe-11c9e2a2e16f', 
  '2027-2028', 
  '2027-04-11', 
  '2028-04-30', 
  true, 
  true,
  NOW(), 
  NOW()
)
ON CONFLICT (id) DO UPDATE 
SET "isCurrent" = true;

-- 2. Set as Current Academic Year for School
UPDATE schools 
SET "currentAcademicYearId" = '12345678-1234-1234-1234-123456789abc' 
WHERE id = '6a73e1a7-2126-45c3-8abe-11c9e2a2e16f';

-- 3. Restore Enrollments for 17 students
-- Target: Students in school '6a73e1a7...' who are NOT enrolled
INSERT INTO student_enrollments (id, "studentId", "academicYearId", "schoolId", "classId", "sectionId", status, "createdAt", "updatedAt")
SELECT 
  gen_random_uuid(),
  s.id,
  '12345678-1234-1234-1234-123456789abc',
  s."schoolId",
  s."classId",
  s."sectionId",
  'ACTIVE',
  NOW(),
  NOW()
FROM students s
WHERE s."schoolId" = '6a73e1a7-2126-45c3-8abe-11c9e2a2e16f'
AND s.id NOT IN (SELECT "studentId" FROM student_enrollments);

-- 4. Re-link Invoices
UPDATE invoices
SET "academicYearId" = '12345678-1234-1234-1234-123456789abc'
WHERE "schoolId" = '6a73e1a7-2126-45c3-8abe-11c9e2a2e16f'
AND ("academicYearId" IS NULL OR "dueDate" >= '2027-04-11');

-- 5. Re-link Exams
UPDATE exams
SET "academicYearId" = '12345678-1234-1234-1234-123456789abc'
WHERE "schoolId" = '6a73e1a7-2126-45c3-8abe-11c9e2a2e16f'
AND ("academicYearId" IS NULL OR "startDate" >= '2027-04-11');
