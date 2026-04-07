# Project Bug Analysis & Remediation Plan

## Scope
This plan is based on a project-wide static/compile sweep of backend and frontend, plus targeted review of auth, deployment wrapper, finance batch generation, and student filtering flows.

## Current Build Status
- Backend build: ✅ passes (`npx nest build`)
- Frontend build: ❌ fails
  - Blocking error in `apps/frontend/src/app/providers.tsx` (React hooks used in a server component).

## Priority Bugs

### P0 — Frontend production build fails
- **File:** `apps/frontend/src/app/providers.tsx`
- **Symptoms:** Next.js build fails with: hooks (`useState`, `useEffect`) used without client directive.
- **Root cause:** Missing `"use client"` at top of file.
- **Fix plan:**
  1. Add `"use client"` to `providers.tsx`.
  2. Re-run frontend build.
- **Validation:** `pnpm --filter @sms-saas/frontend run build`

### P0 — Sensitive error details exposed from Vercel API wrapper
- **File:** `apps/backend/api/index.js`
- **Symptoms:** API 500 response includes stack trace and masked DB URL.
- **Risk:** Information disclosure in production.
- **Fix plan:**
  1. Return generic error payload in production (`NODE_ENV === 'production'`).
  2. Keep stack/db debug only in non-production.
  3. Ensure logging remains server-side only.
- **Validation:** Trigger an intentional boot error in non-prod and prod env simulation; confirm payload differences.

### P1 — Invalid CORS combination in serverless bootstrap
- **File:** `apps/backend/src/vercel.ts`
- **Symptoms:** `origin: '*'` with `credentials: true`.
- **Risk:** Browser blocks credentialed requests; intermittent auth/session issues in deployment.
- **Fix plan:**
  1. Use env-driven origins from `CORS_ORIGINS` (same pattern as `main.ts`).
  2. Keep `credentials: true` only with explicit origins.
- **Validation:** Browser network check for preflight + authenticated calls from deployed frontend.

### P1 — Existing lint/quality issues in parents dashboard page
- **File:** `apps/frontend/src/app/(dashboard)/dashboard/parents/page.tsx`
- **Symptoms:** Multiple unused imports/state values from diagnostics.
- **Risk:** Reduced maintainability; can fail stricter CI pipelines.
- **Fix plan:**
  1. Remove unused imports/state or wire missing behaviors.
  2. Run lint/type checks.
- **Validation:** `pnpm --filter @sms-saas/frontend run lint`

### P1 — Database migration/runtime mismatch risk on Supabase pooler URL
- **Context:** Supabase URL currently indicates pooler style (`pgbouncer=true`, port 6543).
- **Risk:** Prisma migration and long transactions can fail/behave unexpectedly behind pooler.
- **Fix plan:**
  1. Use direct DB URL for migrations.
  2. Keep runtime URL consistent with Prisma requirements.
  3. Document env split (`DATABASE_URL` direct for Prisma workflows).
- **Validation:** `pnpm --filter @sms-saas/backend run db:migrate:prod` succeeds consistently.

## Recently Fixed (Keep in Regression Tests)

### Finance batch invoice generation correctness
- **Files:**
  - `apps/backend/src/modules/finance/finance-cron.service.ts`
  - `apps/backend/src/modules/students/students.service.ts`
  - `apps/frontend/src/app/(dashboard)/dashboard/finance/page.tsx`
- **What was corrected:**
  - Duplicate prevention now aligned to billing month (`dueDate` month), not `createdAt` month.
  - Class/fee-structure compatibility checks added.
  - Student search now respects selected class; all-classes searches use campus scope.
  - Combined filters no longer override each other in student listing.
- **Regression tests to add:**
  1. Batch-generate same fee structure twice in same billing month → second run skipped.
  2. Search with class selected returns only class students.
  3. Search with all classes + campus selected returns campus-wide results only.

### Timetable academic year linkage
- **Files:**
  - `apps/backend/src/modules/timetable/timetable.service.ts`
  - `apps/backend/src/modules/timetable/timetable.controller.ts`
- **What was corrected:**
  - Slot create/update now auto-resolves `academicYearId` from payload/campus current year/school current year fallback.
- **Regression tests to add:**
  1. Create slot without `academicYearId` under campus with current year → field is populated.
  2. Update existing slot preserves/updates year correctly.

## Recommended Execution Order
1. Fix `providers.tsx` client directive (unblocks frontend deploy).
2. Harden `api/index.js` error payload (security).
3. Correct CORS in `src/vercel.ts` for credentialed auth on Vercel.
4. Clean `parents/page.tsx` unused code warnings.
5. Add regression tests/checklist for finance and timetable fixes.

## Verification Checklist
- Backend build passes: `pnpm --filter @sms-saas/backend run build`
- Frontend build passes: `pnpm --filter @sms-saas/frontend run build`
- Lint passes (frontend at minimum).
- Deployed auth flow stable over >20 minutes idle/active usage.
- Batch invoice modal works with class + campus scoped search and no duplicate monthly invoices.

## Notes
- This plan focuses on high-impact, user-visible, and deployment/security-critical defects first.
- Additional deeper audit pass (authorization matrix + tenancy boundaries + DB constraints) is recommended after P0/P1 closure.
