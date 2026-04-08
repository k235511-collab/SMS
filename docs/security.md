# Security

Last verified: 2026-04-08

## Active Security Controls

- JWT auth is enforced globally unless a route is marked `@Public()`
- permissions are enforced by `PermissionsGuard`
- campus access is enforced by `CampusGuard`
- Prisma tenant isolation scopes normal model access by school
- public auth endpoints now have explicit throttling at controller level

## Intentional Exceptions

These paths should stay small, reviewed, and documented:

- `unscopedClient` in auth flows to resolve a user before tenant context is finalized
- `unscopedClient` in `CampusGuard` to resolve campus assignment before scoped Prisma access is safe
- unscoped role fallbacks in teacher and parent bootstrap flows
- raw SQL health probe in the health controller
- raw SQL row locking in finance payment recording
- raw SQL bulk plan synchronization in platform plan updates

## Current Risks

- throttling is staged only on public auth endpoints, not the whole API
- cross-tenant bypass points still need a regular audit cadence
- Vercel backend runtime remains sensitive to database TLS/env misconfiguration

## Review Checklist

- Does the change introduce or expand `unscopedClient` usage?
- Does it add raw SQL or unsafe SQL?
- Does it change auth, permissions, campus scoping, or tenant resolution?
- Does it expose a new public route that should be throttled?
- Does it require doc or test updates to keep the security model understandable?
