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
  UnauthorizedException,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { TeachersService } from './teachers.service'
import { CreateTeacherDto, UpdateTeacherDto, AssignClassDto, UpdateTeacherProfileDto } from './dto'
import { PaginationDto } from '../../common/dto'
import { RequirePermission, TenantId, CampusId, CurrentUser, TeacherId } from '../../common/decorators'
import { TenantGuard } from '../../common/guards'
import { Permission } from '../../common/constants'

@ApiTags('Teachers')
@ApiBearerAuth()
@Controller('teachers')
@UseGuards(TenantGuard)
export class TeachersController {
  constructor(private readonly teachersService: TeachersService) {}

  @Post()
  @RequirePermission(Permission.CREATE_TEACHER)
  @ApiOperation({ summary: 'Create a new teacher' })
  @ApiResponse({ status: 201, description: 'Teacher created' })
  create(@TenantId() schoolId: string, @CampusId() campusId: string | undefined, @Body() dto: CreateTeacherDto) {
    return this.teachersService.create(schoolId, dto, campusId)
  }

  @Get()
  @RequirePermission(Permission.READ_TEACHER)
  @ApiOperation({ summary: 'List teachers for current school' })
  @ApiResponse({ status: 200, description: 'Paginated list of teachers' })
  findAll(@TenantId() schoolId: string, @CampusId() campusId: string | undefined, @Query() query: PaginationDto) {
    return this.teachersService.findAll(schoolId, query, campusId)
  }

  // ─── My Classes (teacher self-service) ───────────────────────────────

  @Get('my-classes')
  @ApiOperation({ summary: 'Get classes assigned to the currently logged-in teacher' })
  @ApiResponse({ status: 200, description: 'List of teacher class assignments' })
  getMyClasses(
    @TenantId() schoolId: string,
    @TeacherId() teacherId: string | null,
    @Query('academicYearId') academicYearId?: string,
  ) {
    if (!teacherId) return []
    return this.teachersService.getMyClasses(teacherId, schoolId, academicYearId)
  }

  // ─── Teacher Profile Self-Service ────────────────────────────────────

  @Get('me')
  @ApiOperation({ summary: 'Get the currently logged-in teacher profile' })
  @ApiResponse({ status: 200, description: 'Teacher profile' })
  getMyProfile(@TenantId() schoolId: string, @TeacherId() teacherId: string | null) {
    if (!teacherId) throw new UnauthorizedException('No teacher profile linked to this account')
    return this.teachersService.getMyProfile(teacherId, schoolId)
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update teacher own profile (limited fields)' })
  @ApiResponse({ status: 200, description: 'Updated profile' })
  updateMyProfile(
    @TenantId() schoolId: string,
    @TeacherId() teacherId: string | null,
    @Body() dto: UpdateTeacherProfileDto,
  ) {
    if (!teacherId) throw new UnauthorizedException('No teacher profile linked to this account')
    return this.teachersService.updateMyProfile(teacherId, schoolId, dto)
  }

  // ─── By ID ───────────────────────────────────────────────────────────

  @Get(':id')
  @RequirePermission(Permission.READ_TEACHER)
  @ApiOperation({ summary: 'Get teacher by ID' })
  @ApiResponse({ status: 200, description: 'Teacher details' })
  findById(@Param('id') id: string, @TenantId() schoolId: string) {
    return this.teachersService.findById(id, schoolId)
  }

  @Patch(':id')
  @RequirePermission(Permission.UPDATE_TEACHER)
  @ApiOperation({ summary: 'Update a teacher' })
  @ApiResponse({ status: 200, description: 'Teacher updated' })
  update(@Param('id') id: string, @TenantId() schoolId: string, @Body() dto: UpdateTeacherDto) {
    return this.teachersService.update(id, schoolId, dto)
  }

  @Delete(':id')
  @RequirePermission(Permission.DELETE_TEACHER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a teacher' })
  @ApiResponse({ status: 204, description: 'Teacher deleted' })
  remove(@Param('id') id: string, @TenantId() schoolId: string) {
    return this.teachersService.remove(id, schoolId)
  }

  // ─── Class Assignments ───────────────────────────────────────────────

  @Get(':id/class-assignments')
  @RequirePermission(Permission.READ_TEACHER)
  @ApiOperation({ summary: 'Get class assignments for a teacher (admin view)' })
  @ApiResponse({ status: 200, description: 'List of class assignments' })
  getClassAssignments(
    @Param('id') id: string,
    @TenantId() schoolId: string,
    @Query('academicYearId') academicYearId?: string,
  ) {
    return this.teachersService.getClassAssignments(id, schoolId, academicYearId)
  }

  @Post(':id/class-assignments')
  @RequirePermission(Permission.UPDATE_TEACHER)
  @ApiOperation({ summary: 'Assign a class/section to a teacher' })
  @ApiResponse({ status: 201, description: 'Class assigned to teacher' })
  assignClass(@Param('id') id: string, @TenantId() schoolId: string, @Body() dto: AssignClassDto) {
    return this.teachersService.assignClass(id, schoolId, dto)
  }

  @Delete(':id/class-assignments/:assignmentId')
  @RequirePermission(Permission.UPDATE_TEACHER)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a class assignment from a teacher' })
  @ApiResponse({ status: 204, description: 'Assignment removed' })
  removeClassAssignment(
    @Param('id') id: string,
    @Param('assignmentId') assignmentId: string,
    @TenantId() schoolId: string,
  ) {
    return this.teachersService.removeClassAssignment(assignmentId, id, schoolId)
  }

  @Patch(':id/sync-classes')
  @RequirePermission(Permission.UPDATE_TEACHER)
  @ApiOperation({ summary: 'Sync teacher teaching assignments' })
  @ApiResponse({ status: 200, description: 'Assignments synced' })
  syncClasses(
    @Param('id') id: string,
    @TenantId() schoolId: string,
    @Body() body: {
      academicYearId?: string
      assignments?: Array<{ classId: string; sectionIds?: string[]; subjectIds?: string[]; academicYearId?: string }>
      classIds?: string[]
    },
  ) {
    // Support both new { assignments } and legacy { classIds } format
    const assignments = body.assignments ?? (body.classIds || []).map((cid) => ({ classId: cid, subjectIds: [] }))
    return this.teachersService.syncClasses(id, schoolId, body.academicYearId, assignments)
  }
}
