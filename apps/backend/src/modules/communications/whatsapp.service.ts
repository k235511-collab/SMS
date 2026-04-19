import { BadRequestException, Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

type TriggerType = 'ABSENT' | 'FEE_DEFAULTER' | 'ANNOUNCEMENT'

interface PhoneValidationResult {
  isValid: boolean
  normalizedPhone: string | null
  reason: string | null
}

interface MetaGraphApiError {
  message?: string
  code?: number
  error_subcode?: number
  fbtrace_id?: string
  type?: string
}

interface MetaGraphApiResponse {
  messaging_product?: string
  contacts?: Array<{ input?: string; wa_id?: string }>
  messages?: Array<{ id?: string }>
  error?: MetaGraphApiError
}

const DEFAULT_TEMPLATE_BY_TRIGGER: Record<TriggerType, string> = {
  ABSENT: 'attendance_alert',
  FEE_DEFAULTER: 'fee_reminder',
  ANNOUNCEMENT: 'school_announcement',
}

const DEFAULT_MESSAGE_PATTERN_BY_TRIGGER: Record<TriggerType, string> = {
  ABSENT: 'Student was marked absent today.',
  FEE_DEFAULTER: 'Fee payment is overdue. Please clear dues.',
  ANNOUNCEMENT: 'School announcement.',
}

const DEFAULT_GRAPH_API_VERSION = process.env.WHATSAPP_GRAPH_API_VERSION || 'v23.0'
const DEFAULT_TEMPLATE_LANGUAGE = process.env.WHATSAPP_TEMPLATE_LANGUAGE || 'en_US'
const DEFAULT_META_TIMEOUT_MS = Number(process.env.WHATSAPP_REQUEST_TIMEOUT_MS || 15000)

@Injectable()
export class WhatsappService {
  private readonly logger = new Logger(WhatsappService.name)

  constructor(private readonly prisma: PrismaService) {}

  private validatePakistaniPhone(phone?: string | null): PhoneValidationResult {
    if (!phone || !phone.trim()) {
      return { isValid: false, normalizedPhone: null, reason: 'Number is missing' }
    }

    const digits = phone.replace(/[^\d]/g, '')
    if (/^03\d{9}$/.test(digits)) {
      return { isValid: true, normalizedPhone: `92${digits.slice(1)}`, reason: null }
    }
    if (/^3\d{9}$/.test(digits)) {
      return { isValid: true, normalizedPhone: `92${digits}`, reason: null }
    }
    if (/^923\d{9}$/.test(digits)) {
      return { isValid: true, normalizedPhone: digits, reason: null }
    }
    if (/^00923\d{9}$/.test(digits)) {
      return { isValid: true, normalizedPhone: digits.slice(2), reason: null }
    }

    return {
      isValid: false,
      normalizedPhone: null,
      reason: 'Use Pakistani mobile format like 03XXXXXXXXX',
    }
  }

  private readTriggerMessagePattern(
    trigger: { metadata?: unknown } | null | undefined,
    triggerType: TriggerType,
  ) {
    const metadata = trigger?.metadata
    if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
      const raw = (metadata as Record<string, unknown>).messagePattern
      if (typeof raw === 'string' && raw.trim().length > 0) {
        return raw
      }
    }
    return DEFAULT_MESSAGE_PATTERN_BY_TRIGGER[triggerType]
  }

  private formatMessageWithPattern(
    pattern: string,
    values: Record<string, string | number>,
    fallbackMessage: string,
  ) {
    const tokenAliases: Record<string, string> = {
      student: 'studentName',
      studentname: 'studentName',
      firstname: 'firstName',
      lastname: 'lastName',
      class: 'classWithSection',
      classwithsection: 'classWithSection',
      classsection: 'classWithSection',
      classname: 'className',
      section: 'sectionName',
      sectionname: 'sectionName',
      date: 'date',
      title: 'title',
      message: 'message',
      amount: 'amount',
      overduedays: 'overdueDays',
      school: 'schoolName',
      schoolname: 'schoolName',
      campus: 'campusName',
      campusname: 'campusName',
    }

    const readValueByToken = (token: string) => {
      const normalized = token.toLowerCase().replace(/[^a-z0-9]/g, '')
      const resolvedToken = tokenAliases[normalized] || token
      const value = values[resolvedToken]
      if (value === undefined || value === null) return null
      return String(value)
    }

    const renderedLegacy = pattern.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_match, token: string) => {
      const value = readValueByToken(token)
      return value ?? ''
    })

    const renderedFriendly = renderedLegacy.replace(/\[\s*([^\[\]]+?)\s*\]/g, (match, token: string) => {
      const value = readValueByToken(token)
      return value ?? match
    })

    const compact = renderedFriendly.replace(/\s+/g, ' ').trim()
    return compact.length > 0 ? compact : fallbackMessage
  }

  private buildTwoPartMessage(
    editablePart: string,
    details: Array<{ label: string; value?: string | number | null }>,
  ) {
    const principalPart = (editablePart || '').replace(/\s+/g, ' ').trim()
    const detailsPart = details
      .map((detail) => ({
        label: detail.label,
        value:
          detail.value === undefined || detail.value === null
            ? ''
            : String(detail.value).replace(/\s+/g, ' ').trim(),
      }))
      .filter((detail) => detail.value.length > 0)
      .map((detail) => `${detail.label}: ${detail.value}`)

    const autoPart = detailsPart.length > 0 ? `Auto details:\n${detailsPart.join('\n')}` : ''
    if (principalPart && autoPart) return `${principalPart}\n\n${autoPart}`
    return principalPart || autoPart
  }

  private getUtcDayRange(date?: string) {
    const isDateInput = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)
    const targetDate = isDateInput ? date : new Date().toISOString().slice(0, 10)
    return {
      start: new Date(`${targetDate}T00:00:00.000Z`),
      end: new Date(`${targetDate}T23:59:59.999Z`),
    }
  }

  private async getSchoolCampusContext(schoolId: string, campusId?: string) {
    const [school, campus] = await Promise.all([
      this.prisma.school.findFirst({ where: { id: schoolId }, select: { name: true } }),
      campusId
        ? this.prisma.campus.findFirst({ where: { id: campusId, schoolId }, select: { name: true } })
        : Promise.resolve(null),
    ])

    return {
      schoolName: school?.name || '',
      campusName: campus?.name || '',
    }
  }

  private mapRecipientPhoneInfo(phone?: string | null) {
    const validation = this.validatePakistaniPhone(phone)
    return {
      studentPhone: phone || null,
      studentPhoneNormalized: validation.normalizedPhone,
      phoneValid: validation.isValid,
      phoneValidationReason: validation.reason,
    }
  }

  private resolveAccessToken(config: { accessToken?: string | null }) {
    return (
      config.accessToken || process.env.WHATSAPP_SYSTEM_TOKEN || process.env.WHATSAPP_ACCESS_TOKEN || ''
    ).trim()
  }

  private buildMetaGraphApiUrl(phoneNumberId: string) {
    const graphApiVersion = (process.env.WHATSAPP_GRAPH_API_VERSION || DEFAULT_GRAPH_API_VERSION).trim()
    return `https://graph.facebook.com/${graphApiVersion}/${phoneNumberId}/messages`
  }

  private buildTextMessagePayload(to: string, message: string) {
    return {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: {
        body: message,
      },
    }
  }

  private buildTemplateMessagePayload(to: string, templateName: string, message?: string) {
    const payload: Record<string, unknown> = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'template',
      template: {
        name: templateName,
        language: {
          policy: 'deterministic',
          code: (process.env.WHATSAPP_TEMPLATE_LANGUAGE || DEFAULT_TEMPLATE_LANGUAGE).trim(),
        },
      },
    }

    const normalizedMessage = (message || '').trim()
    if (normalizedMessage) {
      ;(payload.template as Record<string, unknown>).components = [
        {
          type: 'body',
          parameters: [{ type: 'text', text: normalizedMessage }],
        },
      ]
    }

    return payload
  }

  private getMetaErrorMessage(body: MetaGraphApiResponse | null, status: number) {
    const metaError = body?.error
    if (!metaError) return `Meta Graph API request failed with status ${status}`

    const details: string[] = []
    if (metaError.code) details.push(`code=${metaError.code}`)
    if (metaError.error_subcode) details.push(`subcode=${metaError.error_subcode}`)
    if (metaError.fbtrace_id) details.push(`trace=${metaError.fbtrace_id}`)
    const suffix = details.length > 0 ? ` (${details.join(', ')})` : ''
    return `${metaError.message || 'Meta Graph API error'}${suffix}`
  }

  private async postToMetaGraphApi(
    endpoint: string,
    accessToken: string,
    payload: Record<string, unknown>,
  ) {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), DEFAULT_META_TIMEOUT_MS)

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })

      const body = (await response.json().catch(() => null)) as MetaGraphApiResponse | null
      if (!response.ok) {
        throw new Error(this.getMetaErrorMessage(body, response.status))
      }

      return body || {}
    } catch (error: any) {
      if (error?.name === 'AbortError') {
        throw new Error(`Meta Graph API request timed out after ${DEFAULT_META_TIMEOUT_MS}ms`)
      }
      throw error
    } finally {
      clearTimeout(timeout)
    }
  }

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
    const normalizedConfigNumber = dto.whatsappNumber
      ? this.validatePakistaniPhone(dto.whatsappNumber)
      : null

    if (normalizedConfigNumber && !normalizedConfigNumber.isValid) {
      throw new BadRequestException(
        normalizedConfigNumber.reason || 'Invalid WhatsApp number format',
      )
    }

    const prismaAny = this.prisma as any
    return prismaAny.whatsAppCampusConfig.upsert({
      where: { campusId },
      update: {
        providerMode: dto.providerMode,
        businessAccountId: dto.businessAccountId,
        appId: dto.appId,
        phoneNumberId: dto.phoneNumberId,
        whatsappNumber: normalizedConfigNumber?.normalizedPhone || dto.whatsappNumber,
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
        whatsappNumber: normalizedConfigNumber?.normalizedPhone || dto.whatsappNumber,
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

    const normalizedMessage = (dto.message || '').trim()
    const templateName = dto.templateId?.trim() || undefined
    if (!templateName && !normalizedMessage) {
      throw new BadRequestException('Message is required when no template is provided')
    }

    const config = await this.getCampusConfig(schoolId, campusId)
    if (!config || !config.isActive || !config.isVerified || !config.phoneNumberId) {
      throw new BadRequestException('WhatsApp is not configured/active for this campus')
    }

    const accessToken = this.resolveAccessToken(config)
    if (!accessToken) {
      throw new BadRequestException('WhatsApp access token is missing for this campus')
    }

    const endpoint = this.buildMetaGraphApiUrl(String(config.phoneNumberId))

    const phoneValidation = this.validatePakistaniPhone(dto.to)
    if (!phoneValidation.isValid || !phoneValidation.normalizedPhone) {
      const reason = phoneValidation.reason || 'Invalid recipient number'
      this.logger.warn(`Skipping WhatsApp send due to invalid number: ${dto.to} (${reason})`)
      await this.prisma.communicationLog.create({
        data: {
          channel: 'WHATSAPP',
          recipient: dto.to,
          message: dto.message,
          status: 'FAILED',
          metadata: { error: reason },
          schoolId,
          senderId,
          campusId: campusId || undefined,
        },
      })
      return { success: false, error: reason }
    }

    const recipientNumber = phoneValidation.normalizedPhone
    this.logger.log(`Sending WhatsApp to ${recipientNumber}: ${normalizedMessage}`)

    try {
      let providerResponse: MetaGraphApiResponse = {}
      let messageType: 'text' | 'template' = 'text'
      let templateFallbackUsed = false
      let templateFallbackError: string | null = null

      if (templateName) {
        messageType = 'template'
        try {
          providerResponse = await this.postToMetaGraphApi(
            endpoint,
            accessToken,
            this.buildTemplateMessagePayload(recipientNumber, templateName, normalizedMessage),
          )
        } catch (templateError: any) {
          if (!normalizedMessage) throw templateError

          templateFallbackUsed = true
          templateFallbackError = templateError?.message || 'Template send failed'
          this.logger.warn(
            `Template send failed for ${recipientNumber}. Falling back to text message: ${templateFallbackError}`,
          )

          messageType = 'text'
          providerResponse = await this.postToMetaGraphApi(
            endpoint,
            accessToken,
            this.buildTextMessagePayload(recipientNumber, normalizedMessage),
          )
        }
      } else {
        providerResponse = await this.postToMetaGraphApi(
          endpoint,
          accessToken,
          this.buildTextMessagePayload(recipientNumber, normalizedMessage),
        )
      }

      const messageId = providerResponse.messages?.[0]?.id
      this.logger.log(`[META] WhatsApp sent successfully to ${recipientNumber} (type=${messageType})`)

      const log = await this.prisma.communicationLog.create({
        data: {
          channel: 'WHATSAPP',
          recipient: recipientNumber,
          message: normalizedMessage,
          status: 'SENT',
          schoolId,
          senderId,
          campusId: campusId || undefined,
          metadata: {
            provider: 'meta_cloud_api',
            templateId: templateName,
            messageType,
            messageId,
            graphApiVersion: process.env.WHATSAPP_GRAPH_API_VERSION || DEFAULT_GRAPH_API_VERSION,
            templateFallbackUsed,
            templateFallbackError,
            phoneNumberId: config.phoneNumberId,
            providerMode: config.providerMode,
            response: providerResponse,
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
      const errorMessage = error?.message || 'Failed to send WhatsApp'
      this.logger.error(`Failed to send WhatsApp: ${errorMessage}`)
      await this.prisma.communicationLog.create({
        data: {
          channel: 'WHATSAPP',
          recipient: recipientNumber,
          message: normalizedMessage,
          status: 'FAILED',
          metadata: {
            provider: 'meta_cloud_api',
            templateId: templateName,
            phoneNumberId: config.phoneNumberId,
            error: errorMessage,
          },
          schoolId,
          senderId,
          campusId: campusId || undefined,
        },
      })
      return { success: false, error: errorMessage }
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

    const { schoolName, campusName } = await this.getSchoolCampusContext(schoolId, campusId)
    const messagePattern = this.readTriggerMessagePattern(trigger, 'ANNOUNCEMENT')

    const students = await this.prisma.student.findMany({
      where: {
        schoolId,
        campusId,
        deletedAt: null,
        ...(dto.studentIds?.length ? { id: { in: dto.studentIds } } : {}),
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        class: { select: { name: true } },
        section: { select: { name: true } },
      },
    })

    let sent = 0
    let skipped = 0
    for (const student of students) {
      const classWithSection = [student.class?.name, student.section?.name]
        .filter((value) => !!value)
        .join(' / ')

      const fallbackMessage = `${dto.title ? `${dto.title}: ` : ''}${dto.message}`.trim()
      const message = this.formatMessageWithPattern(
        messagePattern,
        {
          title: dto.title || '',
          message: dto.message,
          studentName: `${student.firstName} ${student.lastName}`.trim(),
          firstName: student.firstName,
          lastName: student.lastName,
          className: student.class?.name || '',
          sectionName: student.section?.name || '',
          classWithSection: classWithSection || 'Class not set',
          schoolName,
          campusName,
        },
        fallbackMessage,
      )
      const principalMessage = `${dto.title ? `${dto.title}: ` : ''}${dto.message || ''}`.trim() || message
      const safeMessage = this.buildTwoPartMessage(principalMessage, [
        { label: 'Student', value: `${student.firstName} ${student.lastName}`.trim() },
        { label: 'Class/Section', value: classWithSection || 'Class not set' },
        { label: 'Campus', value: campusName || 'Campus not set' },
        { label: 'School', value: schoolName || 'School not set' },
      ])

      const result = await this.send(
        schoolId,
        {
          to: student.phone || '',
          templateId: trigger?.templateName || DEFAULT_TEMPLATE_BY_TRIGGER.ANNOUNCEMENT,
          message: safeMessage,
        },
        senderId,
        campusId,
      )
      if (result.success) sent++
      else skipped++
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
    const { schoolName, campusName } = await this.getSchoolCampusContext(schoolId, campusId)
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
    const messagePattern = this.readTriggerMessagePattern(trigger, 'ABSENT')

    const students = await this.prisma.student.findMany({
      where: { schoolId, campusId, id: { in: absentStudentIds } },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        class: { select: { name: true } },
        section: { select: { name: true } },
      },
    })

    for (const student of students) {
      const classWithSection = [student.class?.name, student.section?.name]
        .filter((value) => !!value)
        .join(' / ')
      const fallbackMessage = `${student.firstName} ${student.lastName} was marked absent on ${date}${classWithSection ? ` (${classWithSection})` : ''}.`
      const message = this.formatMessageWithPattern(
        messagePattern,
        {
          studentName: `${student.firstName} ${student.lastName}`.trim(),
          firstName: student.firstName,
          lastName: student.lastName,
          className: student.class?.name || '',
          sectionName: student.section?.name || '',
          classWithSection,
          date,
          schoolName,
          campusName,
        },
        fallbackMessage,
      )
      const safeMessage = this.buildTwoPartMessage(message, [
        { label: 'Student', value: `${student.firstName} ${student.lastName}`.trim() },
        { label: 'Class/Section', value: classWithSection || 'Class not set' },
        { label: 'Date', value: date },
        { label: 'Campus', value: campusName || 'Campus not set' },
        { label: 'School', value: schoolName || 'School not set' },
      ])

      await this.send(
        schoolId,
        {
          to: student.phone || '',
          templateId: trigger?.templateName || DEFAULT_TEMPLATE_BY_TRIGGER.ABSENT,
          message: safeMessage,
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
        metadata: true,
        minOutstandingAmount: true,
        minOverdueDays: true,
      },
    })
    const now = new Date()
    for (const rule of rules) {
      const { schoolName, campusName } = await this.getSchoolCampusContext(schoolId, rule.campusId)
      const messagePattern = this.readTriggerMessagePattern(
        { metadata: (rule as any).metadata },
        'FEE_DEFAULTER',
      )
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
          student: {
            select: {
              firstName: true,
              lastName: true,
              phone: true,
              class: { select: { name: true } },
              section: { select: { name: true } },
            },
          },
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
        const classWithSection = [invoice.student.class?.name, invoice.student.section?.name]
          .filter((value) => !!value)
          .join(' / ')
        const fallbackMessage = `Fee reminder for ${invoice.student.firstName} ${invoice.student.lastName}: PKR ${outstanding} is overdue by ${overdueDays} day(s).`
        const message = this.formatMessageWithPattern(
          messagePattern,
          {
            studentName: `${invoice.student.firstName} ${invoice.student.lastName}`.trim(),
            firstName: invoice.student.firstName,
            lastName: invoice.student.lastName,
            className: invoice.student.class?.name || '',
            sectionName: invoice.student.section?.name || '',
            classWithSection: classWithSection || 'Class not set',
            amount: outstanding,
            overdueDays,
            schoolName,
            campusName,
          },
          fallbackMessage,
        )
        const safeMessage = this.buildTwoPartMessage(message, [
          { label: 'Student', value: `${invoice.student.firstName} ${invoice.student.lastName}`.trim() },
          { label: 'Class/Section', value: classWithSection || 'Class not set' },
          { label: 'Outstanding', value: `PKR ${outstanding}` },
          { label: 'Overdue', value: `${overdueDays} day(s)` },
          { label: 'Campus', value: campusName || 'Campus not set' },
          { label: 'School', value: schoolName || 'School not set' },
        ])

        await this.send(
          schoolId,
          {
            to: invoice.student.phone || '',
            templateId: rule.templateName || DEFAULT_TEMPLATE_BY_TRIGGER.FEE_DEFAULTER,
            message: safeMessage,
          },
          undefined,
          rule.campusId,
        )
      }
    }
  }

  async getAbsenteeCandidates(schoolId: string, campusId: string, date?: string) {
    const { start, end } = this.getUtcDayRange(date)

    const rows = await this.prisma.attendance.findMany({
      where: {
        schoolId,
        status: 'ABSENT',
        date: { gte: start, lte: end },
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
            phone: true,
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
      ...this.mapRecipientPhoneInfo(row.student.phone),
      className: row.student.class?.name || null,
      sectionName: row.student.section?.name || null,
      date: row.date,
    }))
  }

  async getAnnouncementCandidates(schoolId: string, campusId: string) {
    const students = await this.prisma.student.findMany({
      where: {
        schoolId,
        campusId,
        deletedAt: null,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        rollNumber: true,
        phone: true,
        class: { select: { name: true } },
        section: { select: { name: true } },
      },
      orderBy: { rollNumber: 'asc' },
    })

    return students.map((student) => ({
      studentId: student.id,
      fullName: `${student.firstName} ${student.lastName}`.trim(),
      rollNumber: student.rollNumber,
      ...this.mapRecipientPhoneInfo(student.phone),
      className: student.class?.name || null,
      sectionName: student.section?.name || null,
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
    const { schoolName, campusName } = await this.getSchoolCampusContext(schoolId, campusId)
    const messagePattern = this.readTriggerMessagePattern(trigger, 'ABSENT')

    let sent = 0
    let skipped = 0
    for (const student of selected) {
      const classWithSection = [student.className, student.sectionName]
        .filter((value) => !!value)
        .join(' / ')
      const fallbackMessage = `${student.fullName} was marked absent on ${new Date(student.date || new Date()).toLocaleDateString()}${student.className ? ` (${student.className})` : ''}.`
      const message = this.formatMessageWithPattern(
        messagePattern,
        {
          studentName: student.fullName,
          firstName: student.fullName.split(' ')[0] || student.fullName,
          lastName: student.fullName.split(' ').slice(1).join(' '),
          className: student.className || '',
          sectionName: student.sectionName || '',
          classWithSection: classWithSection || 'Class not set',
          date: student.date ? new Date(student.date).toLocaleDateString() : '',
          schoolName,
          campusName,
        },
        fallbackMessage,
      )
      const safeMessage = this.buildTwoPartMessage(message, [
        { label: 'Student', value: student.fullName },
        { label: 'Class/Section', value: classWithSection || 'Class not set' },
        { label: 'Date', value: student.date ? new Date(student.date).toLocaleDateString() : '' },
        { label: 'Campus', value: campusName || 'Campus not set' },
        { label: 'School', value: schoolName || 'School not set' },
      ])

      const result = await this.send(
        schoolId,
        {
          to: student.studentPhone || '',
          templateId: trigger?.templateName || DEFAULT_TEMPLATE_BY_TRIGGER.ABSENT,
          message: safeMessage,
        },
        senderId,
        campusId,
      )
      if (result.success) sent++
      else skipped++
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
            phone: true,
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
        rollNumber: string | null
        studentPhone: string | null
        studentPhoneNormalized: string | null
        phoneValid: boolean
        phoneValidationReason: string | null
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
          ...this.mapRecipientPhoneInfo(invoice.student.phone),
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
    const { schoolName, campusName } = await this.getSchoolCampusContext(schoolId, campusId)
    const messagePattern = this.readTriggerMessagePattern(trigger, 'FEE_DEFAULTER')

    let sent = 0
    let skipped = 0
    for (const student of selected) {
      const fallbackMessage = `Fee reminder for ${student.fullName}: PKR ${student.outstandingAmount} is overdue by ${student.maxOverdueDays} day(s).`
      const classWithSection = [student.className, student.sectionName]
        .filter((value) => !!value)
        .join(' / ')
      const message = this.formatMessageWithPattern(
        messagePattern,
        {
          studentName: student.fullName,
          firstName: student.fullName.split(' ')[0] || student.fullName,
          lastName: student.fullName.split(' ').slice(1).join(' '),
          className: student.className || '',
          sectionName: student.sectionName || '',
          classWithSection: classWithSection || 'Class not set',
          amount: student.outstandingAmount,
          overdueDays: student.maxOverdueDays,
          schoolName,
          campusName,
        },
        fallbackMessage,
      )
      const safeMessage = this.buildTwoPartMessage(message, [
        { label: 'Student', value: student.fullName },
        { label: 'Class/Section', value: classWithSection || 'Class not set' },
        { label: 'Outstanding', value: `PKR ${student.outstandingAmount}` },
        { label: 'Overdue', value: `${student.maxOverdueDays} day(s)` },
        { label: 'Campus', value: campusName || 'Campus not set' },
        { label: 'School', value: schoolName || 'School not set' },
      ])

      const result = await this.send(
        schoolId,
        {
          to: student.studentPhone || '',
          templateId: trigger?.templateName || DEFAULT_TEMPLATE_BY_TRIGGER.FEE_DEFAULTER,
          message: safeMessage,
        },
        senderId,
        campusId,
      )
      if (result.success) sent++
      else skipped++
    }

    return { success: true, sent, skipped, totalCandidates: candidates.length }
  }
}
