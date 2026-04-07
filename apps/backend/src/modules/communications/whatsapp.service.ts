import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class WhatsappService {
    private readonly logger = new Logger(WhatsappService.name)

    constructor(private readonly prisma: PrismaService) { }

    async send(schoolId: string, dto: { to: string; message: string; templateId?: string }, senderId?: string, campusId?: string) {
        this.logger.log(`Sending WhatsApp to ${dto.to}: ${dto.message}`)

        try {
            // Mock WhatsApp sending
            this.logger.log(`[MOCK] WhatsApp sent successfully to ${dto.to}`)

            const log = await this.prisma.communicationLog.create({
                data: {
                    channel: 'WHATSAPP',
                    recipient: dto.to,
                    message: dto.message,
                    status: 'SENT',
                    schoolId,
                    senderId,
                    campusId: campusId || undefined,
                    metadata: { provider: 'mock', templateId: dto.templateId },
                },
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
}
