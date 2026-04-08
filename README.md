# SMS SaaS

Multi-tenant school management SaaS built with Next.js 15, React 19, NestJS, Prisma, PostgreSQL, and TypeScript.

## Stack

- `apps/frontend`: Next.js 15 App Router frontend on port `3001`
- `apps/backend`: NestJS REST API on port `4000`
- `packages/shared-types`: shared TypeScript contracts
- Tooling: pnpm workspaces, Turborepo, Prisma, Tailwind CSS

## Getting Started

### Prerequisites

- Node.js `20+`
- pnpm `9+`
- PostgreSQL

### Install

```bash
pnpm install
```

### Configure environment

```bash
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
```

Fill in backend database, JWT, Google auth, CORS, and Supabase values before starting the API.

### Database setup

Create the PostgreSQL database first (for example `sms_saas_dev`) using `createdb` or `psql`, and use the appropriate database user/connection details for your local environment.

```bash
cd apps/backend
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

### Run locally

```bash
pnpm dev
```

- Frontend: `http://localhost:3001`
- Backend: `http://localhost:4000`
- Swagger: `http://localhost:4000/docs`

## Quality Commands

Run the full baseline quality suite from the repo root:

```bash
pnpm quality
```

Individual commands:

```bash
pnpm quality:shared-types
pnpm quality:frontend
pnpm quality:backend:test
pnpm quality:backend:build
```

## Project Layout

```text
sms-saas/
|- apps/
|  |- frontend/
|  `- backend/
|- packages/
|  `- shared-types/
|- docs/
|- turbo.json
`- pnpm-workspace.yaml
```

## Core Architecture

- Backend tenancy is school-scoped with Prisma tenant isolation extensions.
- Authentication uses JWT access and refresh tokens plus Google sign-in support.
- Campus scoping and permissions are enforced with Nest guards.
- Shared DTOs and interfaces live in `packages/shared-types`.
- The platform/admin layer manages school registration, plans, and cross-tenant operations.

## Documentation

- `docs/quality-baseline.md`
- `docs/improvement-plan.md`
- `docs/architecture.md`
- `docs/development.md`
- `docs/testing.md`
- `docs/security.md`
- `docs/contributing.md`

## Deployment Notes

- The backend Vercel build uses `pnpm build:vercel` from `apps/backend`.
- The serverless entrypoint is `apps/backend/api/index.js`, which loads `dist/vercel.js`.
- Backend deployment also depends on valid `DATABASE_URL`, `DIRECT_DATABASE_URL`, JWT secrets, CORS origins, and Supabase env vars.
- For Supabase on Vercel, use the transaction pooler for `DATABASE_URL` and the direct database host for `DIRECT_DATABASE_URL`.
