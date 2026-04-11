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
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Res,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { FileInterceptor } from '@nestjs/platform-express'
import { Response } from 'express'
import { StudentsService } from './students.service'
import { CreateStudentDto, UpdateStudentDto, GetStudentsDto, StudentStatsDto, PromoteStudentsDto, MarkAsLeftDto } from './dto'
import { RequirePermission, TenantId, CampusId, TeacherId, CurrentUser } from '../../common/decorators'
import { TenantGuard } from '../../common/guards'
import { Permission } from '../../common/constants'

@ApiTags('Students')
@ApiBearerAuth()
@Controller('students')
@UseGuards(TenantGuard)
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) { }

  @Post()
  @RequirePermission(Permission.CREATE_STUDENT)
  @ApiOperation({ summary: 'Create a new student' })
  @ApiResponse({ status: 201, description: 'Student created' })
  create(@TenantId() schoolId: string, @CampusId() campusId: string | undefined, @Body() dto: CreateStudentDto) {
    return this.studentsService.create(schoolId, dto, campusId)
  }

  @Post('promote/preview')
  @RequirePermission(Permission.UPDATE_STUDENT)
  @ApiOperation({ summary: 'Preview pending fees for students before promotion' })
  @ApiResponse({ status: 200, description: 'List of students with their pending fee amounts' })
  promotePreview(@TenantId() schoolId: string, @Body() body: { studentIds: string[] }) {
    return this.studentsService.getPromotionPreview(schoolId, body.studentIds)
  }

  @Post('promote')
  @RequirePermission(Permission.UPDATE_STUDENT)
  @ApiOperation({ summary: 'Promote selected students to next academic year' })
  @ApiResponse({ status: 200, description: 'Promotion result summary' })
  promote(@TenantId() schoolId: string, @Body() dto: PromoteStudentsDto) {
    return this.studentsService.promote(schoolId, dto)
  }

  @Get('import/template')
  @RequirePermission(Permission.CREATE_STUDENT)
  @ApiOperation({ summary: 'Download students bulk import template' })
  @ApiResponse({ status: 200, description: 'Excel template file' })
  async downloadImportTemplate(
    @TenantId() schoolId: string,
    @CampusId() campusId: string | undefined,
    @Res() res: Response,
  ) {
    const workbook = await this.studentsService.generateImportTemplateWorkbook(schoolId, campusId)
    const fileName = `students-import-template-${new Date().toISOString().slice(0, 10)}.xlsx`
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`)
    return res.send(workbook)
  }

  @Post('import/preview')
  @UseInterceptors(FileInterceptor('file'))
  @RequirePermission(Permission.CREATE_STUDENT)
  @ApiOperation({ summary: 'Preview students import from uploaded Excel file' })
  @ApiResponse({ status: 200, description: 'Validation result with valid rows and errors' })
  previewImport(
    @TenantId() schoolId: string,
    @CampusId() campusId: string | undefined,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file?.buffer) {
      throw new BadRequestException('Excel file is required')
    }
    return this.studentsService.previewImportStudentsWorkbook(schoolId, campusId, file.buffer)
  }

  @Post('import/commit')
  @UseInterceptors(FileInterceptor('file'))
  @RequirePermission(Permission.CREATE_STUDENT)
  @ApiOperation({ summary: 'Import students from uploaded Excel file' })
  @ApiResponse({ status: 200, description: 'Import execution summary' })
  commitImport(
    @TenantId() schoolId: string,
    @CampusId() campusId: string | undefined,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file?.buffer) {
      throw new BadRequestException('Excel file is required')
    }
    return this.studentsService.commitImportStudentsWorkbook(schoolId, campusId, file.buffer)
  }

  @Get('export')
  @RequirePermission(Permission.READ_STUDENT)
  @ApiOperation({ summary: 'Export students to Excel (respects active filters)' })
  @ApiResponse({ status: 200, description: 'Excel export file' })
  async exportStudents(
    @TenantId() schoolId: string,
    @CampusId() campusId: string | undefined,
    @Query() query: GetStudentsDto,
    @Res() res: Response,
    @TeacherId() teacherId?: string | null,
    @CurrentUser() user?: { userId?: string; id?: string; sub?: string } | null,
  ) {
    const workbook = await this.studentsService.generateExportWorkbook(
      schoolId,
      query,
      campusId,
      teacherId,
      user?.userId ?? user?.id ?? user?.sub ?? null,
    )
    const fileName = `students-export-${new Date().toISOString().slice(0, 10)}.xlsx`
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`)
    return res.send(workbook)
  }

  @Get('stats')
  @RequirePermission(Permission.READ_STUDENT)
  @ApiOperation({ summary: 'Get student statistics' })
  @ApiResponse({ status: 200, description: 'Student statistics', type: StudentStatsDto })
  getStats(
    @TenantId() schoolId: string,
    @CampusId() campusId: string | undefined,
    @Query() query: GetStudentsDto,
    @TeacherId() teacherId?: string | null,
    @CurrentUser() user?: { userId?: string; id?: string; sub?: string } | null,
  ) {
    return this.studentsService.getStats(schoolId, query, campusId, teacherId, user?.userId ?? user?.id ?? user?.sub ?? null)
  }

  @Get()
  @RequirePermission(Permission.READ_STUDENT)
  @ApiOperation({ summary: 'List students for current school' })
  @ApiResponse({ status: 200, description: 'Paginated list of students' })
  findAll(
    @TenantId() schoolId: string,
    @CampusId() campusId: string | undefined,
    @Query() query: GetStudentsDto,
    @TeacherId() teacherId?: string | null,
    @CurrentUser() user?: { userId?: string; id?: string; sub?: string } | null,
  ) {
    return this.studentsService.findAll(schoolId, query, campusId, teacherId, user?.userId ?? user?.id ?? user?.sub ?? null)
  }

  @Get(':id')
  @RequirePermission(Permission.READ_STUDENT)
  @ApiOperation({ summary: 'Get student by ID' })
  @ApiResponse({ status: 200, description: 'Student details' })
  findById(
    @Param('id') id: string,
    @TenantId() schoolId: string,
    @CampusId() campusId: string | undefined,
    @TeacherId() teacherId?: string | null,
    @CurrentUser() user?: { userId?: string; id?: string; sub?: string } | null,
  ) {
    return this.studentsService.findById(id, schoolId, campusId, teacherId, user?.userId ?? user?.id ?? user?.sub ?? null)
  }

  @Get(':id/attendance/monthly')
  @RequirePermission(Permission.READ_STUDENT)
  @ApiOperation({ summary: 'Get student attendance grouped by month' })
  @ApiResponse({ status: 200, description: 'Monthly attendance data with daily details' })
  getMonthlyAttendance(
    @Param('id') id: string,
    @TenantId() schoolId: string,
    @CampusId() campusId: string | undefined,
    @TeacherId() teacherId: string | undefined,
    @CurrentUser() user?: { userId?: string; id?: string; sub?: string } | null,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.studentsService.getMonthlyAttendance(id, schoolId, campusId, startDate, endDate, teacherId, user?.userId ?? user?.id ?? user?.sub ?? null)
  }

  @Patch(':id')
  @RequirePermission(Permission.UPDATE_STUDENT)
  @ApiOperation({ summary: 'Update a student' })
  @ApiResponse({ status: 200, description: 'Student updated' })
  update(
    @Param('id') id: string,
    @TenantId() schoolId: string,
    @CampusId() campusId: string | undefined,
    @Body() dto: UpdateStudentDto,
    @TeacherId() teacherId?: string | null,
    @CurrentUser() user?: { userId?: string; id?: string; sub?: string } | null,
  ) {
    return this.studentsService.update(id, schoolId, dto, campusId, teacherId, user?.userId ?? user?.id ?? user?.sub ?? null)
  }

  @Patch(':id/mark-as-left')
  @RequirePermission(Permission.UPDATE_STUDENT)
  @ApiOperation({ summary: 'Mark a student as left school' })
  @ApiResponse({ status: 200, description: 'Student marked as left' })
  markAsLeft(
    @Param('id') id: string,
    @TenantId() schoolId: string,
    @CampusId() campusId: string | undefined,
    @Body() dto: MarkAsLeftDto,
    @TeacherId() teacherId?: string | null,
    @CurrentUser() user?: { userId?: string; id?: string; sub?: string } | null,
  ) {
    return this.studentsService.markAsLeft(id, schoolId, dto, campusId, teacherId, user?.userId ?? user?.id ?? user?.sub ?? null)
  }

  @Delete(':id')
  @RequirePermission(Permission.DELETE_STUDENT)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a student' })
  @ApiResponse({ status: 204, description: 'Student deleted' })
  remove(
    @Param('id') id: string,
    @TenantId() schoolId: string,
    @CampusId() campusId: string | undefined,
    @TeacherId() teacherId?: string | null,
    @CurrentUser() user?: { userId?: string; id?: string; sub?: string } | null,
  ) {
    return this.studentsService.remove(id, schoolId, campusId, teacherId, user?.userId ?? user?.id ?? user?.sub ?? null)
  }

  @Patch(':id/restore')
  @RequirePermission(Permission.UPDATE_STUDENT)
  @ApiOperation({ summary: 'Restore a deleted student' })
  @ApiResponse({ status: 200, description: 'Student restored' })
  restore(
    @Param('id') id: string,
    @TenantId() schoolId: string,
    @CampusId() campusId: string | undefined,
    @TeacherId() teacherId?: string | null,
    @CurrentUser() user?: { userId?: string; id?: string; sub?: string } | null,
  ) {
    return this.studentsService.restore(id, schoolId, campusId, teacherId, user?.userId ?? user?.id ?? user?.sub ?? null)
  }

  @Delete(':id/permanent')
  @RequirePermission(Permission.DELETE_STUDENT)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Permanently delete a student' })
  @ApiResponse({ status: 204, description: 'Student permanently deleted' })
  deletePermanently(
    @Param('id') id: string,
    @TenantId() schoolId: string,
    @CampusId() campusId: string | undefined,
    @TeacherId() teacherId?: string | null,
    @CurrentUser() user?: { userId?: string; id?: string; sub?: string } | null,
  ) {
    return this.studentsService.deletePermanently(id, schoolId, campusId, teacherId, user?.userId ?? user?.id ?? user?.sub ?? null)
  }
}
