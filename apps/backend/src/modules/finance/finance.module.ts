import { Module } from '@nestjs/common'
import { ScheduleModule } from '@nestjs/schedule'
import { FinanceController } from './finance.controller'
import { FinanceService } from './finance.service'
import { FinanceCronService } from './finance-cron.service'

@Module({
  imports: [ScheduleModule.forRoot()],
  controllers: [FinanceController],
  providers: [FinanceService, FinanceCronService],
  exports: [FinanceService, FinanceCronService],
})
export class FinanceModule {}
