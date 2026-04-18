import { Controller, Get, Post, Body, Query, UseGuards, BadRequestException } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { SmsService } from './sms.service'
import { EmailService } from './email.service'
import { WhatsappService } from './whatsapp.service'
import { TenantId, RequirePermission, CampusId } from '../../common/decorators'
import { TenantGuard } from '../../common/guards'
import { Permission } from '../../common/constants'
import { PrismaService } from '../../prisma/prisma.service'

@ApiTags('Communications')
@ApiBearerAuth()
@Controller('communications')
@UseGuards(TenantGuard)
export class CommunicationsController {
  constructor(
    private readonly smsService: SmsService,
    private readonly emailService: EmailService,
    private readonly whatsappService: WhatsappService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('sms')
  @ApiOperation({ summary: 'Send SMS' })
  @RequirePermission(Permission.CREATE_COMMUNICATION)
  sendSms() {
    throw new BadRequestException('SMS channel has been disabled. Use WhatsApp only.')
  }

  @Post('email')
  @ApiOperation({ summary: 'Send email' })
  @RequirePermission(Permission.CREATE_COMMUNICATION)
  sendEmail() {
    throw new BadRequestException('Email channel has been disabled. Use WhatsApp only.')
  }

  @Post('whatsapp')
  @ApiOperation({ summary: 'Send WhatsApp message' })
  @RequirePermission(Permission.CREATE_COMMUNICATION)
  sendWhatsapp(
    @TenantId() schoolId: string,
    @Body() dto: { to: string; message: string; templateId?: string },
    @CampusId() campusId?: string,
  ) {
    return this.whatsappService.send(schoolId, dto, undefined, campusId)
  }

  @Get('whatsapp/config')
  @ApiOperation({ summary: 'Get WhatsApp config for selected campus' })
  @RequirePermission(Permission.READ_COMMUNICATION)
  getWhatsappConfig(@TenantId() schoolId: string, @CampusId() campusId?: string) {
    return this.whatsappService.getCampusConfig(schoolId, campusId)
  }

  @Post('whatsapp/config')
  @ApiOperation({ summary: 'Create or update WhatsApp config for selected campus' })
  @RequirePermission(Permission.CREATE_COMMUNICATION)
  upsertWhatsappConfig(
    @TenantId() schoolId: string,
    @CampusId() campusId: string | undefined,
    @Body()
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
    if (!campusId) throw new BadRequestException('Campus is required')
    return this.whatsappService.upsertCampusConfig(schoolId, campusId, dto)
  }

  @Get('whatsapp/triggers')
  @ApiOperation({ summary: 'Get WhatsApp triggers for selected campus' })
  @RequirePermission(Permission.READ_COMMUNICATION)
  getWhatsappTriggers(@TenantId() schoolId: string, @CampusId() campusId?: string) {
    return this.whatsappService.getTriggerRules(schoolId, campusId)
  }

  @Post('whatsapp/triggers')
  @ApiOperation({ summary: 'Upsert WhatsApp trigger rule for selected campus' })
  @RequirePermission(Permission.CREATE_COMMUNICATION)
  upsertWhatsappTrigger(
    @TenantId() schoolId: string,
    @CampusId() campusId: string | undefined,
    @Body()
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
    if (!campusId) throw new BadRequestException('Campus is required')
    return this.whatsappService.upsertTriggerRule(schoolId, campusId, dto as any)
  }

  @Post('whatsapp/announcement')
  @ApiOperation({ summary: 'Broadcast WhatsApp announcement for selected campus' })
  @RequirePermission(Permission.CREATE_COMMUNICATION)
  sendAnnouncement(
    @TenantId() schoolId: string,
    @CampusId() campusId: string | undefined,
    @Body() dto: { title?: string; message: string; studentIds?: string[] },
  ) {
    if (!campusId) throw new BadRequestException('Campus is required')
    return this.whatsappService.sendAnnouncementToCampus(schoolId, campusId, dto)
  }

  @Get('whatsapp/recipients/absentees')
  @ApiOperation({ summary: 'Get absentee recipient list for selected campus' })
  @RequirePermission(Permission.READ_COMMUNICATION)
  getAbsenteeRecipients(
    @TenantId() schoolId: string,
    @CampusId() campusId: string | undefined,
    @Query('date') date?: string,
  ) {
    if (!campusId) throw new BadRequestException('Campus is required')
    return this.whatsappService.getAbsenteeCandidates(schoolId, campusId, date)
  }

  @Post('whatsapp/send/absentees')
  @ApiOperation({ summary: 'Send absentee WhatsApp to selected students only' })
  @RequirePermission(Permission.CREATE_COMMUNICATION)
  sendAbsenteesToSelected(
    @TenantId() schoolId: string,
    @CampusId() campusId: string | undefined,
    @Body() dto: { studentIds: string[]; date?: string },
  ) {
    if (!campusId) throw new BadRequestException('Campus is required')
    return this.whatsappService.sendAbsenteeToSelected(schoolId, campusId, dto)
  }

  @Get('whatsapp/recipients/fee-defaulters')
  @ApiOperation({ summary: 'Get fee-defaulter recipient list for selected campus' })
  @RequirePermission(Permission.READ_COMMUNICATION)
  getFeeDefaulterRecipients(
    @TenantId() schoolId: string,
    @CampusId() campusId: string | undefined,
    @Query('minOutstandingAmount') minOutstandingAmount?: string,
    @Query('minOverdueDays') minOverdueDays?: string,
  ) {
    if (!campusId) throw new BadRequestException('Campus is required')
    return this.whatsappService.getFeeDefaulterCandidates(schoolId, campusId, {
      minOutstandingAmount: minOutstandingAmount ? Number(minOutstandingAmount) : undefined,
      minOverdueDays: minOverdueDays ? Number(minOverdueDays) : undefined,
    })
  }

  @Post('whatsapp/send/fee-defaulters')
  @ApiOperation({ summary: 'Send fee-defaulter WhatsApp to selected students only' })
  @RequirePermission(Permission.CREATE_COMMUNICATION)
  sendFeeDefaultersToSelected(
    @TenantId() schoolId: string,
    @CampusId() campusId: string | undefined,
    @Body() dto: { studentIds: string[]; minOutstandingAmount?: number; minOverdueDays?: number },
  ) {
    if (!campusId) throw new BadRequestException('Campus is required')
    return this.whatsappService.sendFeeDefaulterToSelected(schoolId, campusId, dto)
  }

  @Get('logs')
  @ApiOperation({ summary: 'Get communication logs' })
  @RequirePermission(Permission.READ_COMMUNICATION)
  async getLogs(
    @TenantId() schoolId: string,
    @Query('channel') channel?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @CampusId() campusId?: string,
  ) {
    const where: any = { schoolId }
    if (channel) where.channel = channel
    if (campusId) where.campusId = campusId

    const p = Number(page) || 1
    const ps = Number(pageSize) || 20
    const [data, total] = await this.prisma.$transaction([
      this.prisma.communicationLog.findMany({
        where,
        skip: (p - 1) * ps,
        take: ps,
        orderBy: { sentAt: 'desc' },
      }),
      this.prisma.communicationLog.count({ where }),
    ])
    return { data, total, page: p, pageSize: ps, totalPages: Math.ceil(total / ps) }
  }
}
