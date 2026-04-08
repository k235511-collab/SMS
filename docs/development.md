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
- `SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_PUBLISHABLE_DEFAULT_KEY` or `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY`
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

## Backend Vercel Notes

- root directory should be `apps/backend`
- build command should be `pnpm build:vercel`
- `api/index.js` loads `dist/vercel.js`
- the serverless function still requires working database TLS and env configuration at runtime
- for Supabase on Vercel, use the transaction pooler URL for `DATABASE_URL` and the direct host for `DIRECT_DATABASE_URL`
- if the pooled Supabase URL uses port `6543`, include `pgbouncer=true`
