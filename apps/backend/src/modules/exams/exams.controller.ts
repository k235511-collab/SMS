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
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { ExamsService } from './exams.service'
import {
  CreateExamDto,
  UpdateExamDto,
  UpdateExamStatusDto,
  AssignTeacherDto,
  RecordResultDto,
  BulkRecordResultDto,
  GetExamsDto,
  GetExamStudentResultsDto,
  UpsertExamPaperDto,
} from './dto'
import { PaginationDto } from '../../common/dto'
import { RequirePermission, TenantId, CampusId, CurrentUser, TeacherId } from '../../common/decorators'
import { TenantGuard } from '../../common/guards'
import { Permission } from '../../common/constants'

@ApiTags('Exams')
@ApiBearerAuth()
@Controller('exams')
@UseGuards(TenantGuard)
export class ExamsController {
  constructor(private readonly examsService: ExamsService) { }

  @Post()
  @RequirePermission(Permission.CREATE_EXAM)
  @ApiOperation({ summary: 'Create a new exam' })
  @ApiResponse({ status: 201, description: 'Exam created' })
  create(
    @TenantId() schoolId: string,
    @Body() dto: CreateExamDto,
    @CampusId() campusId?: string,
    @TeacherId() teacherId?: string | null,
    @CurrentUser() user?: { userId?: string; id?: string; sub?: string } | null,
  ) {
    return this.examsService.createExam(schoolId, dto, campusId, teacherId, user?.userId ?? user?.id ?? user?.sub ?? null)
  }

  @Get()
  @RequirePermission(Permission.READ_EXAM)
  @ApiOperation({ summary: 'List all exams for school' })
  @ApiResponse({ status: 200, description: 'Paginated list of exams' })
  findAll(
    @TenantId() schoolId: string,
    @Query() query: GetExamsDto,
    @CampusId() campusId?: string,
    @TeacherId() teacherId?: string | null,
    @CurrentUser() user?: { userId?: string; id?: string; sub?: string } | null,
  ) {
    return this.examsService.findAllExams(schoolId, query, campusId, teacherId, user?.userId ?? user?.id ?? user?.sub ?? null)
  }

  @Get('student-results')
  @RequirePermission(Permission.READ_EXAM)
  @ApiOperation({ summary: 'Get filtered student results list for exams page tab' })
  @ApiResponse({ status: 200, description: 'Paginated student results list' })
  getExamStudentResults(
    @TenantId() schoolId: string,
    @Query() query: GetExamStudentResultsDto,
    @CampusId() campusId?: string,
    @TeacherId() teacherId?: string | null,
    @CurrentUser() user?: { userId?: string; id?: string; sub?: string } | null,
  ) {
    return this.examsService.getExamStudentResultsList(schoolId, query, campusId, teacherId, user?.userId ?? user?.id ?? user?.sub ?? null)
  }

  // ─── Grading Scales ───────────────────────────────────────────

  @Get('grading-scales')
  @RequirePermission(Permission.READ_EXAM)
  @ApiOperation({ summary: 'Get all grading scales for school' })
  @ApiResponse({ status: 200, description: 'List of grading scales' })
  getGradingScales(@TenantId() schoolId: string) {
    return this.examsService.getGradingScales(schoolId)
  }

  @Post('grading-scales')
  @RequirePermission(Permission.UPDATE_EXAM)
  @ApiOperation({ summary: 'Create a grading scale' })
  @ApiResponse({ status: 201, description: 'Grading scale created' })
  createGradingScale(@TenantId() schoolId: string, @Body() data: { name: string; minPercent: number; maxPercent: number; gpa?: number }) {
    return this.examsService.createGradingScale(schoolId, data)
  }

  @Patch('grading-scales/:id')
  @RequirePermission(Permission.UPDATE_EXAM)
  @ApiOperation({ summary: 'Update a grading scale' })
  @ApiResponse({ status: 200, description: 'Grading scale updated' })
  updateGradingScale(@Param('id') id: string, @TenantId() schoolId: string, @Body() data: Partial<{ name: string; minPercent: number; maxPercent: number; gpa?: number }>) {
    return this.examsService.updateGradingScale(id, schoolId, data)
  }

  @Delete('grading-scales/:id')
  @RequirePermission(Permission.UPDATE_EXAM)
  @ApiOperation({ summary: 'Delete a grading scale' })
  @ApiResponse({ status: 200, description: 'Grading scale deleted' })
  deleteGradingScale(@Param('id') id: string, @TenantId() schoolId: string) {
    return this.examsService.deleteGradingScale(id, schoolId)
  }

  // ─── Exam Paper Builder ───────────────────────────────────────

  @Get(':id/paper')
  @RequirePermission(Permission.READ_EXAM)
  @ApiOperation({ summary: 'Get the exam paper for an exam' })
  @ApiResponse({ status: 200, description: 'Exam paper with sections, questions, and options' })
  getExamPaper(@Param('id') examId: string, @TenantId() schoolId: string) {
    return this.examsService.getExamPaper(examId, schoolId)
  }

