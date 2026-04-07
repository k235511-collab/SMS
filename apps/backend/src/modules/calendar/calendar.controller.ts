import {
    Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { CalendarService } from './calendar.service'
import { TenantId, RequirePermission, CampusId } from '../../common/decorators'
import { TenantGuard } from '../../common/guards'
import { Permission } from '../../common/constants'

@ApiTags('Calendar')
@ApiBearerAuth()
@Controller('calendar')
@UseGuards(TenantGuard)
export class CalendarController {
    constructor(private readonly calendarService: CalendarService) { }

    @Post()
    @ApiOperation({ summary: 'Create a calendar event' })
    @RequirePermission(Permission.CREATE_CALENDAR)
    create(@TenantId() schoolId: string, @Body() dto: any, @CampusId() campusId?: string) {
        return this.calendarService.create(schoolId, dto, undefined, campusId)
    }

    @Get()
    @ApiOperation({ summary: 'List calendar events' })
    @RequirePermission(Permission.READ_CALENDAR)
    findAll(
        @TenantId() schoolId: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
        @Query('type') type?: string,
        @CampusId() campusId?: string,
    ) {
        return this.calendarService.findAll(schoolId, { startDate, endDate, type }, campusId)
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get event details' })
    @RequirePermission(Permission.READ_CALENDAR)
    findOne(@Param('id') id: string, @TenantId() schoolId: string) {
        return this.calendarService.findById(id, schoolId)
    }

    @Patch(':id')
    @ApiOperation({ summary: 'Update an event' })
    @RequirePermission(Permission.UPDATE_CALENDAR)
    update(@Param('id') id: string, @TenantId() schoolId: string, @Body() dto: any) {
        return this.calendarService.update(id, schoolId, dto)
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete an event' })
    @RequirePermission(Permission.DELETE_CALENDAR)
    remove(@Param('id') id: string, @TenantId() schoolId: string) {
        return this.calendarService.remove(id, schoolId)
    }
}
