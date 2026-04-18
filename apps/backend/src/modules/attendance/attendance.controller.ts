import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger'
import { AttendanceService } from './attendance.service'
import { MarkAttendanceDto, AttendanceQueryDto } from './dto'
import { RequirePermission, TenantId, CampusId, TeacherId } from '../../common/decorators'
import { TenantGuard } from '../../common/guards'
import { Permission } from '../../common/constants'

@ApiTags('Attendance')
@ApiBearerAuth()
@Controller('attendance')
@UseGuards(TenantGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) { }

  @Post()
  @RequirePermission(Permission.CREATE_ATTENDANCE)
  @ApiOperation({ summary: 'Mark attendance for multiple students' })
  @ApiResponse({ status: 201, description: 'Attendance marked successfully' })
  mark(
    @TenantId() schoolId: string,
    @Body() dto: MarkAttendanceDto,
    @TeacherId() teacherId?: string | null,
    @CampusId() campusId?: string,
  ) {
    return this.attendanceService.markAttendance(schoolId, dto, teacherId, campusId)
  }

  @Get()
  @RequirePermission(Permission.READ_ATTENDANCE)
  @ApiOperation({ summary: 'List attendance records' })
  @ApiResponse({ status: 200, description: 'Paginated attendance records' })
  findAll(@TenantId() schoolId: string, @CampusId() campusId: string | undefined, @Query() query: AttendanceQueryDto, @TeacherId() teacherId?: string | null) {
    return this.attendanceService.findAll(schoolId, query, campusId, teacherId)
  }

  @Get('student/:studentId')
  @RequirePermission(Permission.READ_ATTENDANCE)
  @ApiOperation({ summary: 'Get attendance for a student' })
  @ApiResponse({ status: 200, description: 'Student attendance records' })
  findByStudent(
    @Param('studentId') studentId: string,
    @TenantId() schoolId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @TeacherId() teacherId?: string | null,
  ) {
    return this.attendanceService.findByStudent(studentId, schoolId, startDate, endDate, teacherId)
  }

  @Get('section-students')
  @RequirePermission(Permission.READ_ATTENDANCE)
  @ApiOperation({ summary: 'Get active students for a section (for attendance marking)' })
  @ApiResponse({ status: 200, description: 'List of active students in the section' })
  @ApiQuery({ name: 'sectionId', required: true })
  getSectionStudents(
    @TenantId() schoolId: string,
    @Query('sectionId') sectionId: string,
    @TeacherId() teacherId?: string | null,
  ) {
    return this.attendanceService.getSectionStudents(schoolId, sectionId, teacherId)
  }

  @Get('report')
  @RequirePermission(Permission.READ_ATTENDANCE)
  @ApiOperation({ summary: 'Get attendance report for a section' })
  @ApiResponse({ status: 200, description: 'Attendance report with summaries' })
  @ApiQuery({ name: 'sectionId', required: true })
  @ApiQuery({ name: 'startDate', required: true })
  @ApiQuery({ name: 'endDate', required: true })
  getReport(
    @TenantId() schoolId: string,
    @Query('sectionId') sectionId: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @TeacherId() teacherId?: string | null,
  ) {
    return this.attendanceService.getReport(schoolId, sectionId, startDate, endDate, teacherId)
  }
}
