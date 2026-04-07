import { Module } from '@nestjs/common'
import { CommunicationsController } from './communications.controller'
import { SmsService } from './sms.service'
import { EmailService } from './email.service'
import { WhatsappService } from './whatsapp.service'

@Module({
    controllers: [CommunicationsController],
    providers: [SmsService, EmailService, WhatsappService],
    exports: [SmsService, EmailService, WhatsappService],
})
export class CommunicationsModule { }
