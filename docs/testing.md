# Testing

Last verified: 2026-04-08

## Current Test Strategy

The repo is still early in recovery, so the immediate goal is critical-path confidence rather than broad coverage.

Current focus areas:

- exams teacher-scoping behavior
- campus guard enforcement
- permissions guard enforcement
- finance helper logic for discount and payment state calculations

## Commands

Run the backend suite:

```bash
pnpm quality:backend:test
```

Run the full baseline suite:

```bash
pnpm quality
```

## Expectations For New Changes

- every bug fix should include a regression test
- auth, permission, tenant, and campus behavior should be covered before merging
- finance mutations should be protected with tests before refactors
- large refactors should freeze current behavior with tests first

## Gaps Still To Close

- broader `AuthService` coverage
- tenant-isolation integration tests
- finance mutation integration tests
- e2e coverage for login, refresh, and school switching
