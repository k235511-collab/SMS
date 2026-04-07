import { Module } from '@nestjs/common'
import { ExamsController } from './exams.controller'
import { ExamsService } from './exams.service'
import { TeachersModule } from '../teachers/teachers.module'

@Module({
  imports: [TeachersModule],
  controllers: [ExamsController],
  providers: [ExamsService],
  exports: [ExamsService],
})
export class ExamsModule {}
