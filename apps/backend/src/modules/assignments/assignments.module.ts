import { Module } from '@nestjs/common'
import { AssignmentsController } from './assignments.controller'
import { AssignmentsService } from './assignments.service'
import { SubmissionsService } from './submissions.service'
import { TeachersModule } from '../teachers/teachers.module'

@Module({
    imports: [TeachersModule],
    controllers: [AssignmentsController],
    providers: [AssignmentsService, SubmissionsService],
    exports: [AssignmentsService, SubmissionsService],
})
export class AssignmentsModule { }
