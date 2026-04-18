import { Module } from '@nestjs/common'
import { ScheduleModule } from '@nestjs/schedule'
import { FinanceController } from './finance.controller'
import { FinanceService } from './finance.service'
import { FinanceCronService } from './finance-cron.service'
import { CommunicationsModule } from '../communications/communications.module'

@Module({
  imports: [ScheduleModule.forRoot(), CommunicationsModule],
  controllers: [FinanceController],
  providers: [FinanceService, FinanceCronService],
  exports: [FinanceService, FinanceCronService],
})
export class FinanceModule {}
