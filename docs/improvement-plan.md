# SMS SaaS Improvement Plan

This is the working plan for strengthening the repo in six phases:

- baseline and stabilization
- verification and test recovery
- documentation refresh
- security hardening
- service decomposition
- process guardrails

## Goals

- make the repo safer to change
- align docs with the running system
- restore and verify key security controls
- reduce complexity in oversized backend services
- keep quality from drifting again

## Phase Summary

### Phase 1

- baseline validation commands
- fix currently broken tests
- document current risks in `docs/quality-baseline.md`

### Phase 2

- add regression tests for auth, guards, tenant isolation, exams, and finance
- make quality checks repeatable locally and in CI

### Phase 3

- refresh README
- add architecture, development, testing, and security docs

### Phase 4

- re-enable throttling safely
- document intentional unscoped and raw SQL paths
- add security-focused regression coverage

### Phase 5

- split oversized services one responsibility at a time
- keep controller contracts stable during extraction

### Phase 6

- add PR checklist and contribution expectations
- keep merge-blocking quality checks in place
