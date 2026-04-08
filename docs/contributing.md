# Contributing

Last verified: 2026-04-08

## Working Rules

- do not merge with failing quality checks
- every bug fix adds or updates a regression test
- any behavior or setup change updates docs in the same PR
- any new `unscopedClient` or raw SQL usage needs a clear justification
- large services should be reviewed for extraction instead of continuous growth

## Before Opening A PR

Run:

```bash
pnpm quality
```

Then confirm:

- docs are updated when setup or behavior changed
- auth, tenant, campus, and permission impact was reviewed
- no accidental unscoped database access was introduced
- no new unsafe raw SQL was added without a strong reason
