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
- platform admins intentionally bypass school scoping for cross-tenant administration

## Request Flow

1. Nest middleware resolves tenant context.
2. JWT auth guard authenticates unless a route is marked `@Public()`.
3. Permissions and campus guards enforce access rules.
4. Prisma model delegates apply school scoping automatically.
5. A small number of explicit `unscopedClient` paths handle cross-tenant workflows.

## Frontend Shape

- auth pages live under `apps/frontend/src/app/(auth)`
- dashboard and role-based application pages live under `apps/frontend/src/app/(dashboard)`
- shared API and auth state live under `apps/frontend/src/lib` and `apps/frontend/src/context`

## Known Structural Risks

- `FinanceService` and `PlatformService` still hold multiple responsibilities
- frontend leans heavily on client components, which limits server-component benefits
- Vercel backend deployment still depends on correct serverless database configuration
