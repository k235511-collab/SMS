export interface DatabaseUrlValidationResult {
  warnings: string[]
}

function safeParseUrl(value?: string): URL | null {
  if (!value) return null

  try {
    return new URL(value)
  } catch {
    return null
  }
}

function isSupabasePooler(url: URL | null): boolean {
  return url?.hostname.includes('pooler.supabase.com') ?? false
}

function isSupabaseTransactionPooler(url: URL | null): boolean {
  return isSupabasePooler(url) && url?.port === '6543'
}

function isSupabaseSessionPooler(url: URL | null): boolean {
  return isSupabasePooler(url) && (url?.port === '5432' || url?.port === '')
}

export function validateDatabaseUrlsForServerless(
  databaseUrl?: string,
  directDatabaseUrl?: string,
): DatabaseUrlValidationResult {
  const warnings: string[] = []
  const database = safeParseUrl(databaseUrl)
  const direct = safeParseUrl(directDatabaseUrl)

  if (!databaseUrl) {
    warnings.push('DATABASE_URL is missing.')
    return { warnings }
  }

  if (!database) {
    warnings.push('DATABASE_URL is not a valid URL.')
    return { warnings }
  }

  if (!directDatabaseUrl) {
    warnings.push(
      'DIRECT_DATABASE_URL is missing. Prisma migrations and direct connections should use the direct database host.',
    )
  } else if (!direct) {
    warnings.push('DIRECT_DATABASE_URL is not a valid URL.')
  }

  if (isSupabaseTransactionPooler(database)) {
    if (database.searchParams.get('pgbouncer') !== 'true') {
      warnings.push(
        'Supabase transaction pooler URLs on port 6543 should include pgbouncer=true for Prisma serverless usage.',
      )
    }
  }

  if (isSupabaseSessionPooler(database)) {
    warnings.push(
      'Supabase session pooler URLs on port 5432 are not the recommended serverless connection for Vercel. Prefer the transaction pooler on port 6543 for DATABASE_URL.',
    )
  }

  if (
    databaseUrl &&
    directDatabaseUrl &&
    databaseUrl === directDatabaseUrl &&
    isSupabasePooler(database)
  ) {
    warnings.push(
      'DATABASE_URL and DIRECT_DATABASE_URL should not be identical when using a Supabase pooler. Use the pooler for DATABASE_URL and the direct database host for DIRECT_DATABASE_URL.',
    )
  }

  if (direct && isSupabasePooler(direct)) {
    warnings.push(
      'DIRECT_DATABASE_URL should point to the direct database host, not a Supabase pooler URL.',
    )
  }

  return { warnings }
}
