import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name)

  constructor(private readonly prisma: PrismaService) {}

  async getCampusConfig(schoolId: string, campusId?: string) {
    if (!campusId) return null
    const prismaAny = this.prisma as any
    return prismaAny.whatsAppCampusConfig.findFirst({
      where: { schoolId, campusId },
    })
  }

  async upsertCampusConfig(
    schoolId: string,
    campusId: string,
    dto: {
      providerMode?: 'CENTRAL_WABA' | 'OWN_WABA'
      businessAccountId?: string
      appId?: string
      phoneNumberId?: string
      whatsappNumber?: string
      displayName?: string
      accessToken?: string
      webhookVerifyToken?: string
      isVerified?: boolean
      isActive?: boolean
    },
  ) {
    const prismaAny = this.prisma as any
    return prismaAny.whatsAppCampusConfig.upsert({
      where: { campusId },
      update: {
        providerMode: dto.providerMode,
        businessAccountId: dto.businessAccountId,
        appId: dto.appId,
        phoneNumberId: dto.phoneNumberId,
        whatsappNumber: dto.whatsappNumber,
        displayName: dto.displayName,
        accessToken: dto.accessToken,
        webhookVerifyToken: dto.webhookVerifyToken,
        isVerified: dto.isVerified,
        isActive: dto.isActive,
        verifiedAt: dto.isVerified ? new Date() : undefined,
      },
      create: {
        schoolId,
        campusId,
        providerMode: dto.providerMode ?? 'CENTRAL_WABA',
        businessAccountId: dto.businessAccountId,
        appId: dto.appId,
        phoneNumberId: dto.phoneNumberId,
        whatsappNumber: dto.whatsappNumber,
        displayName: dto.displayName,
        accessToken: dto.accessToken,
        webhookVerifyToken: dto.webhookVerifyToken,
        isVerified: dto.isVerified ?? false,
        isActive: dto.isActive ?? false,
        verifiedAt: dto.isVerified ? new Date() : undefined,
        lastResetDate: new Date(),
      },
    })
  }

  async getTriggerRules(schoolId: string, campusId?: string) {
    const where: any = { schoolId }
    if (campusId) where.campusId = campusId
    const prismaAny = this.prisma as any
    return prismaAny.whatsAppTriggerRule.findMany({
      where,
      orderBy: { triggerType: 'asc' },
    })
  }

  async upsertTriggerRule(
    schoolId: string,
    campusId: string,
    dto: {
      triggerType: 'ABSENT' | 'FEE_DEFAULTER' | 'ANNOUNCEMENT'
      isEnabled?: boolean
      templateName?: string
      cooldownHours?: number
      minOutstandingAmount?: number
      minOverdueDays?: number
      metadata?: Record<string, unknown>
    },
  ) {
    const prismaAny = this.prisma as any
    return prismaAny.whatsAppTriggerRule.upsert({
      where: {
        schoolId_campusId_triggerType: {
          schoolId,
          campusId,
          triggerType: dto.triggerType,
        },
      },
      update: {
        isEnabled: dto.isEnabled,
        templateName: dto.templateName,
        cooldownHours: dto.cooldownHours,
        minOutstandingAmount: dto.minOutstandingAmount,
        minOverdueDays: dto.minOverdueDays,
        metadata: dto.metadata as any,
      },
      create: {
        schoolId,
        campusId,
        triggerType: dto.triggerType,
        isEnabled: dto.isEnabled ?? true,
        templateName: dto.templateName,
        cooldownHours: dto.cooldownHours ?? 0,
        minOutstandingAmount: dto.minOutstandingAmount,
        minOverdueDays: dto.minOverdueDays,
        metadata: dto.metadata as any,
      },
    })
  }

  async send(
    schoolId: string,
    dto: { to: string; message: string; templateId?: string },
    senderId?: string,
    campusId?: string,
  ) {
    if (!campusId) {
      throw new BadRequestException('Campus is required for WhatsApp sending')
    }
    const config = await this.getCampusConfig(schoolId, campusId)
    if (!config || !config.isActive || !config.isVerified || !config.phoneNumberId) {
      throw new BadRequestException('WhatsApp is not configured/active for this campus')
    }

    this.logger.log(`Sending WhatsApp to ${dto.to}: ${dto.message}`)

    try {
      // Mock WhatsApp sending
      this.logger.log(`[MOCK] WhatsApp sent successfully to ${dto.to} via campus ${campusId}`)

      const log = await this.prisma.communicationLog.create({
        data: {
          channel: 'WHATSAPP',
          recipient: dto.to,
          message: dto.message,
          status: 'SENT',
          schoolId,
          senderId,
          campusId: campusId || undefined,
          metadata: {
            provider: 'mock',
            templateId: dto.templateId,
            phoneNumberId: config.phoneNumberId,
            providerMode: config.providerMode,
          },
        },
      })
      const prismaAny = this.prisma as any
      await prismaAny.whatsAppCampusConfig.update({
        where: { campusId },
        data: { messagesSentThisMonth: { increment: 1 } },
      })
      return { success: true, logId: log.id }
    } catch (error: any) {
      this.logger.error(`Failed to send WhatsApp: ${error.message}`)
      await this.prisma.communicationLog.create({
        data: {
          channel: 'WHATSAPP',
          recipient: dto.to,
          message: dto.message,
          status: 'FAILED',
          metadata: { error: error.message },
          schoolId,
          senderId,
          campusId: campusId || undefined,
        },
      })
      return { success: false, error: error.message }
    }
  }

  async sendAnnouncementToCampus(
    schoolId: string,
    campusId: string,
    dto: { message: string; title?: string; studentIds?: string[] },
    senderId?: string,
  ) {
    const prismaAny = this.prisma as any
    const trigger = await prismaAny.whatsAppTriggerRule.findUnique({
      where: {
        schoolId_campusId_triggerType: {
          schoolId,
          campusId,
          triggerType: 'ANNOUNCEMENT',
        },
      },
    })
    if (trigger && !trigger.isEnabled) {
      return { success: true, sent: 0, skipped: 0, reason: 'Announcement trigger is disabled' }
    }

    const students = await this.prisma.student.findMany({
      where: {
        schoolId,
        campusId,
        deletedAt: null,
        ...(dto.studentIds?.length ? { id: { in: dto.studentIds } } : {}),
      },
      select: { id: true, firstName: true, lastName: true, guardianPhone: true },
    })

    let sent = 0
    let skipped = 0
    for (const student of students) {
      if (!student.guardianPhone) {
        skipped++
        continue
      }
      await this.send(
        schoolId,
        {
          to: student.guardianPhone,
          templateId: trigger?.templateName || 'school_announcement',
          message: `${dto.title ? `${dto.title}: ` : ''}${dto.message}`,
        },
        senderId,
        campusId,
      )
      sent++
    }
    return { success: true, sent, skipped }
  }

  async processAbsentTriggers(
    schoolId: string,
    campusId: string | undefined,
    records: Array<{ studentId: string; status: string }>,
    date: string,
  ) {
    if (!campusId) return
    const absentStudentIds = records
      .filter((r) => String(r.status).toUpperCase() === 'ABSENT')
      .map((r) => r.studentId)
    if (absentStudentIds.length === 0) return

    const prismaAny = this.prisma as any
    const trigger = await prismaAny.whatsAppTriggerRule.findUnique({
      where: {
        schoolId_campusId_triggerType: {
          schoolId,
          campusId,
          triggerType: 'ABSENT',
        },
      },
    })
    if (trigger && !trigger.isEnabled) return

    const students = await this.prisma.student.findMany({
      where: { schoolId, campusId, id: { in: absentStudentIds } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        guardianPhone: true,
        class: { select: { name: true } },
      },
    })

    for (const student of students) {
      if (!student.guardianPhone) continue
      await this.send(
        schoolId,
        {
          to: student.guardianPhone,
          templateId: trigger?.templateName || 'attendance_alert',
          message: `${student.firstName} ${student.lastName} was marked absent on ${date}${student.class?.name ? ` (${student.class.name})` : ''}.`,
        },
        undefined,
        campusId,
      )
    }
  }

  async processFeeDefaulterTriggers(schoolId: string) {
    const prismaAny = this.prisma as any
    const rules = await prismaAny.whatsAppTriggerRule.findMany({
      where: {
        schoolId,
        triggerType: 'FEE_DEFAULTER',
        isEnabled: true,
      },
      select: {
        campusId: true,
        templateName: true,
        minOutstandingAmount: true,
        minOverdueDays: true,
      },
    })
    const now = new Date()
    for (const rule of rules) {
      const overdueInvoices = await this.prisma.invoice.findMany({
        where: {
          schoolId,
          status: { in: ['UNPAID', 'PARTIAL', 'OVERDUE'] },
          student: { campusId: rule.campusId },
        },
        select: {
          id: true,
          studentId: true,
          totalAmount: true,
          paidAmount: true,
          dueDate: true,
          student: { select: { firstName: true, lastName: true, guardianPhone: true } },
        },
      })

      for (const invoice of overdueInvoices) {
        const outstanding = (invoice.totalAmount || 0) - (invoice.paidAmount || 0)
        const overdueDays = Math.max(
          0,
          Math.floor((now.getTime() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24)),
        )
        if ((rule.minOutstandingAmount || 0) > outstanding) continue
        if ((rule.minOverdueDays || 0) > overdueDays) continue
        if (!invoice.student.guardianPhone) continue

        await this.send(
          schoolId,
          {
            to: invoice.student.guardianPhone,
            templateId: rule.templateName || 'fee_reminder',
            message: `Fee reminder for ${invoice.student.firstName} ${invoice.student.lastName}: PKR ${outstanding} is overdue by ${overdueDays} day(s).`,
          },
          undefined,
          rule.campusId,
        )
      }
    }
  }

  async getAbsenteeCandidates(schoolId: string, campusId: string, date?: string) {
    const targetDate = date ? new Date(date) : new Date()
    targetDate.setHours(0, 0, 0, 0)

    const rows = await this.prisma.attendance.findMany({
      where: {
        schoolId,
        status: 'ABSENT',
        date: targetDate,
        student: { campusId, deletedAt: null },
      },
      select: {
        studentId: true,
        date: true,
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            rollNumber: true,
            guardianPhone: true,
            class: { select: { name: true } },
            section: { select: { name: true } },
          },
        },
      },
      orderBy: { student: { rollNumber: 'asc' } },
    })

    return rows.map((row) => ({
      studentId: row.student.id,
      fullName: `${row.student.firstName} ${row.student.lastName}`.trim(),
      rollNumber: row.student.rollNumber,
      guardianPhone: row.student.guardianPhone,
      className: row.student.class?.name || null,
      sectionName: row.student.section?.name || null,
      date: row.date,
    }))
  }

  async sendAbsenteeToSelected(
    schoolId: string,
    campusId: string,
    dto: { studentIds: string[]; date?: string },
    senderId?: string,
  ) {
    if (!dto.studentIds?.length) return { success: true, sent: 0, skipped: 0 }

    const prismaAny = this.prisma as any
    const trigger = await prismaAny.whatsAppTriggerRule.findUnique({
      where: {
        schoolId_campusId_triggerType: {
          schoolId,
          campusId,
          triggerType: 'ABSENT',
        },
      },
    })

    const candidates = await this.getAbsenteeCandidates(schoolId, campusId, dto.date)
    const selected = candidates.filter((c) => dto.studentIds.includes(c.studentId))

    let sent = 0
    let skipped = 0
    for (const student of selected) {
      if (!student.guardianPhone) {
        skipped++
        continue
      }
      await this.send(
        schoolId,
        {
          to: student.guardianPhone,
          templateId: trigger?.templateName || 'attendance_alert',
          message: `${student.fullName} was marked absent on ${new Date(student.date).toLocaleDateString()}${student.className ? ` (${student.className})` : ''}.`,
        },
        senderId,
        campusId,
      )
      sent++
    }
    return { success: true, sent, skipped, totalCandidates: candidates.length }
  }

  async getFeeDefaulterCandidates(
    schoolId: string,
    campusId: string,
    dto?: { minOutstandingAmount?: number; minOverdueDays?: number },
  ) {
    const now = new Date()
    const invoices = await this.prisma.invoice.findMany({
      where: {
        schoolId,
        status: { in: ['UNPAID', 'PARTIAL', 'OVERDUE'] },
        student: { campusId, deletedAt: null },
      },
      select: {
        studentId: true,
        totalAmount: true,
        paidAmount: true,
        dueDate: true,
        student: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            rollNumber: true,
            guardianPhone: true,
            class: { select: { name: true } },
            section: { select: { name: true } },
          },
        },
      },
    })

    const byStudent = new Map<
      string,
      {
        studentId: string
        fullName: string
        rollNumber: string
        guardianPhone: string | null
        className: string | null
        sectionName: string | null
        outstandingAmount: number
        maxOverdueDays: number
      }
    >()

    for (const invoice of invoices) {
      const overdueDays = Math.max(
        0,
        Math.floor((now.getTime() - new Date(invoice.dueDate).getTime()) / (1000 * 60 * 60 * 24)),
      )
      const outstanding = (invoice.totalAmount || 0) - (invoice.paidAmount || 0)
      if (outstanding <= 0) continue

      const existing = byStudent.get(invoice.studentId)
      if (!existing) {
        byStudent.set(invoice.studentId, {
          studentId: invoice.student.id,
          fullName: `${invoice.student.firstName} ${invoice.student.lastName}`.trim(),
          rollNumber: invoice.student.rollNumber,
          guardianPhone: invoice.student.guardianPhone,
          className: invoice.student.class?.name || null,
          sectionName: invoice.student.section?.name || null,
          outstandingAmount: outstanding,
          maxOverdueDays: overdueDays,
        })
        continue
      }
      existing.outstandingAmount += outstanding
      existing.maxOverdueDays = Math.max(existing.maxOverdueDays, overdueDays)
    }

    const minOutstandingAmount = dto?.minOutstandingAmount ?? 0
    const minOverdueDays = dto?.minOverdueDays ?? 0
    return Array.from(byStudent.values()).filter(
      (row) =>
        row.outstandingAmount >= minOutstandingAmount && row.maxOverdueDays >= minOverdueDays,
    )
  }

  async sendFeeDefaulterToSelected(
    schoolId: string,
    campusId: string,
    dto: { studentIds: string[]; minOutstandingAmount?: number; minOverdueDays?: number },
    senderId?: string,
  ) {
    if (!dto.studentIds?.length) return { success: true, sent: 0, skipped: 0 }
    const prismaAny = this.prisma as any
    const trigger = await prismaAny.whatsAppTriggerRule.findUnique({
      where: {
        schoolId_campusId_triggerType: {
          schoolId,
          campusId,
          triggerType: 'FEE_DEFAULTER',
        },
      },
    })
    const candidates = await this.getFeeDefaulterCandidates(schoolId, campusId, dto)
    const selected = candidates.filter((c) => dto.studentIds.includes(c.studentId))

    let sent = 0
    let skipped = 0
    for (const student of selected) {
      if (!student.guardianPhone) {
        skipped++
        continue
      }
      await this.send(
        schoolId,
        {
          to: student.guardianPhone,
          templateId: trigger?.templateName || 'fee_reminder',
          message: `Fee reminder for ${student.fullName}: PKR ${student.outstandingAmount} is overdue by ${student.maxOverdueDays} day(s).`,
        },
        senderId,
        campusId,
      )
      sent++
    }

    return { success: true, sent, skipped, totalCandidates: candidates.length }
  }
}
