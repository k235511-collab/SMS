import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PrismaService } from '../../prisma/prisma.service'
import { DiscountType, FeeFrequency } from '@prisma/client'

@Injectable()
export class FinanceCronService {
  private readonly logger = new Logger(FinanceCronService.name)

  constructor(private readonly prisma: PrismaService) { }

  /**
   * Calculate discounted total from a fee amount and student's discount settings.
   * Returns grossAmount, discount fields, and final totalAmount.
   */
  private applyDiscount(
    feeAmount: number,
    discountType?: DiscountType | null,
    discountValue?: number | null,
  ): { grossAmount: number; discountType: DiscountType | null; discountValue: number | null; discountAmount: number; totalAmount: number } {
    if (!discountType || !discountValue || discountValue <= 0) {
      return { grossAmount: feeAmount, discountType: null, discountValue: null, discountAmount: 0, totalAmount: feeAmount }
    }
    if (discountType === 'PERCENTAGE') {
      const disc = Math.round(feeAmount * Math.min(discountValue, 100) / 100)
      return { grossAmount: feeAmount, discountType, discountValue, discountAmount: disc, totalAmount: feeAmount - disc }
    }
    // FIXED
    const disc = Math.min(discountValue, feeAmount)
    return { grossAmount: feeAmount, discountType, discountValue, discountAmount: disc, totalAmount: feeAmount - disc }
  }

  /**
   * Helper to atomically reserve a block of sequential invoice numbers for a school
   */
  private async reserveInvoiceNumbers(schoolId: string, count: number) {
    return this.prisma.$transaction(async (tx) => {
      const school = await tx.school.findUnique({
        where: { id: schoolId },
        select: { code: true, lastInvoiceNo: true },
      })

      // Invoice numbers start from 1, so if lastInvoiceNo is 0, nextStart is 1.
      // If lastInvoiceNo is 5, nextStart is 6.
      const startNo = school?.lastInvoiceNo || 0
      const nextStart = startNo + 1

      await tx.school.update({
        where: { id: schoolId },
        data: { lastInvoiceNo: startNo + count },
      })

      return {
        schoolCode: school?.code || 'SCH',
        nextStart,
      }
    })
  }

  /**
   * Helper to get campus code
   */
  private async getCampusCode(campusId?: string) {
    if (!campusId) return 'NA'
    const campus = await this.prisma.campus.findUnique({
      where: { id: campusId },
      select: { code: true },
    })
    const code = campus?.code || 'NA'
    return code.slice(0, 4).toUpperCase()
  }

  /**
   * Helper to format school code
   */
  private formatSchoolCode(code: string | null) {
    if (!code) return 'SCH'
    return code.slice(0, 4).toUpperCase()
  }

