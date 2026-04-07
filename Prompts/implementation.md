# Teacher System — Implementation Tracker

> Last updated: March 2, 2026 (ALL PHASES COMPLETE)

---

## Status Legend

- ✅ DONE — Implemented and working
- 🔧 IN PROGRESS — Partially done
- ❌ NOT STARTED — Needs implementation
- ⚠️ BUG — Exists but broken/incorrect

---

## Phase 1 — Critical Fixes (Must-have)

| # | Task | Status | Details |
|---|------|--------|---------|
| 1.1 | Fix teacher layout role check (case mismatch) | ✅ DONE | Changed to `user.role?.toLowerCase() !== 'teacher'` with `teacherId` fallback |
| 1.2 | Fix login redirect for teachers | ✅ DONE | Login now checks `user.teacherId \|\| user.roleSlug === 'teacher'` and redirects to `/teacher` |
| 1.3 | Fix teacher dashboard build error | ✅ DONE | Removed duplicate leftover JSX (hardcoded mock data) after the component function |
| 1.4 | Fix middleware routing for teachers | ✅ DONE | Middleware now decodes JWT, redirects teachers from `/dashboard` → `/teacher`, and routes auth pages by role |
| 1.5 | Add missing teacher permissions to seed | ✅ DONE | Added `assignments:*`, `grades:read/create/update`, `calendar:read` to teacher role in both `seed.ts` and `platform.service.ts` |
| 1.6 | Add `subjectIds` to `getTeacherClassScope()` | ✅ DONE | Scope now returns `{ classIds, sectionIds, subjectIds }` |
| 1.7 | Centralize `getTeacherScope()` into shared service | ✅ DONE | Created `TeacherScopeService` with `getScope()`, `validateClassAccess()`, `validateSectionAccess()`, `validateSubjectAccess()`, `validateFullAccess()`. Injected in exams, attendance, assignments services |

---

## Phase 2 — Security Hardening

| # | Task | Status | Details |
|---|------|--------|---------|
| 2.1 | Add `@TeacherId()` to exam update endpoint | ✅ DONE | Controller passes teacherId, service validates class/section/subject scope |
| 2.2 | Add `@TeacherId()` to exam delete endpoint | ✅ DONE | Same scope validation |
| 2.3 | Add `@TeacherId()` to exam status update | ✅ DONE | Same scope validation |
| 2.4 | Add `@TeacherId()` to assignment update/delete | ✅ DONE | Validates teacher owns the assignment + has class/subject access |
| 2.5 | Add `@TeacherId()` to attendance report/findByStudent | ✅ DONE | Report validates section access, findByStudent validates student is in teacher's class/section |
| 2.6 | Add subject ownership validation on exam create | ✅ DONE | `validateFullAccess()` checks class + section + subject |
| 2.7 | Add subject ownership on marks entry | ✅ DONE | `recordResult` and `bulkRecordResults` now accept teacherId and validate class/section/subject |
| 2.8 | Align `canUserEditResults` with write guard | ✅ DONE | Now checks ExamTeacher assignment + TeacherClassAssignment scope + classTeacherOfId. Consistent with POST results guards |
| 2.9 | Prevent `teacherId` spoofing in assignment DTO | ✅ DONE | `create()` now overrides `dto.teacherId` with JWT `teacherId` when teacher is logged in |
| 2.10 | Add class teacher marks visibility logic | ✅ DONE | `TeacherScope.classTeacherOfId` added to scope. Class teachers can view all subjects' exams/marks for their class. `validateFullAccess` skips subject check for class teacher's class |

---

### Additional fixes in this batch:
- **JWT payload**: Added `role` (slug) to JWT payload across all token generation paths (login, register, refresh, switchSchool) for middleware role routing
- **switchSchool**: Now includes `teacherId` and `role` in new JWT (was previously item 4.1)

---

## Phase 3 — Missing Frontend Pages

