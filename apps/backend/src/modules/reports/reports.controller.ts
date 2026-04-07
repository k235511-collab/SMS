import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { ReportsService } from './reports.service'
import { TenantId, RequirePermission } from '../../common/decorators'
import { TenantGuard } from '../../common/guards'
import { Permission } from '../../common/constants'

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
    generateClassReport(@Param('classId') classId: string, @TenantId() schoolId: string) {
        return this.reportsService.generateClassReport(schoolId, classId)
    }
}
