import { Module } from '@nestjs/common'
import { TeachersController } from './teachers.controller'
import { TeachersService } from './teachers.service'
import { TeacherScopeService } from './teacher-scope.service'

@Module({
  controllers: [TeachersController],
  providers: [TeachersService, TeacherScopeService],
  exports: [TeachersService, TeacherScopeService],
})
export class TeachersModule {}