| # | Task | Status | Details |
|---|------|--------|---------|
| 3.1 | Create `/teacher/attendance` page | ✅ DONE | Full-featured: class/section selector, date picker, mark attendance with status cycling, bulk mark all, save; History tab with 30-day report showing present/absent/late counts per student |
| 3.2 | Create `/teacher/exams` page | ✅ DONE | Grid of exam cards with status badges; Create Exam dialog auto-filling class/section/subject from teacher assignments; Detail view with analytics (passed/failed/average/pass rate) and student results table; Links to gradebook for marks entry |
| 3.3 | Create `/teacher/marks` page (or exam results entry) | ✅ DONE | Merged into Gradebook page (3.4) — marks entry is done per-exam with bulk save |
| 3.4 | Wire `/teacher/grades` to real API | ✅ DONE | Replaced all mock data. Exam selector → loads students with existing results → editable marks input per student + absent checkbox → bulk save via `POST /exams/results/bulk`. Shows live pass/fail status, grade, dirty tracking |
| 3.5 | Remove or implement `/teacher/schedule` | ✅ DONE | Removed from sidebar (no backend support). Sidebar now: Dashboard, My Classes, Assignments, Exams, Gradebook, Attendance |
| 3.6 | Remove or implement `/teacher/messages` | ✅ DONE | Removed from sidebar (no backend support) |
| 3.7 | Add student list scoped to teacher's classes | ✅ DONE | Full student directory page at `/teacher/students` with class/section filters, search, pagination, roll numbers, guardian info |

### New frontend service files created:
- `apps/frontend/src/services/attendance.service.ts` — Wraps all 4 attendance endpoints (mark, getAll, getByStudent, getReport)
- `apps/frontend/src/services/exams.service.ts` — Wraps all exam endpoints (CRUD, students, analytics, results, grading scales)

---

## Phase 4 — Polish & Edge Cases

| # | Task | Status | Details |
|---|------|--------|---------|
| 4.1 | Fix `switchSchool()` to include `teacherId` | ✅ DONE | Fixed in JWT batch — now includes `teacherId` and `role` in new JWT |
| 4.2 | Add teacher self-service profile edit | ✅ DONE | `GET /teachers/me` + `PATCH /teachers/me` endpoints. `UpdateTeacherProfileDto` restricts to safe fields (phone, address, photo, note, religion, bloodGroup). Frontend profile page at `/teacher/profile` with editable contact info + read-only professional info |
| 4.3 | Add unique constraint for classTeacherOfId | ✅ DONE | `@@unique([classTeacherOfId, schoolId])` added to Teacher model in schema.prisma. Prevents two teachers being class teacher of same class in same school |
| 4.4 | Define historical data policy | ✅ DONE | Soft-deactivate policy: `removeClassAssignment()` now sets `isActive: false` instead of hard-deleting. `remove()` (teacher deletion) also soft-deactivates teacher + all assignments. All historical exams/marks/attendance preserved |
| 4.5 | Add bulk attendance transaction | ✅ DONE | `markAttendance` already uses `prisma.$transaction()` wrapping all upsert/delete operations — verified functional |
| 4.6 | Add `classId` validation on attendance mark | ✅ DONE | Added `classId` to `MarkAttendanceDto`. Teachers must provide `sectionId` (mandatory). Both `classId` and `sectionId` validated against teacher scope. Throws `ForbiddenException` if teacher not assigned |
| 4.7 | Scope check edge case: class-only assignment | ✅ DONE | `TeacherScopeService.getScope()` now expands class-only assignments (sectionId is null) by looking up ALL sections of that class and adding them to `sectionIds`. Also expands classTeacherOfId class sections. Prevents scope gaps for whole-class assignments |

---

## Previously Completed Work (Before This Plan)

| # | Feature | Status | Details |
|---|---------|--------|---------|
| P.1 | `TeacherClassAssignment` Prisma model | ✅ DONE | Full model with class, section, subject, academicYear, school relations |
| P.2 | `teacherId` in JWT/auth flow | ✅ DONE | Login resolves teacher record, includes `teacherId` in JWT payload |
| P.3 | `@TeacherId()` decorator | ✅ DONE | Extracts `teacherId` from `request.user` |
| P.4 | Teacher class assignment CRUD endpoints | ✅ DONE | `GET/POST/DELETE /teachers/:id/class-assignments` |
| P.5 | `GET /teachers/my-classes` endpoint | ✅ DONE | Teacher self-service — returns active assignments with student counts |
| P.6 | Teacher scope in exams (create + findAll) | ✅ DONE | Validates class+section against assignments |
| P.7 | Teacher scope in attendance (mark + findAll) | ✅ DONE | Validates section against assignments |
| P.8 | Teacher scope in assignments (create + findAll) | ✅ DONE | Validates class against assignments |
| P.9 | Frontend teacher dashboard (live data) | ✅ DONE | Stats from `getMyClasses()` + `getAll()` assignments |
| P.10 | Frontend teacher classes page | ✅ DONE | Real API data with student counts |
| P.11 | Frontend admin — Assign Classes dialog | ✅ DONE | Working class/section/subject assignment UI |
| P.12 | Class Teacher Of — schema field | ✅ DONE | `classTeacherOfId` on Teacher model, relation to Class |
| P.13 | Class Teacher Of — admin modal select | ✅ DONE | Optional dropdown in teacher create/edit modal |
| P.14 | Class Teacher Of — backend DTO + service | ✅ DONE | Included in create/update/findAll/findById responses |
| P.15 | Class Teacher Of — table column | ✅ DONE | Shows class name in admin teachers list |
| P.16 | Git committed & pushed | ✅ DONE | Commit `5cb6171` |