  // ═══════════════════════════════════════════════════════════════
  // OVERDUE DETECTION — runs every day at 1:00 AM
  // Flips UNPAID/PARTIAL invoices to OVERDUE if dueDate < today
  // ═══════════════════════════════════════════════════════════════

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async markOverdueInvoices() {
    this.logger.log('Running overdue invoice detection...')

    const now = new Date()
    now.setHours(0, 0, 0, 0)

    const result = await this.prisma.invoice.updateMany({
      where: {
        status: { in: ['UNPAID', 'PARTIAL'] },
        dueDate: { lt: now },
      },
      data: { status: 'OVERDUE' },
    })

    if (result.count > 0) {
      this.logger.log(`Marked ${result.count} invoices as OVERDUE`)
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // MONTHLY INVOICE GENERATION — runs on the 1st of every month at 2:00 AM
  // Auto-generates invoices for MONTHLY fee structures for all
  // ACTIVE students enrolled in the current academic year
  // ═══════════════════════════════════════════════════════════════

  @Cron('0 2 1 * *') // 1st of every month at 2:00 AM
  async generateMonthlyInvoices() {
    this.logger.log('Skipping monthly invoice generation (manual voucher mode is enabled).')
  }

  // ═══════════════════════════════════════════════════════════════
  // QUARTERLY INVOICE GENERATION — runs on 1st of Jan, Apr, Jul, Oct at 2:30 AM
  // ═══════════════════════════════════════════════════════════════

  @Cron('0 30 2 1 1,4,7,10 *') // 1st of quarter months at 2:30 AM
  async generateQuarterlyInvoices() {
    this.logger.log('Skipping quarterly invoice generation (manual voucher mode is enabled).')
  }

  // ═══════════════════════════════════════════════════════════════
  // SEMI-ANNUAL INVOICE GENERATION — runs on 1st of Jan, Jul at 3:00 AM
  // ═══════════════════════════════════════════════════════════════

  @Cron('0 0 3 1 1,7 *') // 1st of Jan & Jul at 3:00 AM
  async generateSemiAnnualInvoices() {
    this.logger.log('Skipping semi-annual invoice generation (manual voucher mode is enabled).')
  }

  // ═══════════════════════════════════════════════════════════════
  // ANNUAL INVOICE GENERATION — runs on Jan 1st at 3:30 AM
  // ═══════════════════════════════════════════════════════════════

  @Cron('0 30 3 1 1 *') // Jan 1st at 3:30 AM
  async generateAnnualInvoices() {
    this.logger.log('Skipping annual invoice generation (manual voucher mode is enabled).')
  }

  // ───────────────────────────────────────────────────────────────
  // Core recurring invoice generation logic
  // ───────────────────────────────────────────────────────────────

  private async generateRecurringInvoices(frequency: FeeFrequency) {
    // Get all active fee structures of this frequency
    const feeStructures = await this.prisma.feeStructure.findMany({
      where: { isActive: true, frequency },
      include: { school: { select: { id: true } } },
    })

    if (feeStructures.length === 0) {
      this.logger.log(`No active ${frequency} fee structures found`)
      return
    }

    const now = new Date()
    const monthLabel = now.toLocaleString('default', { month: 'long', year: 'numeric' })
    let totalGenerated = 0

    // Group fee structures by school
    const bySchool = new Map<string, typeof feeStructures>()
    for (const fs of feeStructures) {
      const list = bySchool.get(fs.schoolId) || []
      list.push(fs)
      bySchool.set(fs.schoolId, list)
    }

    for (const [schoolId, structures] of bySchool.entries()) {
      // Get currently enrolled active students for this school
      const currentYear = await this.prisma.academicYear.findFirst({
        where: { schoolId, isCurrent: true },
        select: { id: true },
      })

      if (!currentYear) continue

      const enrollments = await this.prisma.studentEnrollment.findMany({
        where: {
          schoolId,
          academicYearId: currentYear.id,
          status: 'ACTIVE',
          student: { deletedAt: null, status: 'ACTIVE' },
        },
        select: {
          studentId: true,
          classId: true,
          discountType: true,
          discountValue: true,
          student: { select: { campusId: true } } as any
        },
      })

      if (enrollments.length === 0) continue

      // Separate school-wide (classId=null) and class-specific fee structures
      const schoolWideFees = structures.filter(fs => !fs.classId)
      const classFees = structures.filter(fs => !!fs.classId)

      // Group class-specific fees by classId
      const classFeeMap = new Map<string, typeof structures>()
      for (const fs of classFees) {
        const list = classFeeMap.get(fs.classId!) || []
        list.push(fs)
        classFeeMap.set(fs.classId!, list)
      }

      // Group enrollments by classId
      const enrollmentsByClass = new Map<string, { studentId: string; campusId: string | null; discountType: DiscountType | null; discountValue: number | null }[]>()
      for (const e of enrollments) {
        const key = (e as any).classId || '__no_class__'
        const list = enrollmentsByClass.get(key) || []
        list.push({
          studentId: (e as any).studentId,
          campusId: (e as any).student?.campusId || null,
          discountType: (e as any).discountType || null,
          discountValue: (e as any).discountValue ?? null,
        })
        enrollmentsByClass.set(key, list)
      }

      // For each class group, determine applicable fee structures
      for (const [classId, studentsInClass] of enrollmentsByClass.entries()) {
        const studentIds = studentsInClass.map(s => s.studentId)
        // Get class-specific fees for this class
        const specificFees = classId !== '__no_class__' ? (classFeeMap.get(classId) || []) : []
        // Names of class-specific fees (to override school-wide defaults)
        const specificNames = new Set(specificFees.map(f => f.name))
        // School-wide fees that are NOT overridden by class-specific ones
        const defaultFees = schoolWideFees.filter(f => !specificNames.has(f.name))
        // Merge: class-specific + non-overridden school-wide
        const applicableFees = [...specificFees, ...defaultFees]

        for (const fs of applicableFees) {
          // Calculate due date
          const dueDay = fs.dueDay || 15
          const dueDate = new Date(now.getFullYear(), now.getMonth(), Math.min(dueDay, 28))
          if (dueDate < now) {
            dueDate.setMonth(dueDate.getMonth() + 1)
          }

          // Check which students already have an invoice for this fee structure in this academic year
          const existingInvoices = await this.prisma.invoice.findMany({
            where: {
              schoolId,
              feeStructureId: fs.id,
              studentId: { in: studentIds },
              academicYearId: currentYear.id,
            },
            select: { studentId: true },
          })

          const alreadyInvoiced = new Set(existingInvoices.map(i => i.studentId))
          const studentsToInvoice = studentsInClass.filter(s => !alreadyInvoiced.has(s.studentId))

          if (studentsToInvoice.length === 0) continue

          // Get sequential numbers for this batch
          const { schoolCode, nextStart } = await this.reserveInvoiceNumbers(schoolId, studentsToInvoice.length)
          const schCode = this.formatSchoolCode(schoolCode)

          // Very simple, concise invoice numbers: [SCHOOL]-[CAMPUS]-[SEQ]
          const invoiceData = await Promise.all(studentsToInvoice.map(async (student, index) => {
            const seq = nextStart + index
            const campusCode = await this.getCampusCode(student.campusId || undefined)
            const { grossAmount, discountAmount, totalAmount } = this.applyDiscount(fs.amount, student.discountType, student.discountValue)
            return {
              invoiceNo: `${schCode}-${campusCode}-${String(seq).padStart(3, '0')}`,
              sequenceNo: seq,
              grossAmount,
              discountType: student.discountType,
              discountValue: student.discountValue,
              discountAmount,
              totalAmount,
              dueDate,
              notes: `Auto-generated ${frequency.toLowerCase()} fee: ${fs.name} — ${monthLabel}`,
              studentId: student.studentId,
              feeStructureId: fs.id,
              schoolId,
              academicYearId: currentYear.id,
            }
          }))

          await this.prisma.invoice.createMany({ data: invoiceData, skipDuplicates: true })
          totalGenerated += invoiceData.length
        }
      }
    }

    this.logger.log(`Generated ${totalGenerated} ${frequency} invoices across ${bySchool.size} school(s)`)
  }

  // ═══════════════════════════════════════════════════════════════
  // AUTO-GENERATE INVOICES FOR A NEWLY ADMITTED STUDENT
  // Called by StudentsService.create() — not a cron job
  // ═══════════════════════════════════════════════════════════════

  async generateInvoicesForNewStudent(studentId: string, schoolId: string, classId?: string) {
    // Get student's campus first so fee rules stay campus-scoped.
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { campusId: true },
    })

    if (!student?.campusId) return { generated: 0 }

    // Get all active fee structures for this school and campus
    const allFeeStructures = await this.prisma.feeStructure.findMany({
      where: { schoolId, campusId: student.campusId, isActive: true },
    })

    if (allFeeStructures.length === 0) return { generated: 0 }

    // Determine applicable fees: class-specific for student's class + school-wide defaults
    const classFees = classId ? allFeeStructures.filter(fs => fs.classId === classId) : []
    const classSpecificNames = new Set(classFees.map(f => f.name))
    const schoolWideFees = allFeeStructures.filter(fs => !fs.classId && !classSpecificNames.has(fs.name))
    const feeStructures = [...classFees, ...schoolWideFees]

    if (feeStructures.length === 0) return { generated: 0 }

    const now = new Date()
    const monthLabel = now.toLocaleString('default', { month: 'long', year: 'numeric' })
    const invoiceData: any[] = []

    // Look up the student's current enrollment for discount info
    const currentYear = await this.prisma.academicYear.findFirst({
      where: { schoolId, isCurrent: true },
      select: { id: true },
    })
    let enrollmentDiscount: { discountType: DiscountType | null; discountValue: number | null } = { discountType: null, discountValue: null }
    if (currentYear) {
      const enrollment = await this.prisma.studentEnrollment.findUnique({
        where: { studentId_academicYearId: { studentId, academicYearId: currentYear.id } },
        select: { discountType: true, discountValue: true },
      })
      if (enrollment) {
        enrollmentDiscount = { discountType: enrollment.discountType, discountValue: enrollment.discountValue }
      }
    }

    for (const fs of feeStructures) {
      // For ONE_TIME fees, always generate
      // For recurring fees, generate the first invoice now
      const dueDay = fs.dueDay || 15
      const dueDate = new Date(now.getFullYear(), now.getMonth(), Math.min(dueDay, 28))
      if (dueDate < now) {
        dueDate.setMonth(dueDate.getMonth() + 1)
      }

      // Check if this student already has an invoice for this fee structure in this academic year
      const existing = currentYear ? await this.prisma.invoice.findFirst({
        where: {
          studentId,
          feeStructureId: fs.id,
          academicYearId: currentYear.id,
        },
      }) : null

      if (existing) continue

      // For auto-billing, we still need a sequence.
      // This is less efficient (one transaction per student) but safer for consistency.
      const { schoolCode, nextStart } = await this.reserveInvoiceNumbers(schoolId, 1)
      const schCode = this.formatSchoolCode(schoolCode)
      const campusCode = await this.getCampusCode((student as any)?.campusId || undefined)

      const disc = this.applyDiscount(fs.amount, enrollmentDiscount.discountType, enrollmentDiscount.discountValue)

      invoiceData.push({
        invoiceNo: `${schCode}-${campusCode}-${String(nextStart).padStart(3, '0')}`,
        sequenceNo: nextStart,
        grossAmount: disc.grossAmount,
        discountType: disc.discountType,
        discountValue: disc.discountValue,
        discountAmount: disc.discountAmount,
        totalAmount: disc.totalAmount,
        dueDate,
        schoolId,
        studentId,
        feeStructureId: fs.id,
        academicYearId: currentYear?.id ?? null,
        notes: fs.frequency === 'ONE_TIME'
          ? `Admission fee: ${fs.name}`
          : `Auto-generated ${fs.frequency.toLowerCase()} fee: ${fs.name} — ${monthLabel}`,
      })
    }

    if (invoiceData.length > 0) {
      await this.prisma.invoice.createMany({ data: invoiceData, skipDuplicates: true })
    }

    return { generated: invoiceData.length }
  }

