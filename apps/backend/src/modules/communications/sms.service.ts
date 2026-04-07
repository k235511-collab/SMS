import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class SmsService {
    private readonly logger = new Logger(SmsService.name)

    constructor(private readonly prisma: PrismaService) { }

    async send(schoolId: string, dto: { to: string; message: string }, senderId?: string, campusId?: string) {
        this.logger.log(`Sending SMS to ${dto.to}: ${dto.message}`)

        try {
            // Mock SMS sending
            this.logger.log(`[MOCK] SMS sent successfully to ${dto.to}`)

            const log = await this.prisma.communicationLog.create({
                data: {
                    channel: 'SMS_CHANNEL',
                    recipient: dto.to,
                    message: dto.message,
                    status: 'SENT',
                    schoolId,
                    senderId,
                    campusId: campusId || undefined,
                    metadata: { provider: 'mock' },
                },
            })
            return { success: true, logId: log.id }
        } catch (error: any) {
            this.logger.error(`Failed to send SMS: ${error.message}`)
            await this.prisma.communicationLog.create({
                data: {
                    channel: 'SMS_CHANNEL',
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
}
