# Exams + Timetable Implementation Summary

## 1) Exams academic year filter fix

### What was broken

- The Exams list endpoint included records where `academicYearId` was `null` even when a global academic year was selected.
- The expanded student details request on the Exams page did not send the selected global academic year, so it returned cross-year records.

### What was implemented

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

### Expected result

- Changing the global academic year in the header now consistently affects:
  - Exams tab records
  - Student Results tab list
  - Expanded per-student detailed exam results

## 2) Timetable print + Excel export enhancement

### What was implemented

- Added timetable print and export controls on the timetable page:
  - `Print` button to open browser print dialog.
  - `Export Excel` button to download `.xlsx` based on current view.
- Added `xlsx` dependency in frontend for client-side workbook generation.
- Implemented dynamic Excel export content for all timetable views:
  - **Class view**: Period x Monday-Saturday grid for selected class/section.
  - **Weekly Teacher view**: Period x Monday-Saturday grid with class/section context.
  - **Today view**: tabular list of current day slots.
  - Included context metadata (campus, academic year, view, timestamp).
- Fixed print behavior so only timetable content is printed:
  - Added `.print-target` wrapper for printable area.
  - Added print CSS to hide dashboard shell (`aside`, `header`) and non-print controls.
  - Kept print-only context header for campus/year/view details.
  - Optimized page setup for timetable (`A4 landscape`, tighter margins).

### Expected result

- Print preview shows only timetable section (not full dashboard UI).
- Users can download timetable as reusable Excel file for further editing/sharing.

## Files changed

- `apps/backend/src/modules/exams/exams.service.ts`
- `apps/backend/src/modules/exams/exams.controller.ts`
- `apps/frontend/src/app/(dashboard)/dashboard/exams/page.tsx`
- `apps/frontend/src/app/(dashboard)/dashboard/timetable/page.tsx`
- `apps/frontend/package.json`
- `docs/exams-academic-year-filter-implementation-summary.md`
