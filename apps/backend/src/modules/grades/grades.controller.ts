import {
    Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { GradesService } from './grades.service'
import { CreateGradeDto, UpdateGradeDto } from './dto'
import { TenantId, RequirePermission } from '../../common/decorators'
import { TenantGuard } from '../../common/guards'
import { Permission } from '../../common/constants'

@ApiTags('Grades')
@ApiBearerAuth()
@Controller('grades')
@UseGuards(TenantGuard)
export class GradesController {
    constructor(private readonly gradesService: GradesService) { }

    @Post()
    @ApiOperation({ summary: 'Create a grade record' })
    @RequirePermission(Permission.CREATE_GRADE)
    create(@TenantId() schoolId: string, @Body() dto: CreateGradeDto) {
        return this.gradesService.create(schoolId, dto)
    }

    @Get()
    @ApiOperation({ summary: 'List grade records' })
    @RequirePermission(Permission.READ_GRADE)
    findAll(
        @TenantId() schoolId: string,
        @Query('studentId') studentId?: string,
        @Query('subjectId') subjectId?: string,
        @Query('academicYearId') academicYearId?: string,
    ) {
        return this.gradesService.findAll(schoolId, { studentId, subjectId, academicYearId })
    }

    @Get('student/:studentId/summary')
    @ApiOperation({ summary: 'Get student grade summary' })
    @RequirePermission(Permission.READ_GRADE)
    getStudentSummary(@Param('studentId') studentId: string, @TenantId() schoolId: string) {
        return this.gradesService.getStudentGradeSummary(studentId, schoolId)
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get grade record' })
    @RequirePermission(Permission.READ_GRADE)
    findOne(@Param('id') id: string, @TenantId() schoolId: string) {
        return this.gradesService.findById(id, schoolId)
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update a grade record' })
    @RequirePermission(Permission.UPDATE_GRADE)
    update(@Param('id') id: string, @TenantId() schoolId: string, @Body() dto: UpdateGradeDto) {
        return this.gradesService.update(id, schoolId, dto)
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete a grade record' })
    @RequirePermission(Permission.DELETE_GRADE)
    remove(@Param('id') id: string, @TenantId() schoolId: string) {
        return this.gradesService.remove(id, schoolId)
    }
}
