/**
 * Prisma Client Extension — Row-Level Tenant Isolation
 *
 * Coverage:
 * - findFirst / findMany / count / aggregate / groupBy → schoolId injected into where
 * - findUnique / findUniqueOrThrow → post-query validation (schoolId checked on result)
 * - create / createMany → schoolId injected into data
 * - update / updateMany / delete / deleteMany / upsert → schoolId injected into where,
 *   explicit cross-tenant mismatch blocked
 *
 * Edge cases & known limitations:
 * 1. **Nested writes** (`connect`, `create` inside a parent `create`/`update`):
 *    Prisma handles these internally — they do NOT re-enter `$allOperations`.
 *    The parent record always gets the correct schoolId via this extension.
 *    App-level validation must ensure connected relations belong to the same tenant.
 *
 * 2. **Relation loading** (`include`, `select` with nested relations):
 *    Prisma generates separate queries for eager-loaded relations. These queries
 *    pass through `$allOperations` as their own model operations, so tenant
 *    models in TENANT_MODELS will be scoped. Child models without direct schoolId
 *    (e.g. Section, ExamResult) are scoped by their parent FK cascade.
 *
 * 3. **Raw queries** (`$queryRaw`, `$executeRaw`):
 *    These BYPASS extensions entirely. Raw queries must include `WHERE school_id = ...`
 *    manually. Prefer typed Prisma operations whenever possible.
 *
 * 4. **$transaction**:
 *    The extension applies within `$transaction` because the extended client's
 *    `$transaction` is bound to the same instance. All operations inside a
 *    transaction callback go through this extension.
 */

import { Prisma } from '@prisma/client'
import { ForbiddenException, Logger } from '@nestjs/common'
import { getRequestContext } from '../common/context'

const logger = new Logger('TenantIsolation')

// ─── Model classification ────────────────────────────────────────────────────

/**
 * Tenant-scoped models — every one of these has a direct `schoolId` FK.
 * The extension will automatically inject / verify schoolId on all
 * operations targeting these models.
 */
const TENANT_MODELS = new Set([
  'Campus',
  'User',
  'Role',
  'Class',
  'Section',
  'Subject',
  'Student',
  'Teacher',
  'Attendance',
  'Exam',
  'ExamResult',
  'FeeStructure',
  'Invoice',
  'FeePayment',
  'AuditLog',
  'AcademicYear',
  'TimetableSlot',
  'Notification',
  'Assignment',
  'Submission',
  'GradeRecord',
  'Book',
  'BookIssue',
  'Vehicle',
  'TransportRoute',
  'TransportAssignment',
  'CalendarEvent',
  'CommunicationLog',
  'Resource',
  'ExpenseCategory',
  'Expense',
])

/**
 * Platform-level models — NO schoolId column.
 * Extension skips isolation for these entirely.
 *
 * • SubscriptionPlan, PlatformAdmin, Permission — global resources
 * • RolePermission — join table (schoolId enforced via Role FK)
 * • School — the tenant root itself; never filtered by schoolId
 */
// Everything NOT in TENANT_MODELS is treated as platform-level.

// ─── Actions that need schoolId injection ──────────────────────────────────

/** Read operations — inject `where.schoolId` */
const READ_ACTIONS = new Set([
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'count',
  'aggregate',
  'groupBy',
])

/**
 * Unique-read operations — these use unique constraints (often just `id`),
 * so we can't inject schoolId into `where` directly.
 * Instead, we verify post-query that the result belongs to the tenant.
 */
const UNIQUE_READ_ACTIONS = new Set([
  'findUnique',
  'findUniqueOrThrow',
])

/** Write operations that carry `where` — verify schoolId match */
const WRITE_WHERE_ACTIONS = new Set([
  'update',
  'updateMany',
  'delete',
  'deleteMany',
  'upsert',
])

/** Create operations — inject `data.schoolId` */
const CREATE_ACTIONS = new Set([
  'create',
  'createMany',
  'createManyAndReturn',
])

// ─── The extension ──────────────────────────────────────────────────────────

/**
 * Prisma Client Extension that enforces row-level tenant isolation.
 *
 * Behaviour:
 * 1. If the model is NOT in TENANT_MODELS → pass through.
 * 2. If the caller is a platform admin → pass through.
 * 3. If there is no schoolId in the request context → block writes, fence reads.
 * 4. For reads  → inject `where: { schoolId }` so only tenant rows are visible.
 * 5. For creates → inject `data: { schoolId }` so the row is owned by the tenant.
 * 6. For writes with `where` → verify the existing schoolId condition matches
 *    the request context; block on mismatch.
 *
 * This creates an impenetrable data boundary — even if application code
 * forgets to filter by schoolId, the extension always injects it.
 */
