import { Module } from '@nestjs/common'
import { AttendanceController } from './attendance.controller'
import { AttendanceService } from './attendance.service'
import { TeachersModule } from '../teachers/teachers.module'
import { CommunicationsModule } from '../communications/communications.module'

@Module({
  imports: [TeachersModule, CommunicationsModule],
  controllers: [AttendanceController],
  providers: [AttendanceService],
  exports: [AttendanceService],
})
export class AttendanceModule {}