---

## Database Schema Status

| Required Table | Status | Notes |
|---|---|---|
| `teachers` | ✅ | 20+ fields, campus support, class teacher relation |
| `classes` | ✅ | With campus, soft delete |
| `sections` | ✅ | Linked to class |
| `subjects` | ✅ | Linked to class, soft delete |
| `teacher_class_assignments` | ✅ | class + section + subject + academicYear + school |
| `exams` | ✅ | class + section + subject + campus + academicYear |
| `exam_results` (marks) | ✅ | student + exam + subject + auto grade/pass |
| `exam_teachers` | ✅ | Junction table for teacher-exam roles |
| `assignments` | ✅ | class + subject + teacher |
| `attendances` | ✅ | student + section + date unique |
| `roles` | ✅ | Per-school, slug-based |
| `permissions` | ✅ | Module + action, 49+ entries |
| `role_permissions` | ✅ | Full RBAC mapping |

### Schema Gaps

- No separate `teacher_subject_assignments` table — combined into `teacher_class_assignments` (acceptable)
- No `campusId` on `TeacherClassAssignment` — campus is only on Teacher, not per-assignment
- `classTeacherOfId` has no unique constraint — multiple teachers can be class teacher of same class
- No `createdByTeacherId` on `exams` table — can't track which teacher created an exam (only `exam_teachers` junction)
- Attendance has no `teacherId` — can't track which teacher marked the attendance

---

## Permission Matrix — Current vs Required

| Permission | Admin | Teacher (Current) | Teacher (Required) |
|---|---|---|---|
| `students:read` | ✅ | ✅ | ✅ |
| `students:create/update/delete` | ✅ | ❌ | ❌ |
| `teachers:read` | ✅ | ✅ | ✅ |
| `academics:read` | ✅ | ✅ | ✅ |
| `attendance:read` | ✅ | ✅ | ✅ |
| `attendance:create` | ✅ | ✅ | ✅ |
| `attendance:update` | ✅ | ✅ | ✅ |
| `exams:read` | ✅ | ✅ | ✅ |
| `exams:create` | ✅ | ✅ | ✅ |
| `exams:update` | ✅ | ✅ | ✅ |
| `exams:delete` | ✅ | ❌ | ❌ (admin only) |
| `assignments:read` | ✅ | ❌ | ✅ **ADD** |
| `assignments:create` | ✅ | ❌ | ✅ **ADD** |
| `assignments:update` | ✅ | ❌ | ✅ **ADD** |
| `assignments:delete` | ✅ | ❌ | ⚠️ Optional |
| `grades:read` | ✅ | ❌ | ✅ **ADD** |
| `grades:create` | ✅ | ❌ | ✅ **ADD** |
| `grades:update` | ✅ | ❌ | ✅ **ADD** |
| `calendar:read` | ✅ | ❌ | ✅ **ADD** |
| `communications:read` | ✅ | ❌ | ⚠️ If messages page kept |
| `resources:read` | ✅ | ❌ | ⚠️ Optional |

---

## Execution Priority

```
ALL PHASES COMPLETE ✅
```

---

## File Change Summary

### New files created:
- `apps/backend/src/modules/teachers/teacher-scope.service.ts` — Centralized scope service
- `apps/frontend/src/app/(teacher)/teacher/attendance/page.tsx` — Mark + history
- `apps/frontend/src/app/(teacher)/teacher/exams/page.tsx` — List + create + detail
- `apps/frontend/src/app/(teacher)/teacher/grades/page.tsx` — Real API marks entry
- `apps/frontend/src/app/(teacher)/teacher/students/page.tsx` — Student directory
- `apps/frontend/src/app/(teacher)/teacher/profile/page.tsx` — Self-service profile
- `apps/frontend/src/services/attendance.service.ts` — Attendance API wrapper
- `apps/frontend/src/services/exams.service.ts` — Exams API wrapper

