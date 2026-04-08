import { validateDatabaseUrlsForServerless } from './database-url.utils'

describe('validateDatabaseUrlsForServerless', () => {
  it('warns when a Supabase transaction pooler URL is missing pgbouncer=true', () => {
    const result = validateDatabaseUrlsForServerless(
      'postgresql://user:pass@aws-0-us-east-1.pooler.supabase.com:6543/postgres',
      'postgresql://user:pass@db.project.supabase.co:5432/postgres',
    )

    expect(result.warnings).toContain(
      'Supabase transaction pooler URLs on port 6543 should include pgbouncer=true for Prisma serverless usage.',
    )
  })

  it('warns when the session pooler is used for serverless traffic', () => {
    const result = validateDatabaseUrlsForServerless(
      'postgresql://user:pass@aws-0-us-east-1.pooler.supabase.com:5432/postgres',
      'postgresql://user:pass@db.project.supabase.co:5432/postgres',
    )

    expect(result.warnings).toContain(
      'Supabase session pooler URLs on port 5432 are not the recommended serverless connection for Vercel. Prefer the transaction pooler on port 6543 for DATABASE_URL.',
    )
  })

  it('warns when direct and pooled URLs are incorrectly identical', () => {
    const pooledUrl =
      'postgresql://user:pass@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true'
    const result = validateDatabaseUrlsForServerless(pooledUrl, pooledUrl)

    expect(result.warnings).toContain(
      'DATABASE_URL and DIRECT_DATABASE_URL should not be identical when using a Supabase pooler. Use the pooler for DATABASE_URL and the direct database host for DIRECT_DATABASE_URL.',
    )
  })

  it('returns no warnings for the recommended Supabase split', () => {
    const result = validateDatabaseUrlsForServerless(
      'postgresql://user:pass@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true',
      'postgresql://user:pass@db.project.supabase.co:5432/postgres',
    )

    expect(result.warnings).toEqual([])
  })
})
