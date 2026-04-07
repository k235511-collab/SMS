import { Controller, Get, Query, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { AnalyticsService } from './analytics.service'
import { TenantId, RequirePermission, CampusId } from '../../common/decorators'
import { TenantGuard } from '../../common/guards'
import { Permission } from '../../common/constants'

// Dashboard overview + analytics endpoints
@ApiTags('Analytics')
@ApiBearerAuth()
@Controller('analytics')
@UseGuards(TenantGuard)
@RequirePermission(Permission.READ_ANALYTICS)
export class AnalyticsController {
    constructor(private readonly analyticsService: AnalyticsService) { }

    @Get('overview')
    @ApiOperation({ summary: 'Get comprehensive dashboard overview' })
    getDashboardOverview(
        @TenantId() schoolId: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('academicYearId') academicYearId?: string,
        @CampusId() campusId?: string,
    ) {
        return this.analyticsService.getDashboardOverview(schoolId, startDate, endDate, campusId, academicYearId)
    }

    @Get('dashboard')
    @ApiOperation({ summary: 'Get dashboard metrics' })
    getDashboardMetrics(@TenantId() schoolId: string, @CampusId() campusId?: string) {
        return this.analyticsService.getDashboardMetrics(schoolId, campusId)
    }

    @Get('attendance-trend')
    @ApiOperation({ summary: 'Get attendance trend' })
    getAttendanceTrend(@TenantId() schoolId: string, @Query('days') days?: string, @CampusId() campusId?: string) {
        return this.analyticsService.getAttendanceTrend(schoolId, Number(days) || 30, campusId)
    }

    @Get('grade-distribution')
    @ApiOperation({ summary: 'Get grade distribution' })
    getGradeDistribution(@TenantId() schoolId: string, @CampusId() campusId?: string) {
        return this.analyticsService.getGradeDistribution(schoolId, campusId)
    }

    @Get('finance-summary')
    @ApiOperation({ summary: 'Get finance summary' })
    getFinanceSummary(@TenantId() schoolId: string, @CampusId() campusId?: string) {
        return this.analyticsService.getFinanceSummary(schoolId, campusId)
    }
}
