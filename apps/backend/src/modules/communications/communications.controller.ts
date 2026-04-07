import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common'
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
    ) { }

    @Post('sms')
    @ApiOperation({ summary: 'Send SMS' })
    @RequirePermission(Permission.CREATE_COMMUNICATION)
    sendSms(@TenantId() schoolId: string, @Body() dto: { recipient: string; message: string }, @CampusId() campusId?: string) {
        return this.smsService.send(schoolId, { to: dto.recipient, message: dto.message }, undefined, campusId)
    }

    @Post('email')
    @ApiOperation({ summary: 'Send email' })
    @RequirePermission(Permission.CREATE_COMMUNICATION)
    sendEmail(@TenantId() schoolId: string, @Body() dto: { to: string; subject: string; body: string; isHtml?: boolean }, @CampusId() campusId?: string) {
        return this.emailService.send(schoolId, dto, undefined, campusId)
    }

    @Post('whatsapp')
    @ApiOperation({ summary: 'Send WhatsApp message' })
    @RequirePermission(Permission.CREATE_COMMUNICATION)
    sendWhatsapp(@TenantId() schoolId: string, @Body() dto: { to: string; message: string; templateId?: string }, @CampusId() campusId?: string) {
        return this.whatsappService.send(schoolId, dto, undefined, campusId)
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
                where, skip: (p - 1) * ps, take: ps, orderBy: { sentAt: 'desc' },
            }),
            this.prisma.communicationLog.count({ where }),
        ])
        return { data, total, page: p, pageSize: ps, totalPages: Math.ceil(total / ps) }
    }
}
