# Technical Debt and Concerns

## Identified Concerns

### 1. Test Coverage
- **Issue**: Very low test coverage across the entire project. There is only one identifiable spec file in the backend feature modules.
- **Impact**: High risk of regressions during refactoring or new feature implementation.

### 2. Large Schema File
- **Issue**: `apps/backend/prisma/schema.prisma` is over 1,400 lines long and contains many models.
- **Impact**: Difficult to maintain and review. Consider Prisma's multi-file schema feature if supported by the version.

### 3. Debug Statements
- **Issue**: Numerous `console.log("[DEBUG] ...")` and `console.warn` statements remaining in production-like contexts (e.g., `session-context.tsx`).
- **Impact**: Noise in production logs and potential performance impacts if logs are large.

### 4. Fragmented Configuration
- **Issue**: Configuration is spread between root and app-specific directories, with many one-off scripts (e.g., `check-storage.js`, `debug-db.ts`) in the backend root.
- **Impact**: Cleanliness of the codebase and potential confusion for new developers.

### 5. Deployment Complexity
- **Issue**: Custom webpack configurations and deployment scripts (e.g., `webpack.vercel.config.js`) might be fragile.
- **Impact**: Maintenance overhead for CI/CD pipelines.

## Critical Missing Pieces
- **E2E Tests**: Absolutely no end-to-end testing found.
- **Performance Benchmarking**: For a SaaS application, database query performance with many tenants needs monitoring.
