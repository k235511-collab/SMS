# SMS SaaS Quality Baseline

This document captures the current repository quality baseline at the start of Phase 1 of the improvement plan.

It is intended to answer four questions:

- What validation commands currently work?
- What is still broken or incomplete?
- Where are the main risk hotspots?
- What should happen next before deeper refactors?

## Repository Snapshot

- Monorepo managed with `pnpm` workspaces and Turborepo
- Frontend: Next.js 15.1.11 + React 19
- Backend: NestJS + Prisma
- Shared package: `packages/shared-types`

## Phase 1 Status

### Done

- Broken `ExamsService` spec repaired locally to match `TeacherScopeService.getExamAccessConditions(...)`
- Targeted backend exams spec verified passing
- Shared-types validation verified passing
- Backend Vercel bundle verified building
- Initial deployment blocker narrowed to runtime database connectivity rather than handler bootstrap

### Still Open

- Backend test coverage remains minimal even after new guard and finance utility tests
- Security hardening is still staged rather than globally enforced
- Oversized backend services still need deeper decomposition
- Backend Vercel runtime remains blocked on database connectivity/env correctness

## Canonical Validation Commands

These are the current best-known validation commands and their current outcomes.

### Root Quality Command

Command:

```powershell
pnpm quality
```

Current status:

- defined and ready to use

Notes:

- runs shared-types lint, frontend lint, backend Jest in-band, and backend Vercel build

### Shared Types

Command:

```powershell
pnpm --filter @sms-saas/shared-types lint
```

Current status:

- passing

### Backend Test Suite

Command:

```powershell
pnpm --filter @sms-saas/backend exec jest --runInBand
```

Current status:

- expected to be the canonical backend test command for now

Notes:

- uses in-band execution because default Jest worker spawning previously hit `EPERM`
- current coverage now includes exams, campus guard, permissions guard, and finance utility logic

### Backend Vercel Build

Command:

```powershell
pnpm build:vercel
```

Working directory:

```text
apps/backend
```

Current status:

- passing

Notes:

- bundle builds successfully
- runtime still fails later at Prisma database connection when executed in serverless style

### Frontend Lint

Command:

```powershell
pnpm --filter @sms-saas/frontend lint
```

Current status:

- passing with warnings

Notes:

- a committed frontend ESLint config now exists
- the command no longer blocks on interactive setup
- current output still contains many warnings, mainly:
  - `react-hooks/exhaustive-deps`
  - `@next/next/no-img-element`

## Current Working Validation Set

The current practical validation set for local work is:

```powershell
pnpm quality
```

## Known Drifts Between Docs And Code

### README Was Outdated

Phase 3 update:

- README now reflects Next.js 15, React 19, real local ports, and root quality commands

Files involved:

- [README.md](README.md)
- [package.json](apps/frontend/package.json)

### Documentation Structure Was Missing

Phase 3 update:

- the repo now has architecture, development, testing, security, contributing, and improvement-plan docs

### Forgot Password UX vs Actual Capability

Current state:

- forgot-password page is only an informational screen
- password reset is still admin-driven through user management, not token-based self-service recovery

Files involved:

- [page.tsx](apps/frontend/src/app/(auth)/forgot-password/page.tsx)
- [users.controller.ts](apps/backend/src/modules/users/users.controller.ts)

## Current Security Exceptions And Hardening Gaps

### Rate Limiting Is Staged, Not Global

Current state:

- `ThrottlerModule` is configured
- global throttler guard is still commented out
- public auth routes now use explicit `ThrottlerGuard` + `@Throttle(...)` decorators

Files involved:

- [app.module.ts](apps/backend/src/app.module.ts)
- [main.ts](apps/backend/src/main.ts)

Impact:

- throttling is currently limited to selected public auth routes and is not globally enforced
- abuse and DoS risk remains for unthrottled endpoints, especially high-frequency anonymous or low-cost requests
- interim protections in place today are route-level `ThrottlerGuard` + `@Throttle(...)`, JWT/campus/permission guards, and operational monitoring while global rollout is staged

### Unscoped Prisma Access Is A High-Risk Gap In Auth/Permission Flows

Observed usage areas:

- auth flow
- campus guard
- teacher role lookup
- parent role lookup

Key files:

