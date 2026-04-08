import { Module } from '@nestjs/common'
import { TimetableController } from './timetable.controller'
import { TimetableService } from './timetable.service'
import { TeachersModule } from '../teachers/teachers.module'

@Module({
  imports: [TeachersModule],
  controllers: [TimetableController],
  providers: [TimetableService],
  exports: [TimetableService],
})
export class TimetableModule {}
