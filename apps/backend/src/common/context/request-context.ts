import { AsyncLocalStorage } from 'async_hooks'

/**
 * Per-request context carried through the entire call stack
 * via Node.js AsyncLocalStorage — no DI scope overhead.
 */
export interface RequestContext {
  /** Current tenant (null for platform-admin or unauthenticated) */
  schoolId: string | null
  /** Current authenticated user ID */
  userId: string | null
  /** Current active campus ID */
  campusId: string | null
  /** User's role slug */
  role: string | null
  /** Platform admins bypass tenant isolation entirely */
  isPlatformAdmin: boolean
  /** Teacher ID (null when user is not a teacher) */
  teacherId: string | null
}

/**
 * Global AsyncLocalStorage instance.
 * Created once, shared across all modules.
 */
export const requestContext = new AsyncLocalStorage<RequestContext>()

/**
 * Safe accessor — returns current context or a restrictive default.
 * The default blocks access to all tenants (null schoolId) and
 * is not a platform admin — ensuring fail-closed behaviour.
 */
export function getRequestContext(): RequestContext {
  return requestContext.getStore() ?? {
    schoolId: null,
    userId: null,
    campusId: null,
    role: null,
    isPlatformAdmin: false,
    teacherId: null,
  }
}