  @Post(':id/paper')
  @RequirePermission(Permission.UPDATE_EXAM)
  @ApiOperation({ summary: 'Create or update the exam paper' })
  @ApiResponse({ status: 201, description: 'Exam paper upserted' })
  upsertExamPaper(
    @Param('id') examId: string,
    @TenantId() schoolId: string,
    @Body() dto: UpsertExamPaperDto,
  ) {
    return this.examsService.upsertExamPaper(examId, schoolId, dto)
  }

  @Delete(':id/paper')
  @RequirePermission(Permission.DELETE_EXAM)
  @ApiOperation({ summary: 'Delete the exam paper' })
  @ApiResponse({ status: 200, description: 'Exam paper deleted' })
  deleteExamPaper(@Param('id') examId: string, @TenantId() schoolId: string) {
    return this.examsService.deleteExamPaper(examId, schoolId)
  }

  @Get(':id')
  @RequirePermission(Permission.READ_EXAM)
  @ApiOperation({ summary: 'Get exam by ID with results' })
  @ApiResponse({ status: 200, description: 'Exam details with results' })
  findById(
    @Param('id') id: string,
    @TenantId() schoolId: string,
    @TeacherId() teacherId?: string | null,
    @CurrentUser() user?: { userId?: string; id?: string; sub?: string } | null,
  ) {
    return this.examsService.findExamById(id, schoolId, teacherId, user?.userId ?? user?.id ?? user?.sub ?? null)
  }

  @Patch(':id')
  @RequirePermission(Permission.UPDATE_EXAM)
  @ApiOperation({ summary: 'Update an exam' })
  @ApiResponse({ status: 200, description: 'Exam updated' })
  update(
    @Param('id') id: string,
    @TenantId() schoolId: string,
    @Body() dto: UpdateExamDto,
    @TeacherId() teacherId?: string | null,
    @CurrentUser() user?: { userId?: string; id?: string; sub?: string } | null,
  ) {
    return this.examsService.updateExam(id, schoolId, dto, teacherId, user?.userId ?? user?.id ?? user?.sub ?? null)
  }

  @Patch(':id/status')
  @RequirePermission(Permission.UPDATE_EXAM)
  @ApiOperation({ summary: 'Update exam status' })
  @ApiResponse({ status: 200, description: 'Exam status updated' })
  updateStatus(
    @Param('id') id: string,
    @TenantId() schoolId: string,
    @Body() dto: UpdateExamStatusDto,
    @TeacherId() teacherId?: string | null,
    @CurrentUser() user?: { userId?: string; id?: string; sub?: string } | null,
  ) {
    return this.examsService.updateExamStatus(id, schoolId, dto, teacherId, user?.userId ?? user?.id ?? user?.sub ?? null)
  }

  // ─── Teacher Assignments ───────────────────────────────────────

  @Get(':id/teachers')
  @RequirePermission(Permission.READ_EXAM)
  @ApiOperation({ summary: 'Get teachers assigned to an exam' })
  @ApiResponse({ status: 200, description: 'List of assigned teachers' })
  getExamTeachers(@Param('id') id: string, @TenantId() schoolId: string) {
    return this.examsService.getExamTeachers(id, schoolId)
  }


  @Delete(':id')
  @RequirePermission(Permission.DELETE_EXAM)
  @ApiOperation({ summary: 'Delete an exam' })
  @ApiResponse({ status: 200, description: 'Exam deleted' })
  remove(
    @Param('id') id: string,
    @TenantId() schoolId: string,
    @TeacherId() teacherId?: string | null,
    @CurrentUser() user?: { userId?: string; id?: string; sub?: string } | null,
  ) {
    return this.examsService.deleteExam(id, schoolId, teacherId, user?.userId ?? user?.id ?? user?.sub ?? null)
  }
  @Post(':id/teachers')
  @RequirePermission(Permission.UPDATE_EXAM)
  @ApiOperation({ summary: 'Assign a teacher to an exam' })
  @ApiResponse({ status: 201, description: 'Teacher assigned' })
  assignTeacher(@Param('id') id: string, @TenantId() schoolId: string, @Body() dto: AssignTeacherDto) {
    return this.examsService.assignTeacher(id, schoolId, dto)
  }

  @Delete(':id/teachers/:teacherId')
  @RequirePermission(Permission.UPDATE_EXAM)
  @ApiOperation({ summary: 'Remove a teacher from an exam' })
  @ApiResponse({ status: 200, description: 'Teacher removed' })
  removeTeacher(@Param('id') id: string, @Param('teacherId') teacherId: string, @TenantId() schoolId: string) {
    return this.examsService.removeTeacher(id, teacherId, schoolId)
  }

  @Get('teacher/:teacherId')
  @RequirePermission(Permission.READ_EXAM)
  @ApiOperation({ summary: 'Get exams assigned to a teacher' })
  @ApiResponse({ status: 200, description: 'List of assigned exams' })
  getExamsByTeacher(@Param('teacherId') teacherId: string, @TenantId() schoolId: string) {
    return this.examsService.getExamsByTeacher(teacherId, schoolId)
  }

