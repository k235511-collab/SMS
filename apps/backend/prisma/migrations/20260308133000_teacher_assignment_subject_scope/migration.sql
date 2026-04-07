DO $$
DECLARE
  existing_index_name TEXT;
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'teacher_class_assignments'
  ) THEN
    SELECT indexname
    INTO existing_index_name
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'teacher_class_assignments'
      AND indexdef LIKE '%UNIQUE INDEX%("teacherId", "classId", "sectionId", "academicYearId")%'
    LIMIT 1;

    IF existing_index_name IS NOT NULL THEN
      EXECUTE format('DROP INDEX IF EXISTS %I', existing_index_name);
    END IF;

    CREATE UNIQUE INDEX IF NOT EXISTS "teacher_class_assignments_teacherId_classId_sectionId_subjectId_academicYearId_key"
    ON "teacher_class_assignments"("teacherId", "classId", "sectionId", "subjectId", "academicYearId");
  END IF;
END $$;
