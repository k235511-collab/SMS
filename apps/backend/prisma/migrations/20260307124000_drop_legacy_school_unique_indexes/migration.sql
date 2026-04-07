-- Remove legacy school-scoped unique indexes left from initial schema.
-- New campus-scoped unique indexes already exist and must remain.

DROP INDEX IF EXISTS "students_rollNumber_schoolId_key";
DROP INDEX IF EXISTS "teachers_employeeId_schoolId_key";