- [auth.service.ts](apps/backend/src/modules/auth/auth.service.ts)
- [campus.guard.ts](apps/backend/src/common/guards/campus.guard.ts)
- [teachers.service.ts](apps/backend/src/modules/teachers/teachers.service.ts)
- [parents.service.ts](apps/backend/src/modules/parents/parents.service.ts)

Impact:

- cross-tenant data exposure is possible if scope checks regress or are bypassed
- broad `findFirst`/`findMany`/`findUnique` patterns in privileged flows require stricter principal-scoped filtering

Required fixes and verification:

- replace unscoped Prisma model calls with explicit scoped queries (`tenantId`/`schoolId`, `campusId`, `userId`, or relation-bound filters) wherever a scoped delegate can be used
- move broad lookup patterns into parameterized methods that require current principal context
- enforce scope rejection in `CampusGuard.validate*` and `AuthService.verify*` paths before any state-changing operation proceeds
- keep inline justification comments for any remaining intentional cross-tenant access and mark each for prioritized security review
- add unit and integration tests to validate tenant boundaries for auth and permission-sensitive flows

### Raw SQL And Unsafe SQL Exist

Observed usage:

- health check raw query
- finance payment row locking with `FOR UPDATE`
- platform plan bulk update with `$executeRawUnsafe`

Key files:

- [health.controller.ts](apps/backend/src/modules/health/health.controller.ts)
- [finance.service.ts](apps/backend/src/modules/finance/finance.service.ts)
- [platform.service.ts](apps/backend/src/modules/platform/platform.service.ts)

Impact:

- inline justification comments are required for each remaining raw/unsafe SQL path
- each raw/unsafe SQL usage is prioritized for security review and replacement feasibility tracking

## Oversized Files And Modules

### Finance Service

File:

- [finance.service.ts](apps/backend/src/modules/finance/finance.service.ts)

Current size:

- still over 1100 lines, but discount/status logic has now been extracted into `finance.utils.ts`

Risk:

- mixes fee structures, invoices, payments, reporting, expenses, and bulk operations

### Platform Service

File:

- [platform.service.ts](apps/backend/src/modules/platform/platform.service.ts)

Current size:

- 1183 lines

Risk:

- mixes school provisioning, registrations, plans, settings, impersonation, analytics, and admin workflows

## Highest-Risk Backend Paths

These are the backend areas that should be prioritized for tests and review before deeper refactoring.

1. Auth
   - cross-school login behavior
   - refresh flow
   - school switching
   - platform admin bypass paths
2. Tenancy
   - Prisma tenant isolation extension
   - request context setup
   - accidental bypass paths
3. Permissions
   - permission resolution
   - super-admin/platform-admin bypass logic
4. Campus Scoping
   - campus guard enforcement
   - header injection and mismatch denial
5. Finance Mutations
   - invoice/payment correctness
   - raw SQL locking path
   - deletion/restore flows

## Backend Deployment Blockers

### Vercel Bundle Builds, But Runtime Still Fails At Database Connection

Current state:

- serverless bundle builds successfully
- local Vercel-style bootstrap reaches Nest application startup
- runtime then crashes at Prisma connection with a TLS/database connectivity error

Interpretation:

- handler bootstrap is no longer the primary blocker
- current deploy risk has shifted toward database connection string, SSL expectations, serverless env config, or provider-specific connectivity settings

### Backend Env Contract Was Fragile

Observed issue:

- backend config was depending on frontend-style Supabase env names

Phase 1 local hardening already applied:

- backend config now supports either backend-style `SUPABASE_*` or frontend-style `NEXT_PUBLIC_SUPABASE_*` names

## Immediate Next Actions

1. Run and verify the new root `pnpm quality` command.
2. Expand backend coverage into auth and tenant-isolation behavior.
3. Decide whether to extend throttling beyond public auth routes next.
4. Continue decomposing `FinanceService` and then `PlatformService`.
5. Review Vercel backend env settings and database connection configuration before treating deployment as a code issue.

## Exit Criteria For Phase 1

Phase 1 should be considered complete when:

- `docs/quality-baseline.md` exists and is accurate
- broken exams test is fixed and committed
- canonical validation commands are documented
- current drifts and security exceptions are explicitly listed
- highest-risk backend areas are identified for Phase 2
