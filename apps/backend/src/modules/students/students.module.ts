import { Module } from '@nestjs/common'
import { StudentsController } from './students.controller'
import { StudentsService } from './students.service'
import { FinanceModule } from '../finance/finance.module'
import { TeachersModule } from '../teachers/teachers.module'

@Module({
  imports: [FinanceModule, TeachersModule],
  controllers: [StudentsController],
  providers: [StudentsService],
  exports: [StudentsService],
})
export class StudentsModule {}