### Key files modified:
- `apps/backend/src/modules/teachers/teachers.controller.ts` — Added `GET/PATCH /teachers/me`
- `apps/backend/src/modules/teachers/teachers.service.ts` — Profile endpoints + soft-delete policy
- `apps/backend/src/modules/teachers/dto/teacher.dto.ts` — Added `UpdateTeacherProfileDto`
- `apps/backend/src/modules/exams/exams.controller.ts` — `@TeacherId()` on all write endpoints
- `apps/backend/src/modules/exams/exams.service.ts` — Full teacher scope validation
- `apps/backend/src/modules/assignments/assignments.controller.ts` — `@TeacherId()`
- `apps/backend/src/modules/assignments/assignments.service.ts` — Spoofing prevention + scope
- `apps/backend/src/modules/attendance/attendance.controller.ts` — `@TeacherId()`
- `apps/backend/src/modules/attendance/attendance.service.ts` — sectionId mandatory for teachers + classId validation
- `apps/backend/src/modules/attendance/dto/attendance.dto.ts` — Added classId field
- `apps/backend/src/modules/auth/auth.service.ts` — `role` in JWT across all paths
- `apps/backend/prisma/schema.prisma` — `@@unique([classTeacherOfId, schoolId])`
- `apps/backend/prisma/seed.ts` — Teacher permissions
- `apps/backend/src/modules/platform/platform.service.ts` — Teacher permissions
- `apps/frontend/src/middleware.ts` — Teacher role routing
- `apps/frontend/src/app/(teacher)/layout.tsx` — Sidebar + role check fix
- `apps/frontend/src/app/(auth)/login/page.tsx` — Teacher redirect
- `apps/frontend/src/services/teachers.service.ts` — Profile endpoints

---

## New Plan — Subject-Scoped Teacher Exam Access

> Added: March 8, 2026
> Goal: Teachers should create/view/update exams only for the exact class/section/subject combinations they teach. Class teachers may still access all subjects for their own class.

### Problem Summary

- Current teacher login, RBAC, and exam guards already work.
- `TeacherClassAssignment` already supports `classId`, `sectionId`, `subjectId`, and `academicYearId`.
- The current admin teacher assignment UI does **not** capture subject-level teaching assignments.
- The current `syncClasses()` flow stores only class/section rows and effectively drops subject scoping.
- Current scope validation is set-based (`classIds`, `sectionIds`, `subjectIds`) instead of exact tuple-based matching, which is too broad for subject teachers.
- Subjects are currently created **per class**, not globally, so the recommended design should build around class-owned subjects instead of replacing the subject model immediately.

---

## Phase 5 — Exact Teaching Scope Model

| # | Task | Status | Details |
|---|------|--------|---------|
| 5.1 | Formalize assignment semantics | ❌ NOT STARTED | Define clear meaning for rows in `teacher_class_assignments`: class teacher vs subject teacher vs whole-class assignment |
| 5.2 | Stop using set-based authorization for exams | ❌ NOT STARTED | Replace `classIds + sectionIds + subjectIds` logic with exact assignment-row matching for class + section + subject + academicYear |
| 5.3 | Enforce academic year in teacher scope | ❌ NOT STARTED | Teacher access should be resolved against active/current `academicYearId`, not all historical assignments |
| 5.4 | Preserve class teacher override | ❌ NOT STARTED | `classTeacherOfId` should continue to allow all subjects for that class only |

### Target Authorization Rule

A teacher may create, edit, view, delete, or record results for an exam only if **one** of these is true:

1. They are the `classTeacherOfId` for the target class.
2. They have an active teaching assignment matching the exact tuple:
	- `classId`
	- `sectionId` or whole-class section access
	- `subjectId`
	- `academicYearId`

RBAC remains separate:

- `exams:create`, `exams:read`, `exams:update` control module access.
- Teaching assignment controls **data scope** inside the module.

---

## Phase 6 — Database & Schema Alignment

| # | Task | Status | Details |
|---|------|--------|---------|
| 6.1 | Revisit `TeacherClassAssignment` uniqueness | ❌ NOT STARTED | Current unique key excludes `subjectId`, which blocks multi-subject rows for same teacher/class/section/year |
| 6.2 | Decide assignment model | ❌ NOT STARTED | Choose between nullable-field semantics or explicit `assignmentType` enum (`CLASS_TEACHER`, `SUBJECT_TEACHER`, etc.) |
| 6.3 | Add migration strategy for existing assignments | ❌ NOT STARTED | Existing class/section rows should remain valid and be interpretable as broad access until re-assigned |
| 6.4 | Decide whether `academicYearId` is mandatory | ❌ NOT STARTED | Recommended for teaching assignments to avoid cross-year leakage |

### Recommended Schema Direction

Preferred low-risk direction:

