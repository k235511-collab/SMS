# Development

Last verified: 2026-04-08

## Prerequisites

- Node.js `20+`
- pnpm `9+`
- PostgreSQL

## Install

```bash
pnpm install
```

## Environment Files

Create these local files before running the apps:

```bash
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
```

Backend envs to populate first:

- `DATABASE_URL`
- `DIRECT_DATABASE_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`
- `CORS_ORIGINS`
- `GOOGLE_CLIENT_ID`
- `SUPABASE_URL` (backend/server `.env`; backend also supports `NEXT_PUBLIC_SUPABASE_URL` as a fallback)
- `SUPABASE_ANON_KEY` (preferred backend/server key for Supabase client initialization)
- `SUPABASE_PUBLISHABLE_DEFAULT_KEY` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` are legacy publishable-key names used in older setups
- if browser code needs Supabase values, set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY` in frontend public envs
- if both backend and frontend use Supabase, set both server and client env pairs (`SUPABASE_URL` + `SUPABASE_PUBLISHABLE_DEFAULT_KEY` and `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`) and remember publishable keys are public by design
- `SUPABASE_SERVICE_ROLE_KEY`

## Database Setup

```bash
cd apps/backend
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

## Run The Apps

From the repo root:

```bash
pnpm dev
```

Default local URLs:

- frontend: `http://localhost:3001`
- backend: `http://localhost:4000`
- swagger: `http://localhost:4000/docs`

## Quality Checks

From the repo root:

```bash
pnpm quality
```

If you need to run pieces individually:

```bash
pnpm quality:shared-types
pnpm quality:frontend
pnpm quality:backend:test
pnpm quality:backend:build
```

On some Windows setups, backend Jest runs are most reliable with `--runInBand`, which is already baked into the root quality command.

## Teacher Assignment Sync Contract

Use `PATCH /teachers/:id/sync-classes` with a role-aware payload:

```json
{
	"academicYearId": "<year-id>",
	"assignments": [
		{
			"classId": "<class-id>",
			"sectionIds": ["<section-id>"],
			"subjectIds": ["<subject-id>"],
			"isClassTeacher": true,
			"isSubjectTeacher": true
		}
	]
}
```

Rules enforced by backend:

- each class entry must include at least one role (`isClassTeacher` or `isSubjectTeacher`)
- class-teacher role requires at least one `sectionId`
- subject-teacher role requires at least one `subjectId`
- class-teacher conflicts are checked per class+section
- subject-teacher conflicts are checked per class+subject (+ section overlap)

`GET /teachers/my-classes` returns mixed assignment rows. Frontend should split cards by role using `subject`:

- `subject = null` -> class-teacher section cards
- `subject != null` -> subject-teacher load cards

## Backend Vercel Notes

- root directory should be `apps/backend`
- build command should be `pnpm build:vercel`
- `api/index.js` loads `dist/vercel.js`
- the serverless function still requires working database TLS and env configuration at runtime
- for Supabase on Vercel, use the transaction pooler URL for `DATABASE_URL` and the direct host for `DIRECT_DATABASE_URL`
- for transaction-pooler `DATABASE_URL` values (typically port `6543`), add `pgbouncer=true` as a query parameter by appending `?pgbouncer=true` or `&pgbouncer=true` if other query params already exist
- keep `DIRECT_DATABASE_URL` pointed at the direct database host and do not add `pgbouncer=true` to `DIRECT_DATABASE_URL`
