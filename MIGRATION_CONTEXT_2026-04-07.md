# Prisma Migration Context (2026-04-07)

## Objective
Add `mustChangePassword` support on `users` via Prisma migration without resetting the remote Supabase database.

## Environment Context
- Repo: `SMS` monorepo
- Backend package: `apps/backend`
- Database: Supabase Postgres (`aws-1-ap-southeast-1.pooler.supabase.com:5432`)
- Prisma CLI usage in this repo: `pnpm prisma ...` (not `prisma ...`)

## What Changed

### 1) Schema change already present
- File: `apps/backend/prisma/schema.prisma`
- Change: `User` model includes:
  - `mustChangePassword Boolean @default(false)`

### 1.1) Platform admin/user password reset flow updates (application layer)

#### Backend changes
- `apps/backend/src/modules/users/users.controller.ts`
  - Added `POST /users/:id/reset-password` endpoint.
  - Uses existing tenant + permission guards and requires `users:update`.
  - Captures request metadata (`ipAddress`, `userAgent`, `campusId`) for audit trail.

- `apps/backend/src/modules/users/users.service.ts`
  - Added `resetPassword(...)` service method:
    - Generates URL-safe temporary password.
    - Hashes and stores it.
    - Sets `mustChangePassword = true`.
    - Creates an audit log entry with old/new `mustChangePassword` values.
  - Adds guardrail for Google-only users (no local password hash): reset is rejected with `BadRequestException`.

- `apps/backend/src/modules/auth/auth.service.ts`
  - Login/session payload now includes `mustChangePassword`.
  - Change-password logic now clears the flag (`mustChangePassword = false`) after successful password update.

#### Frontend changes
- `apps/frontend/src/app/(dashboard)/dashboard/users/page.tsx`
  - Added "Reset password" action in users list menu(s).
  - Added reset dialog that:
    - calls `POST /users/:id/reset-password`
    - displays generated temporary password
    - informs admin that user must change password on next sign-in.

- `apps/frontend/src/components/auth/protected-route.tsx`
  - Added forced routing behavior:
    - if `user.mustChangePassword === true` and user is not platform admin, redirect to `/dashboard/settings`
    - allows settings page so user can complete password change.

- `apps/frontend/src/lib/auth-types.ts`
  - Added `mustChangePassword?: boolean` to `AuthUser`.

- `apps/frontend/src/app/(auth)/forgot-password/page.tsx`
  - Replaced self-serve reset form with admin-managed guidance text.

- `apps/frontend/src/app/(auth)/login/page.tsx`
  - Updated helper copy to: "Forgot your password? Contact your admin".

### 2) Baseline migration adjusted
- Folder: `apps/backend/prisma/migrations/20260407_baseline_current_db`
- File: `migration.sql`
- Updated to an intentional no-op baseline marker to avoid shadow DB replay conflicts from duplicate objects (for example enum `Gender` already existing).

Current baseline content:
```sql
-- Baseline marker migration.
-- Intentionally left empty because schema objects already exist in the target database.
```

### 3) New migration created manually
- Folder: `apps/backend/prisma/migrations/20260407163100_must_change_password`
- File: `migration.sql`
- SQL:
```sql
ALTER TABLE "users"
ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
```

Reason it was created manually:
- `pnpm prisma migrate dev --create-only` was blocked by drift/edited historical migrations on remote DB.
- Manual SQL migration avoids destructive reset and keeps production-like DB safe.

## Errors Encountered (for traceability)
- `ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL Command "prisma" not found` when running from wrong directory/root context.
- Prisma drift warnings: multiple historical migrations modified after being applied.
- `P3006` on shadow DB while baseline contained full schema SQL (`type "Gender" already exists`).
- `P3012` when attempting `migrate resolve --rolled-back` on migrations not in failed state.

## Current Status
`pnpm prisma migrate status` reports pending migrations:
1. `20260406190000_make_user_email_unique`
2. `20260407163100_must_change_password`

No reset was performed.

## Remaining Steps

Run from `apps/backend`:

```bash
pnpm prisma migrate deploy
pnpm prisma migrate status
```

Expected result:
- Both pending migrations become applied.
- `mustChangePassword` column exists in `public.users` with default `false`.

## Remaining Application Follow-up
- Confirm reset-password endpoint permission model is correct for all admin roles in your tenant model.
- Confirm platform admin behavior for forced password change is intentionally excluded (`!user.isPlatformAdmin`).
- End-to-end validation:
  1. Admin resets a user password in Users page.
  2. User signs in with temporary password.
  3. User is redirected to settings.
  4. User changes password.
  5. Subsequent login no longer redirects to settings (`mustChangePassword=false`).
- Optional hardening:
  - Add expiry window for temporary password use.
  - Add event/notification that password was reset (without exposing password in logs).
  - Add tests around Google-only account reset rejection and forced redirect behavior.

## Verification Checklist
- [ ] `pnpm prisma migrate deploy` succeeds
- [ ] `pnpm prisma migrate status` shows no pending migrations
- [ ] Login/password-change flow respects `mustChangePassword` where used in backend/frontend code
- [ ] Commit includes:
  - `apps/backend/prisma/schema.prisma` (if modified in this branch)
  - `apps/backend/prisma/migrations/20260407_baseline_current_db/migration.sql`
  - `apps/backend/prisma/migrations/20260407163100_must_change_password/migration.sql`
  - `apps/backend/src/modules/auth/auth.service.ts`
  - `apps/backend/src/modules/users/users.controller.ts`
  - `apps/backend/src/modules/users/users.service.ts`
  - `apps/frontend/src/app/(auth)/forgot-password/page.tsx`
  - `apps/frontend/src/app/(auth)/login/page.tsx`
  - `apps/frontend/src/app/(dashboard)/dashboard/users/page.tsx`
  - `apps/frontend/src/components/auth/protected-route.tsx`
  - `apps/frontend/src/lib/auth-types.ts`

## Notes for Team
- Avoid editing already-applied migration SQL files; it causes drift and blocks `migrate dev`.
- For remote/shared DBs, prefer `migrate deploy` for applying committed migration files.
- If a future baseline is needed, keep it as an explicit marker and coordinate migration history changes across the team.