- Keep `Subject` linked to `classId` as it is now.
- Keep `TeacherClassAssignment` as the core table.
- Update uniqueness to include `subjectId` and `academicYearId` in the effective assignment identity.
- Optionally add `assignmentType` to avoid overloading `null` values with business meaning.

Why this is the best fit for the current system:

- Subjects are already class-owned in the academics module.
- Exams already require `classId + sectionId + subjectId + academicYearId`.
- This avoids a large refactor into global subject catalogs right now.

---

## Phase 7 — Admin Assignment UX Redesign

| # | Task | Status | Details |
|---|------|--------|---------|
| 7.1 | Replace current “Assign Classes” model | ❌ NOT STARTED | Current modal only saves class + section, which is insufficient for subject teachers |
| 7.2 | Separate class teacher from teaching assignments | ❌ NOT STARTED | Keep `Class Teacher Of` as a distinct homeroom responsibility |
| 7.3 | Add subject-aware assignment UI | ❌ NOT STARTED | Admin should assign teacher by year + class + section + subject |
| 7.4 | Show teaching load clearly in teacher list/detail | ❌ NOT STARTED | Display rows like `Class 2 (A) - Math`, `Class 2 (B) - English` |

### Recommended UX

Best option:

1. Keep `Class Teacher Of` in teacher profile/edit form.
2. Replace current `Assign Classes` modal with `Teaching Assignments`.
3. Each assignment row should contain:
	- Academic Year
	- Class
	- Section or All Sections
	- Subject
	- Active toggle

Why this is better:

- It matches the current `Subject` model (subjects belong to classes).
- It reflects real teaching load instead of generic class membership.
- It keeps “class teacher” and “subject teacher” as separate concepts.

---

## Phase 8 — Exams Module Restrictions

| # | Task | Status | Details |
|---|------|--------|---------|
| 8.1 | Scope class dropdown for teachers | ❌ NOT STARTED | Only assigned classes should appear |
| 8.2 | Scope section dropdown based on selected class | ❌ NOT STARTED | Only allowed sections for that class should appear |
| 8.3 | Scope subject dropdown based on selected class + teacher assignment | ❌ NOT STARTED | Hide all non-taught subjects |
| 8.4 | Keep backend enforcement authoritative | ❌ NOT STARTED | Frontend hiding is convenience only; server must reject invalid tuples |
| 8.5 | Apply exact same scope rules to results entry and exam detail pages | ❌ NOT STARTED | Create/list-only protection is not enough |

### Current State vs Target State

Current state:

- Exams UI already tries to limit teachers using `/teachers/my-classes`.
- Backend already validates teacher scope in exams service.
- But both depend on assignment data that currently lacks precise subject rows.

Target state:

- UI shows only valid class/section/subject combinations.
- Backend checks the same exact tuple.
- A teacher cannot create an exam for another subject simply because they teach that subject in a different class.

---

## Phase 9 — Execution Order

| Order | Step | Reason |
|---|---|---|
| 1 | Finalize business rules for class teacher vs subject teacher | Prevents schema and UI ambiguity |
| 2 | Update schema/constraints for exact teaching assignments | Required before subject-specific rows can be stored safely |
| 3 | Redesign admin assignment APIs and UI | Without this, precise scope data cannot be created |
| 4 | Refactor `TeacherScopeService` to exact-match logic | Core security change |
| 5 | Update exams backend authorization | Server-side enforcement first |
| 6 | Update exams frontend dropdown scoping | UX follows server rules |
| 7 | Update marks/results screens to same rule set | Keeps behavior consistent |
| 8 | Backfill or review old assignment data | Needed for existing teachers |

---

## Recommended Final System

### Keep as-is

- Teacher login via linked `User`
- RBAC permissions for exam module access
- `classTeacherOfId` concept
- Subject creation tied to class

### Change

- Move from broad class membership to exact teaching assignments
- Make teacher scope academic-year aware
- Replace set-based access checks with tuple-based matching
- Redesign admin assignment UI to include subject selection

### Do not do immediately

- Do **not** replace current class-owned `Subject` model with a global subject catalog unless a broader academics refactor is planned.
- Do **not** rely on frontend-only hiding for security.

---

## Definition of Done for This Plan

- Teacher sees only classes they teach.
- Teacher sees only sections they teach for the selected class.
- Teacher sees only subjects they teach for the selected class/section.
- Class teacher can still see all subjects for their own class.
- Backend rejects any exam create/update/result action outside teacher's exact assignment scope.
- Existing teacher login and exam permissions continue to work.