  // ═══════════════════════════════════════════════════════════════
  // PREVIEW BATCH INVOICES (read-only)
  // Returns student list with fee/discount/outstanding info
  // ═══════════════════════════════════════════════════════════════

  async previewBatchInvoices(schoolId: string, opts: {
    feeStructureId: string
    classId?: string
    academicYearId?: string
    campusId?: string
  }) {
    const structureWhere: any = { id: opts.feeStructureId, schoolId }
    if (opts.campusId) {
      structureWhere.campusId = opts.campusId
    }
    const feeStructure = await this.prisma.feeStructure.findFirst({ where: structureWhere })
    if (!feeStructure) throw new Error('Fee structure not found')

    let yearId = opts.academicYearId
    if (!yearId) {
      const currentYear = await this.prisma.academicYear.findFirst({
        where: { schoolId, isCurrent: true },
        select: { id: true },
      })
      yearId = currentYear?.id
    }
    if (!yearId) throw new Error('No current academic year found')

    const effectiveClassId = opts.classId || feeStructure.classId || undefined

    const enrollmentWhere: any = {
      schoolId,
      academicYearId: yearId,
      status: 'ACTIVE',
      student: { deletedAt: null, status: 'ACTIVE' },
    }
    if (effectiveClassId) enrollmentWhere.classId = effectiveClassId
    if (opts.campusId) {
      enrollmentWhere.OR = [
        { class: { campusId: opts.campusId } },
      ]
    }

    const enrollments = await this.prisma.studentEnrollment.findMany({
      where: enrollmentWhere,
      select: {
        studentId: true,
        discountType: true,
        discountValue: true,
        student: {
          select: {
            id: true, firstName: true, lastName: true, rollNumber: true,
            class: { select: { name: true } },
            section: { select: { name: true } },
          },
        },
      },
    })

    if (enrollments.length === 0) return []

    const studentIds = enrollments.map(e => e.studentId)

    // Check billing period
    const now = new Date()
    const dueDay = feeStructure.dueDay || 15
    const dueDate = new Date(now.getFullYear(), now.getMonth(), Math.min(dueDay, 28))

    // Already invoiced check — by academic year
    const existingInvoices = await this.prisma.invoice.findMany({
      where: {
        schoolId,
        feeStructureId: opts.feeStructureId,
        studentId: { in: studentIds },
        academicYearId: yearId,
      },
      select: { studentId: true },
    })
    const alreadyInvoiced = new Set(existingInvoices.map(i => i.studentId))

    // Outstanding balance per student (sum of unpaid invoice amounts)
    const outstandingInvoices = await this.prisma.invoice.groupBy({
      by: ['studentId'],
      where: {
        schoolId,
        studentId: { in: studentIds },
        status: { in: ['UNPAID', 'PARTIAL', 'OVERDUE'] },
      },
      _sum: { totalAmount: true, paidAmount: true },
    })
    const outstandingMap = new Map<string, number>()
    for (const o of outstandingInvoices) {
      outstandingMap.set(o.studentId, (o._sum.totalAmount || 0) - (o._sum.paidAmount || 0))
    }

    return enrollments.map(e => {
      const disc = this.applyDiscount(feeStructure.amount, e.discountType, e.discountValue)
      return {
        studentId: e.studentId,
        firstName: e.student.firstName,
        lastName: e.student.lastName,
        rollNumber: e.student.rollNumber,
        className: e.student.class?.name || null,
        sectionName: e.student.section?.name || null,
        discountType: e.discountType || null,
        discountValue: e.discountValue || null,
        grossAmount: disc.grossAmount,
        discountAmount: disc.discountAmount,
        netAmount: disc.totalAmount,
        outstandingBalance: outstandingMap.get(e.studentId) || 0,
        alreadyInvoiced: alreadyInvoiced.has(e.studentId),
      }
    })
  }

