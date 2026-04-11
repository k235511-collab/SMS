import { Body, Controller, Get, Param, Put, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { ReportsService } from './reports.service'
import { TenantId, RequirePermission } from '../../common/decorators'
import { TenantGuard } from '../../common/guards'
import { Permission } from '../../common/constants'
import { UpsertStudentReportTemplateDto } from './dto'

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
@UseGuards(TenantGuard)
@RequirePermission(Permission.READ_REPORT)
export class ReportsController {
    constructor(private readonly reportsService: ReportsService) { }

    @Get()
    @ApiOperation({ summary: 'List available report types' })
    getAvailableReports() {
        return this.reportsService.getAvailableReports()
    }

    @Get('student/:studentId')
    @ApiOperation({ summary: 'Generate student report card' })
    generateStudentReport(@Param('studentId') studentId: string, @TenantId() schoolId: string) {
        return this.reportsService.generateStudentReport(schoolId, studentId)
    }

    @Get('class/:classId')
    @ApiOperation({ summary: 'Generate class report' })
    generateClassReport(
        @Param('classId') classId: string,
        @TenantId() schoolId: string,
        @Query('sectionId') sectionId?: string,
    ) {
        return this.reportsService.generateClassReport(schoolId, classId, sectionId)
    }

    @Get('attendance')
    @ApiOperation({ summary: 'Generate attendance report for a section and date range' })
    generateAttendanceReport(
        @TenantId() schoolId: string,
        @Query('sectionId') sectionId: string,
        @Query('startDate') startDate: string,
        @Query('endDate') endDate: string,
    ) {
        return this.reportsService.generateAttendanceReport(schoolId, sectionId, startDate, endDate)
    }

    @Get('financial')
    @ApiOperation({ summary: 'Generate financial report summary' })
    generateFinancialReport(
        @TenantId() schoolId: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        return this.reportsService.generateFinancialReport(schoolId, startDate, endDate)
    }

    @Get('student-card-templates')
    @ApiOperation({ summary: 'List student report card templates with saved school overrides' })
    getStudentCardTemplates(@TenantId() schoolId: string) {
        return this.reportsService.getStudentCardTemplates(schoolId)
    }

    @Put('student-card-templates/:templateKey')
    @ApiOperation({ summary: 'Create or update a student report card template override' })
    saveStudentCardTemplate(
        @TenantId() schoolId: string,
        @Param('templateKey') templateKey: string,
        @Body() payload: UpsertStudentReportTemplateDto,
    ) {
        return this.reportsService.saveStudentCardTemplate(schoolId, templateKey, payload)
    }
}
