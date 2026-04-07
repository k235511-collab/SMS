import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name)

  constructor(private readonly prisma: PrismaService) {}

  async send(
    schoolId: string,
    dto: { to: string; subject: string; body: string; isHtml?: boolean },
    senderId?: string,
    campusId?: string,
  ) {
    this.logger.log(`Sending email to ${dto.to}: ${dto.subject}`)

    try {
      // Mock email sending (Nodemailer not installed yet)
      // In production, uncomment and install nodemailer
      /*
            const transporter = nodemailer.createTransport({ ... });
            await transporter.sendMail({ ... });
            */

      this.logger.log(`[MOCK] Email sent successfully to ${dto.to}`)

      const log = await this.prisma.communicationLog.create({
        data: {
          channel: 'EMAIL',
          recipient: dto.to,
          subject: dto.subject,
          message: dto.body,
          status: 'SENT',
          schoolId,
          senderId,
          campusId: campusId || undefined,
          metadata: { isHtml: dto.isHtml ?? false, provider: 'mock' },
        },
      })
      return { success: true, logId: log.id }
    } catch (error: any) {
      this.logger.error(`Failed to send email: ${error.message}`)
      await this.prisma.communicationLog.create({
        data: {
          channel: 'EMAIL',
          recipient: dto.to,
          subject: dto.subject,
          message: dto.body,
          status: 'FAILED',
          schoolId,
          senderId,
          campusId: campusId || undefined,
          metadata: { isHtml: dto.isHtml ?? false, provider: 'mock', error: error.message },
        },
      })
      return { success: false, error: error.message }
    }
  }
}
