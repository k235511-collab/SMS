# Coding Conventions

## General
- **Language**: Strict TypeScript with focused types.
- **Naming**: `camelCase` for variables/functions, `PascalCase` for classes/components, `kebab-case` for file names (mostly).
- **Project Style**: Monorepo using workspace-based dependency management.

## Backend (NestJS)
- **Modularization**: Every feature belongs to a module with its own controller, service, and DTOs.
- **Dependency Injection**: Heavy use of NestJS DI.
- **Error Handling**: Using `GlobalExceptionFilter` to provide unified error responses.
- **Validation**: Strict use of `class-validator` decorators in DTOs.
- **Async Pattern**: Standard use of `async`/`await` and `Observable` (where appropriate for NestJS filters/interceptors).
- **Response Shape**: All responses are wrapped in a `{ success, data, timestamp }` envelope via `TransformInterceptor`.

## Frontend (Next.js/React)
- **Component Pattern**: Composition over inheritance. Small, focused components using Shadcn/ui.
- **State Management**: React Context for global state (Auth, Session), local state for forms.
- **API Interaction**: Centralized `apiClient` in `src/lib/api-client.ts`. Use of `.get()`, `.post()`, etc. wrappers.
- **Typing**: Direct usage of types from `@sms-saas/shared-types`.
- **UI Logic**: Logic-heavy pages often use custom hooks and module-specific services.

## Styles
- **Tailwind CSS**: Core styling engine. Custom theme extensions in `tailwind.config.js`.
- **CSS Variables**: Used for theming (light/dark mode).
