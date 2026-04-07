# Testing Practices

## Overall Status
- **Current Coverage**: Low. Very few tests found (e.g., `src/modules/exams/findAllExams.spec.ts`).
- **Framework**: Jest.

## Backend (NestJS)
- **Implementation**: Co-located spec files (e.g., `feature.service.spec.ts`).
- **Tooling**: `@nestjs/testing`, `jest`, `ts-jest`.
- **E2E Testing**: `apps/backend/test` directory was not found, but is typically used for end-to-end tests in NestJS.

## Frontend (Next.js)
- **Current Status**: No tests found in `apps/frontend/src`.
- **Recommended Tools**: Vitest or Jest with React Testing Library.

## Challenges
- **Multi-tenancy**: Testing tenant-specific logic (e.g., `TenantMiddleware`) requires mocking headers and database scoping.
- **Prisma**: Database-related tests should use a test database or Prisma mocks.
