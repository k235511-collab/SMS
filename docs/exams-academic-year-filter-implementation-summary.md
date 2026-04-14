# Exams Academic Year Filter Fix

## What was broken

- The Exams list endpoint included records where `academicYearId` was `null` even when a global academic year was selected.
- The expanded student details request on the Exams page did not send the selected global academic year, so it returned cross-year records.

## What was implemented

- Backend list filtering was made strict for academic year in `ExamsService.findAllExams`:
  - Replaced permissive `OR` logic (`selected year OR null`) with direct `academicYearId` matching.
- Backend student result endpoints now accept academic year as a query param:
  - Added `academicYearId` query handling in:
    - `GET /exams/student-results/:studentId`
    - `GET /exams/student-results/:studentId/summary`
  - Wired both controller handlers to pass `academicYearId` into service methods.
- Backend student result service methods now apply academic year filtering:
  - `getStudentResults(...)` now optionally filters by `exam.academicYearId`.
  - `getStudentResultsSummary(...)` now forwards `academicYearId` to `getStudentResults(...)`.
- Frontend Exams page now sends the selected global academic year when loading expanded student details:
  - Updated `loadStudentAllExamResults` to include `academicYearId: selectedYear?.id`.
  - Updated callback dependencies accordingly.

## Expected result

- Changing the global academic year in the header now consistently affects:
  - Exams tab records
  - Student Results tab list
  - Expanded per-student detailed exam results

## Files changed

- `apps/backend/src/modules/exams/exams.service.ts`
- `apps/backend/src/modules/exams/exams.controller.ts`
- `apps/frontend/src/app/(dashboard)/dashboard/exams/page.tsx`
- `docs/exams-academic-year-filter-implementation-summary.md`
