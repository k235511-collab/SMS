# SMS SaaS — Multi-Tenant School Management System

A monorepo-based, multi-tenant School Management SaaS built with **Next.js 14**, **NestJS**, **Prisma**, and **TypeScript**.

## Architecture & Monorepo

This project is managed as a monorepo using **Turborepo** and **pnpm workspaces** for efficient builds and dependency management.

```
sms-saas/
├── apps/
│   ├── frontend/          → Next.js 14 (App Router, Tailwind CSS, Shadcn/UI)
│   └── backend/           → NestJS (REST API, Prisma ORM, JWT Auth, Reports)
├── packages/
│   └── shared-types/      → Shared DTOs and TypeScript interfaces
├── Prompts/               → LLM prompts and reference documentation
├── backup.dump            → Database backup for recovery/deployment
├── turbo.json              → Turborepo pipeline configuration
├── pnpm-workspace.yaml     → pnpm workspace definition
└── tsconfig.base.json      → Shared strict TypeScript configuration
```

## Prerequisites

- **Node.js** >= 20
- **pnpm** >= 9
- **PostgreSQL** (for the backend)

## Getting Started

### 1. Install dependencies
```bash
pnpm install
```

### 2. Configure environment
```bash
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
```
Edit the `.env` files with your database URL and secrets.

### 3. Set up the database
```bash
cd apps/backend
pnpm db:generate    # Generate Prisma client
pnpm db:migrate     # Run migrations
pnpm db:seed        # Seed demo data
```

### 4. Run development servers
```bash
# From root — starts both frontend and backend
pnpm dev
```

- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:4000
- **Swagger Docs**: http://localhost:4000/docs

## Database Management

The application uses **Prisma** as the ORM. The schema is located at `apps/backend/prisma/schema.prisma`.

### Key Components:
- **`schema.prisma`**: Defines the unified SMS schema including Schools, Campuses, Students, Teachers, Exams, and Fees.
- **`FULL_MIGRATION_SCRIPT.sql`**: A comprehensive SQL script for manual database initialization or reference.
- **`backup.dump`**: A database dump file located at the root for quick restoration or seeding of the production-ready schema.

## Utility & Debugging Scripts

Several utility scripts are available in the `apps/backend` directory for maintenance and debugging:

| Path | Description |
|---|---|
| `apps/backend/debug-db.ts` | Utility for testing database connectivity and performing raw queries. |
| `apps/backend/check_invoices.ts` | Validates invoice generation and consistency. |
| `apps/backend/test-vercel.js` | Script to verify backend deployment on Vercel environment. |
| `apps/backend/scripts/check-t2-state.js` | Helper to verify tenant/state consistency. |
| `apps/backend/scripts/deactivate-assignment.js` | Administrative script to bulk-deactivate assignments. |
| `start_dev.bat` | Windows batch file to quickly start the development environment from the root. |

## Key Design Decisions

| Decision | Rationale |
|---|---|
| **Prisma inside backend only** | Database layer is isolated; shared-types contains only DTO interfaces |
| **Tenant-scoped queries** | Every data query is scoped to a `tenantId` (School) for full isolation |
| **JWT with tenant context** | Auth tokens embed `tenantId` for automatic tenant resolution |
| **Strict TypeScript** | Enabled everywhere via shared `tsconfig.base.json` |
| **Separate .env files** | Frontend and backend have independent configuration |
| **Modular NestJS structure** | Each domain module is independently extractable as a microservice |

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start all apps in dev mode |
| `pnpm build` | Build all apps and packages |
| `pnpm lint` | Lint all apps and packages |
| `pnpm clean` | Clean build artifacts |
| `pnpm format` | Format code with Prettier |

## Multi-Tenancy Model

Each tenant (school) is fully isolated at the database row level. The `tenantId` is resolved via:
1. JWT token payload (authenticated requests)
2. `x-tenant-id` header (API key requests)
3. Tenant slug in the URL path (public routes)

## Preparing for Microservice Extraction

Each NestJS module (`auth`, `tenants`, `users`) is self-contained with:
- Its own module, controller, and service
- Dependency injection via NestJS IoC
- No cross-module direct imports (uses shared interfaces)

To extract a module as a standalone microservice:
1. Create a new `apps/service-name` directory
2. Move the module code and its Prisma models
3. Set up inter-service communication (gRPC/message queue)
4. Update the API gateway to route to the new service