  // ─── Students & Analytics ──────────────────────────────────────

  @Get(':id/students')
  @RequirePermission(Permission.READ_EXAM)
  @ApiOperation({ summary: 'Get students with result status for an exam' })
  @ApiResponse({ status: 200, description: 'Students with results' })
  getExamStudents(
    @Param('id') id: string,
    @TenantId() schoolId: string,
    @TeacherId() teacherId?: string | null,
    @CurrentUser() user?: { userId?: string; id?: string; sub?: string } | null,
  ) {
    return this.examsService.getExamStudents(id, schoolId, teacherId, user?.userId ?? user?.id ?? user?.sub ?? null)
  }

  @Get(':id/analytics')
  @RequirePermission(Permission.READ_EXAM)
  @ApiOperation({ summary: 'Get exam analytics' })
  @ApiResponse({ status: 200, description: 'Exam analytics' })
  getExamAnalytics(
    @Param('id') id: string,
    @TenantId() schoolId: string,
    @TeacherId() teacherId?: string | null,
    @CurrentUser() user?: { userId?: string; id?: string; sub?: string } | null,
  ) {
    return this.examsService.getExamAnalytics(id, schoolId, teacherId, user?.userId ?? user?.id ?? user?.sub ?? null)
  }

  @Get(':id/can-edit')
  @RequirePermission(Permission.READ_EXAM)
  @ApiOperation({ summary: 'Check if current user can edit results' })
  @ApiResponse({ status: 200, description: 'Can edit status' })
  canEditResults(@Param('id') id: string, @TenantId() schoolId: string, @CurrentUser('id') userId: string) {
    return this.examsService.canUserEditResults(id, userId, schoolId)
  }

  // ─── Results ─────────────────────────────────────────────────

  @Post('results')
  @RequirePermission(Permission.CREATE_EXAM)
  @ApiOperation({ summary: 'Record or update a single result' })
  @ApiResponse({ status: 201, description: 'Result recorded' })
  recordResult(
    @TenantId() schoolId: string,
    @Body() dto: RecordResultDto,
    @TeacherId() teacherId?: string | null,
    @CurrentUser() user?: { userId?: string; id?: string; sub?: string } | null,
  ) {
    return this.examsService.recordResult(schoolId, dto, teacherId, user?.userId ?? user?.id ?? user?.sub ?? null)
  }

  @Post('results/bulk')
  @RequirePermission(Permission.CREATE_EXAM)
  @ApiOperation({ summary: 'Record results in bulk' })
  @ApiResponse({ status: 201, description: 'Results recorded' })
  bulkRecordResults(
    @TenantId() schoolId: string,
    @Body() dto: BulkRecordResultDto,
    @TeacherId() teacherId?: string | null,
    @CurrentUser() user?: { userId?: string; id?: string; sub?: string } | null,
  ) {
    return this.examsService.bulkRecordResults(schoolId, dto, teacherId, user?.userId ?? user?.id ?? user?.sub ?? null)
  }

  @Get('results/:examId')
  @RequirePermission(Permission.READ_EXAM)
  @ApiOperation({ summary: 'Get all results for an exam' })
  @ApiResponse({ status: 200, description: 'Exam results' })
  getResultsByExam(
    @Param('examId') examId: string,
    @TenantId() schoolId: string,
    @TeacherId() teacherId?: string | null,
    @CurrentUser() user?: { userId?: string; id?: string; sub?: string } | null,
  ) {
    return this.examsService.getResultsByExam(examId, schoolId, teacherId, user?.userId ?? user?.id ?? user?.sub ?? null)
  }

  @Get('student-results/:studentId')
  @RequirePermission(Permission.READ_EXAM)
  @ApiOperation({ summary: 'Get all results for a student' })
  @ApiResponse({ status: 200, description: 'Student results' })
  getStudentResults(
    @Param('studentId') studentId: string,
    @TenantId() schoolId: string,
    @TeacherId() teacherId: string | null,
    @CurrentUser() user?: { userId?: string; id?: string; sub?: string } | null,
    @Query('academicYearId') academicYearId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.examsService.getStudentResults(
      studentId,
      schoolId,
      academicYearId,
      startDate,
      endDate,
      teacherId ?? null,
      user?.userId ?? user?.id ?? user?.sub ?? null,
    )
  }

  @Get('student-results/:studentId/summary')
  @RequirePermission(Permission.READ_EXAM)
  @ApiOperation({ summary: 'Get results summary for a student' })
  @ApiResponse({ status: 200, description: 'Student results summary' })
  getStudentResultsSummary(
    @Param('studentId') studentId: string,
    @TenantId() schoolId: string,
    @TeacherId() teacherId: string | null,
    @CurrentUser() user?: { userId?: string; id?: string; sub?: string } | null,
    @Query('academicYearId') academicYearId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.examsService.getStudentResultsSummary(
      studentId,
      schoolId,
      academicYearId,
      startDate,
      endDate,
      teacherId ?? null,
      user?.userId ?? user?.id ?? user?.sub ?? null,
    )
  }


}

