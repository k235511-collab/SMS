import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { tenantIsolationExtension } from './tenant-isolation.middleware'

/**
 * Extended Prisma client with tenant isolation baked in.
 *
 * `$extends` returns a new client type, so we keep a reference to the
 * extended instance and delegate lifecycle methods to it.
 */
function createExtendedClient() {
  const base = new PrismaClient()
  return base.$extends(tenantIsolationExtension)
}

type ExtendedPrismaClient = ReturnType<typeof createExtendedClient>

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly client: ExtendedPrismaClient

  /**
   * Raw (unextended) PrismaClient — bypasses tenant isolation entirely.
   * Use ONLY for cross-tenant queries like school switching, where you
   * intentionally need to query across multiple schools.
   *
   * ⚠️ NEVER use for normal CRUD — use the model delegates (this.user, etc.)
   */
  public readonly unscopedClient: PrismaClient

  constructor() {
    this.client = createExtendedClient()
    this.unscopedClient = new PrismaClient()
  }

  async onModuleInit() {
    await this.client.$connect()
    await this.unscopedClient.$connect()
  }

  async onModuleDestroy() {
    await this.client.$disconnect()
    await this.unscopedClient.$disconnect()
  }

  // ─── Expose every model delegate via getters ──────────────────────

  get subscriptionPlan() { return this.client.subscriptionPlan }
  get platformAdmin() { return this.client.platformAdmin }
  get schoolRegistration() { return this.client.schoolRegistration }
  get school() { return this.client.school }
  get campus() { return this.client.campus }
  get user() { return this.client.user }
  get role() { return this.client.role }
  get permission() { return this.client.permission }
  get rolePermission() { return this.client.rolePermission }
  get class() { return this.client.class }
  get section() { return this.client.section }
  get subject() { return this.client.subject }
  get student() { return this.client.student }
  get studentEnrollment() { return this.client.studentEnrollment }
  get parentStudent() { return this.client.parentStudent }
  get studentDocument() { return this.client.studentDocument }
  get teacher() { return this.client.teacher }
  get attendance() { return this.client.attendance }
  get exam() { return this.client.exam }
  get examTeacher() { return this.client.examTeacher }
  get examResult() { return this.client.examResult }
  get examPaper() { return this.client.examPaper }
  get examSection() { return this.client.examSection }
  get examQuestion() { return this.client.examQuestion }
  get questionOption() { return this.client.questionOption }
  get feeStructure() { return this.client.feeStructure }
  get invoice() { return this.client.invoice }
  get feePayment() { return this.client.feePayment }
  get auditLog() { return this.client.auditLog }
  get academicYear() { return this.client.academicYear }
  get timetableSlot() { return this.client.timetableSlot }
  get periodTemplate() { return this.client.periodTemplate }
  get notification() { return this.client.notification }
  get loginHistory() { return this.client.loginHistory }
  get platformSetting() { return this.client.platformSetting }
  get assignment() { return this.client.assignment }
  get submission() { return this.client.submission }
  get gradeRecord() { return this.client.gradeRecord }
  get book() { return this.client.book }
  get bookIssue() { return this.client.bookIssue }
  get vehicle() { return this.client.vehicle }
  get transportRoute() { return this.client.transportRoute }
  get transportAssignment() { return this.client.transportAssignment }
  get calendarEvent() { return this.client.calendarEvent }
  get communicationLog() { return this.client.communicationLog }
  get resource() { return this.client.resource }
  get reportCardTemplate() { return this.client.reportCardTemplate }
  get featureFlag() { return this.client.featureFlag }
  get expenseCategory() { return this.client.expenseCategory }
  get expense() { return this.client.expense }
  get gradingScale() { return this.client.gradingScale }
  get teacherClassAssignment() { return this.client.teacherClassAssignment }

  // ─── Prisma utilities ─────────────────────────────────────────────

  get $transaction() { return this.client.$transaction.bind(this.client) }
  get $queryRaw() { return this.client.$queryRaw.bind(this.client) }
  get $executeRaw() { return this.client.$executeRaw.bind(this.client) }
  get $queryRawUnsafe() { return this.client.$queryRawUnsafe.bind(this.client) }
  get $executeRawUnsafe() { return this.client.$executeRawUnsafe.bind(this.client) }
}
