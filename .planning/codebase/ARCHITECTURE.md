# Architecture Overview

## System Pattern
The project is a **monorepo** using **Turbo** and **pnpm workspaces**. It follows a **Full-Stack Managed SaaS** pattern with a strong emphasis on multi-tenancy.

## Architecture Layers

### Backend (NestJS)
- **Modular Monolith**: Organized into feature-driven modules (e.g., `StudentsModule`, `SchoolsModule`).
- **Data Layer**: Prisma ORM with a central `schema.prisma`.
- **Logic Layer**: Controllers handle requests, Services contain business logic, and DTOs define data transfer shapes.
- **Common Layer**:
  - **Guards**: `JwtAuthGuard` (auth), `PermissionsGuard` (RBAC), `CampusGuard` (access control).
  - **Interceptors**: `TransformInterceptor` (unifies response shape), `LoggingInterceptor` (HTTP logging).
  - **Middleware**: `TenantMiddleware` extracts tenant context from headers (e.g., `x-school-id`).

### Frontend (Next.js)
- **App Router**: Uses Next.js 15 App Router features.
- **Route Groups**:
  - `(auth)`: Login and session management.
  - `(dashboard)`: School/Campus admin dashboard.
  - `(platform)`: Super-admin or platform-wide settings.
- **Service Layer**: Centralized `apiClient` in `src/lib/api-client.ts` for type-safe API calls with auto-refresh and tenant headers.
- **Component Layer**: atomic components using Shadcn/ui, composed into modules and pages.

## Multi-Tenancy
- **Tenant Identification**: Primarily via the `x-school-id` header in API requests.
- **Frontend Management**: Tenant/School and Campus IDs are stored in cookies and managed via `SessionContext`.
- **Backend Isolation**: `TenantMiddleware` and `CampusGuard` ensure data is scoped correctly per request.

## Data Flow
1. Frontend `apiClient` fetches data, injecting tenant headers from cookies.
2. Backend `TenantMiddleware` identifies the school.
3. Guards verify the user's session and permissions for that specific school/campus.
4. Services interact with Prisma, filtering by `schoolId` / `campusId`.
5. `TransformInterceptor` wraps the data in a success envelope before sending it back.
