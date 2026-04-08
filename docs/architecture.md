# Architecture

Last verified: 2026-04-08

## Monorepo Layout

- `apps/frontend`: Next.js 15 App Router UI for school, campus, and platform workflows
- `apps/backend`: NestJS API, Prisma data access, auth, reports, uploads, and platform administration
- `packages/shared-types`: shared DTOs and interface contracts used across apps

## Backend Shape

The backend is organized by domain modules rather than a single vertical slice. Important areas include:

- auth and school switching
- schools, campuses, users, roles, and permissions
- students, parents, teachers, academics, attendance, exams, and timetable
- finance, analytics, notifications, assignments, reports, and uploads
- platform plans, registration approvals, and settings

## Tenancy Model

- school is the primary tenant boundary
- Prisma model access is wrapped by a tenant-isolation extension
- global guards add auth, permission, and campus enforcement
- platform admins intentionally bypass school scoping for cross-tenant administration under strict controls

### Platform Admin Cross-Tenant Safeguards

- RBAC and least privilege: only the Platform Admin role may execute cross-tenant operations, permissions must be granted per operation category (read-only support, billing operations, tenant lifecycle operations), and default access is deny-all until explicitly approved.
- Mandatory audit logging: every cross-tenant action must record who/what/when/why with at least `actorUserId`, `actorRole`, `targetSchoolId`, `targetCampusId` (if any), `operation`, `resourceType`, `resourceId`, `reasonCode`, `approvalId`, `requestId`, `ipAddress`, `userAgent`, and `timestamp`.
- Approval and periodic review: sensitive cross-tenant write actions require two-party approval (Engineering Manager plus Security/Compliance owner) and privileged access must be reviewed at least quarterly.
- Compliance and data handling: cross-tenant data handling must follow FERPA/GDPR minimization principles, use least-data access, prohibit bulk export without explicit approval, and enforce retention/deletion rules aligned to legal and policy requirements.
- Retention and monitoring: audit logs for privileged cross-tenant actions must be retained for a minimum of 365 days, monitored with alerting for anomalous patterns, and sampled in monthly security review.

## Request Flow

1. Nest middleware resolves tenant context.
2. JWT auth guard authenticates unless a route is marked `@Public()`.
3. Permissions and campus guards enforce access rules.
4. Prisma model delegates apply school scoping automatically.
5. Explicit `unscopedClient` paths are tightly controlled, audited, and reviewed.

### Canonical `unscopedClient` Usage Inventory

The following are the currently approved `unscopedClient` code paths (symbol name is always `unscopedClient`):

- `apps/backend/src/modules/auth/auth.service.ts` (`login`, `googleSignIn`, `refreshToken`, `getProfile`, `getMySchools`, `switchSchool`): required for pre-tenant authentication and cross-tenant identity checks. Owner: Auth module owner. Approver: Security owner.
- `apps/backend/src/common/guards/campus.guard.ts` (`canActivate` via `resolveUserCampus`): required to validate campus/user relationships before tenant-scoped delegates are available. Owner: Platform backend owner. Approver: Security owner.
- `apps/backend/src/modules/teachers/teachers.service.ts` (teacher role bootstrap fallback): required during initial role/bootstrap paths when tenant extension blocks discovery. Owner: Academics backend owner. Approver: Platform backend owner.
- `apps/backend/src/modules/parents/parents.service.ts` (parent role bootstrap fallback): required for parent bootstrap before normal tenant-context CRUD is established. Owner: Academics backend owner. Approver: Platform backend owner.

Requirements for any new `unscopedClient` usage:

- code review from module owner and Security owner is mandatory before merge
- justification comment at call site must explain why tenant-scoped delegate is insufficient
- explicit authorization check must run before the `unscopedClient` call
- explicit audit log entry must be emitted around the action
- unit + integration test coverage must prove no tenant data leakage
- manual reviewer checklist must confirm scope constraints and logging fields

## Frontend Shape

- auth pages live under `apps/frontend/src/app/(auth)`
- dashboard and role-based application pages live under `apps/frontend/src/app/(dashboard)`
- shared API and auth state live under `apps/frontend/src/lib` and `apps/frontend/src/context`

## Known Structural Risks

- `FinanceService` and `PlatformService` still hold multiple responsibilities
- frontend leans heavily on client components, which limits server-component benefits
- Vercel backend deployment still depends on correct serverless database configuration.
