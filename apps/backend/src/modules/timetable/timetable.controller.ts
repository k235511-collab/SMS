import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger'
import { TimetableService } from './timetable.service'
import {
  CreateTimetableSlotDto,
  UpdateTimetableSlotDto,
  CreatePeriodTemplateDto,
  UpdatePeriodTemplateDto,
} from './dto'
import { RequirePermission, TenantId, CampusId, TeacherId } from '../../common/decorators'
import { TenantGuard } from '../../common/guards'
import { Permission } from '../../common/constants'

@ApiTags('Timetable')
@ApiBearerAuth()
@Controller('timetable')
@UseGuards(TenantGuard)
export class TimetableController {
  constructor(private readonly service: TimetableService) {}

  // ─── Period Template Routes ───────────────────────────────────────────────

  @Get('periods')
  @RequirePermission(Permission.READ_TIMETABLE)
  @ApiOperation({ summary: 'Get period templates for the school' })
  findPeriods(@TenantId() schoolId: string, @CampusId() campusId?: string) {
    return this.service.findPeriods(schoolId, campusId)
  }

  @Post('periods')
  @RequirePermission(Permission.CREATE_TIMETABLE)
  @ApiOperation({ summary: 'Create a period template' })
  createPeriod(@TenantId() schoolId: string, @Body() dto: CreatePeriodTemplateDto, @CampusId() campusId?: string) {
    return this.service.createPeriod(schoolId, dto, campusId)
  }

  @Post('periods/reset')
  @RequirePermission(Permission.UPDATE_TIMETABLE)
  @ApiOperation({ summary: 'Reset period templates to defaults' })
  resetPeriods(@TenantId() schoolId: string, @CampusId() campusId?: string) {
    return this.service.resetPeriods(schoolId, campusId)
  }

  @Patch('periods/:id')
  @RequirePermission(Permission.UPDATE_TIMETABLE)
  @ApiOperation({ summary: 'Update a period template' })
  updatePeriod(@Param('id') id: string, @TenantId() schoolId: string, @Body() dto: UpdatePeriodTemplateDto) {
    return this.service.updatePeriod(id, schoolId, dto)
  }

  @Delete('periods/:id')
  @RequirePermission(Permission.DELETE_TIMETABLE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a period template' })
  removePeriod(@Param('id') id: string, @TenantId() schoolId: string) {
    return this.service.removePeriod(id, schoolId)
  }

  // ─── Teacher Free Time ────────────────────────────────────────────────────

  @Get('teachers/availability')
  @RequirePermission(Permission.READ_TIMETABLE)
  @ApiOperation({ summary: 'Get teachers with free/busy status for a time slot' })
  @ApiQuery({ name: 'dayOfWeek', type: Number })
  @ApiQuery({ name: 'startTime', type: String })
  @ApiQuery({ name: 'endTime', type: String })
  findFreeTeachers(
    @TenantId() schoolId: string,
    @Query('dayOfWeek') dayOfWeek: string,
    @Query('startTime') startTime: string,
    @Query('endTime') endTime: string,
    @CampusId() campusId?: string,
  ) {
    return this.service.findFreeTeachers(schoolId, parseInt(dayOfWeek), startTime, endTime, campusId)
  }

  @Get('teacher/:teacherId/schedule')
  @RequirePermission(Permission.READ_TIMETABLE)
  @ApiOperation({ summary: 'Get full weekly schedule for a teacher' })
  getTeacherSchedule(
    @Param('teacherId') teacherId: string,
    @TenantId() schoolId: string,
    @TeacherId() requesterTeacherId?: string | null,
  ) {
    return this.service.getTeacherSchedule(teacherId, schoolId, requesterTeacherId)
  }

  // ─── Timetable Slot Routes ────────────────────────────────────────────────

  @Post()
  @RequirePermission(Permission.CREATE_TIMETABLE)
  @ApiOperation({ summary: 'Create a timetable slot' })
  @ApiResponse({ status: 201, description: 'Timetable slot created' })
  create(
    @TenantId() schoolId: string,
    @Body() dto: CreateTimetableSlotDto,
    @CampusId() campusId?: string,
  ) {
    return this.service.create(schoolId, dto, campusId)
  }

  @Get('section/:sectionId')
  @RequirePermission(Permission.READ_TIMETABLE)
  @ApiOperation({ summary: 'Get timetable for a section' })
  @ApiResponse({ status: 200, description: 'Section timetable' })
  findBySection(
    @Param('sectionId') sectionId: string,
    @TenantId() schoolId: string,
    @TeacherId() requesterTeacherId?: string | null,
  ) {
    return this.service.findBySection(sectionId, schoolId, requesterTeacherId)
  }

  @Get('teacher/:teacherId')
  @RequirePermission(Permission.READ_TIMETABLE)
  @ApiOperation({ summary: 'Get timetable for a teacher' })
  @ApiResponse({ status: 200, description: 'Teacher timetable' })
  findByTeacher(
    @Param('teacherId') teacherId: string,
    @TenantId() schoolId: string,
    @TeacherId() requesterTeacherId?: string | null,
  ) {
    return this.service.findByTeacher(teacherId, schoolId, requesterTeacherId)
  }

  @Patch(':id')
  @RequirePermission(Permission.UPDATE_TIMETABLE)
  @ApiOperation({ summary: 'Update a timetable slot' })
  @ApiResponse({ status: 200, description: 'Timetable slot updated' })
  update(
    @Param('id') id: string,
    @TenantId() schoolId: string,
    @Body() dto: UpdateTimetableSlotDto,
    @CampusId() campusId?: string,
  ) {
    return this.service.update(id, schoolId, dto, campusId)
  }

  @Delete(':id')
  @RequirePermission(Permission.DELETE_TIMETABLE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a timetable slot' })
  @ApiResponse({ status: 204, description: 'Timetable slot deleted' })
  remove(@Param('id') id: string, @TenantId() schoolId: string) {
    return this.service.remove(id, schoolId)
  }
}
