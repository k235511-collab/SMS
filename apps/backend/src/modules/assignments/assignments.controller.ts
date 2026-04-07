import {
    Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { AssignmentsService } from './assignments.service'
import { SubmissionsService } from './submissions.service'
import { CreateAssignmentDto, UpdateAssignmentDto, CreateSubmissionDto, GradeSubmissionDto } from './dto'
import { TenantId, RequirePermission, CampusId, TeacherId } from '../../common/decorators'
import { TenantGuard } from '../../common/guards'
import { Permission } from '../../common/constants'

@ApiTags('Assignments')
@ApiBearerAuth()
@Controller('assignments')
@UseGuards(TenantGuard)
export class AssignmentsController {
    constructor(
        private readonly assignmentsService: AssignmentsService,
        private readonly submissionsService: SubmissionsService,
    ) { }

    @Post()
    @ApiOperation({ summary: 'Create a new assignment' })
    @RequirePermission(Permission.CREATE_ASSIGNMENT)
    create(@TenantId() schoolId: string, @Body() dto: CreateAssignmentDto, @TeacherId() teacherId?: string | null) {
        return this.assignmentsService.create(schoolId, dto, teacherId)
    }

    @Get()
    @ApiOperation({ summary: 'List assignments' })
    @RequirePermission(Permission.READ_ASSIGNMENT)
    findAll(@TenantId() schoolId: string, @Query('classId') classId?: string, @Query('subjectId') subjectId?: string, @CampusId() campusId?: string, @TeacherId() teacherId?: string | null) {
        return this.assignmentsService.findAll(schoolId, { classId, subjectId }, campusId, teacherId)
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get assignment details' })
    @RequirePermission(Permission.READ_ASSIGNMENT)
    findOne(@Param('id') id: string, @TenantId() schoolId: string) {
        return this.assignmentsService.findById(id, schoolId)
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update an assignment' })
    @RequirePermission(Permission.UPDATE_ASSIGNMENT)
    update(@Param('id') id: string, @TenantId() schoolId: string, @Body() dto: UpdateAssignmentDto, @TeacherId() teacherId?: string | null) {
        return this.assignmentsService.update(id, schoolId, dto, teacherId)
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete an assignment' })
    @RequirePermission(Permission.DELETE_ASSIGNMENT)
    remove(@Param('id') id: string, @TenantId() schoolId: string, @TeacherId() teacherId?: string | null) {
        return this.assignmentsService.remove(id, schoolId, teacherId)
    }

    // ─── Submissions ────────────────────────────────────
    @Post('submissions')
    @ApiOperation({ summary: 'Submit an assignment' })
    submit(@TenantId() schoolId: string, @Body() dto: CreateSubmissionDto) {
        return this.submissionsService.submit(schoolId, dto)
    }

    @Patch('submissions/:id/grade')
    @ApiOperation({ summary: 'Grade a submission' })
    grade(@Param('id') id: string, @TenantId() schoolId: string, @Body() dto: GradeSubmissionDto) {
        return this.submissionsService.grade(id, schoolId, dto)
    }

    @Get(':id/submissions')
    @ApiOperation({ summary: 'List submissions for an assignment' })
    getSubmissions(@Param('id') assignmentId: string, @TenantId() schoolId: string) {
        return this.submissionsService.findByAssignment(assignmentId, schoolId)
    }
}