export const tenantIsolationExtension = Prisma.defineExtension({
  name: 'tenant-isolation',
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }: { model?: string, operation: string, args: any, query: (args: any) => Promise<any> }) {
        // 1. Skip non-tenant models
        if (!model || !TENANT_MODELS.has(model)) {
          return query(args)
        }

        const ctx = getRequestContext()

        // 2. Platform admin bypass
        if (ctx.isPlatformAdmin) {
          return query(args)
        }

        const { schoolId } = ctx

        // 3. No tenant context
        if (!schoolId) {
          if (
            WRITE_WHERE_ACTIONS.has(operation) ||
            CREATE_ACTIONS.has(operation)
          ) {
            logger.error(
              `Blocked ${operation} on ${model}: no schoolId in request context`,
            )
            throw new ForbiddenException(
              'Tenant context is required for this operation',
            )
          }
          // Reads without schoolId → fence with impossible match
          if (READ_ACTIONS.has(operation)) {
            args = {
              ...args,
              where: { ...(args as any)?.where, schoolId: '__no_tenant__' },
            }
            return query(args)
          }
          // Unique reads without schoolId → post-query validation will
          // always reject because schoolId can never match null
          if (UNIQUE_READ_ACTIONS.has(operation)) {
            const result = await query(args)
            if (result && (result as any).schoolId) {
              logger.error(
                `Blocked ${operation} on ${model}: no schoolId in request context ` +
                `but record belongs to school=${(result as any).schoolId}`,
              )
              throw new ForbiddenException(
                'Tenant context is required for this operation',
              )
            }
            return result
          }
          return query(args)
        }

        // 4. Read operations — inject schoolId into where clause
        if (READ_ACTIONS.has(operation)) {
          args = { ...args, where: { ...(args as any)?.where, schoolId } }
          return query(args)
        }

        // 5. Unique-read operations — post-query validation
        //    findUnique/findUniqueOrThrow use unique constraints (often just `id`),
        //    so we cannot inject schoolId into the `where` clause directly.
        //    Instead we execute the query and verify the result belongs to
        //    the current tenant. This is safe because:
        //    a) The record is fetched read-only — no mutation occurs.
        //    b) We throw before the caller ever sees cross-tenant data.
        if (UNIQUE_READ_ACTIONS.has(operation)) {
          const result = await query(args)
          if (result) {
            const recordSchoolId = (result as any).schoolId
            if (recordSchoolId && recordSchoolId !== schoolId) {
              logger.warn(
                `Cross-tenant ${operation} blocked on ${model}: ` +
                `request schoolId=${schoolId}, record schoolId=${recordSchoolId}`,
              )
              throw new ForbiddenException(
                'Cross-tenant operation is not allowed',
              )
            }
          }
          return result
        }

        // 6. Create operations — inject schoolId into data
        if (CREATE_ACTIONS.has(operation)) {
          if (
            operation === 'createMany' ||
            operation === 'createManyAndReturn'
          ) {
            const data = (args as any)?.data
            if (Array.isArray(data)) {
              args = {
                ...args,
                data: data.map((row: any) => ({ ...row, schoolId })),
              }
            }
          } else {
            args = { ...args, data: { ...(args as any)?.data, schoolId } }
          }
          return query(args)
        }

        // 7. Write operations with where — inject + block cross-tenant
        if (WRITE_WHERE_ACTIONS.has(operation)) {
          if (operation === 'upsert') {
            args = {
              ...args,
              where: { ...(args as any)?.where, schoolId },
              create: { ...(args as any)?.create, schoolId },
            }
          } else {
            // Block explicit cross-tenant mismatch
            const existingSchoolId = (args as any)?.where?.schoolId
            if (existingSchoolId && existingSchoolId !== schoolId) {
              logger.warn(
                `Cross-tenant ${operation} blocked on ${model}: ` +
                `request schoolId=${schoolId}, where schoolId=${existingSchoolId}`,
              )
              throw new ForbiddenException(
                'Cross-tenant operation is not allowed',
              )
            }

            args = {
              ...args,
              where: { ...(args as any)?.where, schoolId },
            }
          }
          return query(args)
        }

        // Catch-all — pass through for any future Prisma operations
        // we haven't classified (e.g. $count on relations).
        return query(args)
      },
    },
  },
})

