# Directory Structure

## Root
- `.agent/`: GSD workflow files and automation scripts.
- `apps/`: Main applications (backend & frontend).
- `packages/`: Shared libraries (shared-types).
- `node_modules/`: Project dependencies.
- `pnpm-workspace.yaml`: pnpm monorepo configuration.
- `turbo.json`: Turbo build system config.

## Backend (apps/backend)
- `prisma/`: Prisma schema and migration files.
- `src/`:
  - `common/`: Global filters, interceptors, guards, decorators, and middleware.
  - `config/`: Application configuration files.
  - `modules/`: Feature-based modules (academics, auth, finance, students, etc.).
  - `prisma/`: Prisma service and module for dependency injection.
  - `app.module.ts`: Root NestJS module.
  - `main.ts`: Entry point for the backend.

## Frontend (apps/frontend)
- `src/`:
  - `app/`: Next.js App Router folders ((auth), (dashboard), (platform)).
  - `components/`:
    - `ui/`: Standard Shadcn/ui components.
    - `auth/`, `dashboard/`, `forms/`, etc.: Feature-specific components.
  - `context/`: React context providers (AuthContext, SessionContext).
  - `hooks/`: Custom React hooks.
  - `lib/`: Utility libraries (api-client, utils, env).
  - `modules/`: Core business logic or larger UI modules.
  - `services/`: Specific service wrappers for API interaction.
  - `middleware.ts`: Next.js middleware for auth/routing.