  // ═══════════════════════════════════════════════════════════════
  // BATCH GENERATE INVOICES FOR A CLASS OR ALL STUDENTS
  // Called via controller endpoint
  // ═══════════════════════════════════════════════════════════════

  async batchGenerateInvoices(schoolId: string, opts: {
    feeStructureId: string
    classId?: string
    academicYearId?: string
    dueDate?: string
    campusId?: string
    studentId?: string
    studentIds?: string[]
    applyDiscounts?: boolean
  }) {
    const shouldApplyDiscounts = opts.applyDiscounts !== false
    // Validate fee structure
    const structureWhere: any = { id: opts.feeStructureId, schoolId }
    if (opts.campusId) {
      structureWhere.campusId = opts.campusId
    }
    const feeStructure = await this.prisma.feeStructure.findFirst({
      where: structureWhere,
    })
    if (!feeStructure) {
      throw new Error('Fee structure not found')
    }

    // Get target academic year context
    const targetYear = opts.academicYearId
      ? await this.prisma.academicYear.findFirst({
        where: { id: opts.academicYearId, schoolId },
        select: { id: true, startDate: true, endDate: true },
      })
      : await this.prisma.academicYear.findFirst({
        where: { schoolId, isCurrent: true },
        select: { id: true, startDate: true, endDate: true },
      })

    const yearId = targetYear?.id

    if (!yearId || !targetYear) {
      throw new Error('No current academic year found')
    }

    const effectiveClassId = opts.classId || feeStructure.classId || undefined

    if (opts.classId && feeStructure.classId && opts.classId !== feeStructure.classId) {
      throw new Error('Selected class does not match this fee structure class')
    }

    // Get enrolled students
    const enrollmentWhere: any = {
      schoolId,
      academicYearId: yearId,
      status: 'ACTIVE',
      student: { deletedAt: null, status: 'ACTIVE' },
    }
    if (effectiveClassId) {
      enrollmentWhere.classId = effectiveClassId
    }
    if (opts.studentIds && opts.studentIds.length > 0) {
      enrollmentWhere.studentId = { in: opts.studentIds }
    } else if (opts.studentId) {
      enrollmentWhere.studentId = opts.studentId
    }
    if (opts.campusId) {
      enrollmentWhere.OR = [
        { class: { campusId: opts.campusId } },
      ]
    }

    const enrollments = await this.prisma.studentEnrollment.findMany({
      where: enrollmentWhere,
      select: { studentId: true, discountType: true, discountValue: true },
    })

    const studentIds = enrollments.map(e => e.studentId)

    // Build a discount lookup per student
    const discountMap = new Map<string, { discountType: DiscountType | null; discountValue: number | null }>()
    for (const e of enrollments) {
      discountMap.set(e.studentId, { discountType: e.discountType, discountValue: e.discountValue })
    }
    if (studentIds.length === 0) {
      return { generated: 0, skipped: 0, total: 0 }
    }

    // Calculate due date
    const now = new Date()
    const dueDay = feeStructure.dueDay || 15
    const yearStart = new Date(targetYear.startDate)
    const yearEnd = new Date(targetYear.endDate)
    yearStart.setHours(0, 0, 0, 0)
    yearEnd.setHours(23, 59, 59, 999)

    const monthAnchor = now < yearStart ? yearStart : now > yearEnd ? yearEnd : now

    const dueDate = opts.dueDate
      ? new Date(opts.dueDate)
      : new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), Math.min(dueDay, 28))

    if (!Number.isFinite(dueDate.getTime())) {
      throw new Error('Invalid due date')
    }

    if (opts.dueDate) {
      if (dueDate < yearStart || dueDate > yearEnd) {
        throw new Error(`Custom due date must be within the selected academic year (${yearStart.toLocaleDateString()} - ${yearEnd.toLocaleDateString()})`)
      }
    }

    if (!opts.dueDate && now >= yearStart && now <= yearEnd && dueDate < now) {
      dueDate.setMonth(dueDate.getMonth() + 1)
    }

    if (!opts.dueDate && dueDate < yearStart) {
      dueDate.setTime(new Date(yearStart.getFullYear(), yearStart.getMonth(), Math.min(dueDay, 28)).getTime())
    }

    if (!opts.dueDate && dueDate > yearEnd) {
      dueDate.setTime(new Date(yearEnd.getFullYear(), yearEnd.getMonth(), Math.min(dueDay, 28)).getTime())
    }

    // Check existing invoices by academic year
    const existingInvoices = await this.prisma.invoice.findMany({
      where: {
        schoolId,
        feeStructureId: opts.feeStructureId,
        studentId: { in: studentIds },
        academicYearId: yearId,
      },
      select: { studentId: true, status: true },
    })

    this.logger.debug(`[Finance] Found ${existingInvoices.length} existing invoices for academic year ${yearId}`)

    const alreadyInvoiced = new Set(existingInvoices.map(i => i.studentId))
    const studentsToInvoice = studentIds.filter(id => !alreadyInvoiced.has(id))

    if (studentsToInvoice.length === 0) {
      return { generated: 0, skipped: studentIds.length, total: studentIds.length }
    }

    const monthLabel = dueDate.toLocaleString('default', { month: 'long', year: 'numeric' })

    // Get sequential numbers for this batch
    const { schoolCode, nextStart } = await this.reserveInvoiceNumbers(schoolId, studentsToInvoice.length)
    const schCode = this.formatSchoolCode(schoolCode)
    const campusCode = await this.getCampusCode(opts.campusId)

    const invoiceData = studentsToInvoice.map((studentId, index) => {
      const seq = nextStart + index
      const stuDiscount = discountMap.get(studentId)
      const disc = shouldApplyDiscounts
        ? this.applyDiscount(feeStructure.amount, stuDiscount?.discountType ?? null, stuDiscount?.discountValue ?? null)
        : this.applyDiscount(feeStructure.amount, null, null)
      return {
        invoiceNo: `${schCode}-${campusCode}-${String(seq).padStart(3, '0')}`,
        sequenceNo: seq,
        grossAmount: disc.grossAmount,
        discountType: disc.discountType,
        discountValue: disc.discountValue,
        discountAmount: disc.discountAmount,
        totalAmount: disc.totalAmount,
        dueDate,
        schoolId,
        studentId,
        feeStructureId: feeStructure.id,
        academicYearId: yearId,
        notes: `Batch generated: ${feeStructure.name} — ${monthLabel}`,
      }
    })

    await this.prisma.invoice.createMany({ data: invoiceData, skipDuplicates: true })

    return {
      generated: invoiceData.length,
      skipped: alreadyInvoiced.size,
      total: studentIds.length,
    }
  }
}
