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
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { AcademicsService } from './academics.service'
import {
  CreateClassDto,
  UpdateClassDto,
  CreateSectionDto,
  UpdateSectionDto,
  CreateSubjectDto,
  UpdateSubjectDto,
  AssignSubjectToClassDto,
} from './dto'
import { PaginationDto } from '../../common/dto'
import { RequirePermission, TenantId, CampusId } from '../../common/decorators'
import { TenantGuard } from '../../common/guards'
import { Permission } from '../../common/constants'

@ApiTags('Academics')
@ApiBearerAuth()
@Controller('academics')
@UseGuards(TenantGuard)
export class AcademicsController {
  constructor(private readonly academicsService: AcademicsService) { }

  // ─── Classes ───────────────────────────────────────────────────

  @Post('classes')
  @RequirePermission(Permission.CREATE_ACADEMIC)
  @ApiOperation({ summary: 'Create a new class' })
  @ApiResponse({ status: 201, description: 'Class created' })
  createClass(@TenantId() schoolId: string, @CampusId() campusId: string | undefined, @Body() dto: CreateClassDto) {
    return this.academicsService.createClass(schoolId, dto, campusId)
  }

  @Get('classes')
  @RequirePermission(Permission.READ_ACADEMIC)
  @ApiOperation({ summary: 'List all classes for school' })
  @ApiResponse({ status: 200, description: 'Paginated list of classes' })
  findAllClasses(@TenantId() schoolId: string, @CampusId() campusId: string | undefined, @Query() query: PaginationDto) {
    return this.academicsService.findAllClasses(schoolId, query, campusId)
  }

  @Get('classes/:id')
  @RequirePermission(Permission.READ_ACADEMIC)
  @ApiOperation({ summary: 'Get class by ID' })
  @ApiResponse({ status: 200, description: 'Class details' })
  findClassById(@Param('id') id: string, @TenantId() schoolId: string) {
    return this.academicsService.findClassById(id, schoolId)
  }

  @Patch('classes/:id')
  @RequirePermission(Permission.UPDATE_ACADEMIC)
  @ApiOperation({ summary: 'Update a class' })
  @ApiResponse({ status: 200, description: 'Class updated' })
  updateClass(@Param('id') id: string, @TenantId() schoolId: string, @Body() dto: UpdateClassDto) {
    return this.academicsService.updateClass(id, schoolId, dto)
  }

  @Delete('classes/:id')
  @RequirePermission(Permission.DELETE_ACADEMIC)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a class' })
  @ApiResponse({ status: 204, description: 'Class deleted' })
  removeClass(@Param('id') id: string, @TenantId() schoolId: string) {
    return this.academicsService.removeClass(id, schoolId)
  }

  @Patch('classes/:id/restore')
  @RequirePermission(Permission.UPDATE_ACADEMIC)
  @ApiOperation({ summary: 'Restore a deleted class' })
  @ApiResponse({ status: 200, description: 'Class restored' })
  restoreClass(@Param('id') id: string, @TenantId() schoolId: string) {
    return this.academicsService.restoreClass(id, schoolId)
  }

  @Delete('classes/:id/permanent')
  @RequirePermission(Permission.DELETE_ACADEMIC)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Permanently delete a class' })
  @ApiResponse({ status: 204, description: 'Class permanently deleted' })
  deleteClassPermanently(@Param('id') id: string, @TenantId() schoolId: string) {
    return this.academicsService.deleteClassPermanently(id, schoolId)
  }

  // ─── Sections ──────────────────────────────────────────────────

  @Post('sections')
  @RequirePermission(Permission.CREATE_ACADEMIC)
  @ApiOperation({ summary: 'Create a new section' })
  @ApiResponse({ status: 201, description: 'Section created' })
  createSection(@TenantId() schoolId: string, @Body() dto: CreateSectionDto) {
    return this.academicsService.createSection(schoolId, dto)
  }

  @Get('sections')
  @RequirePermission(Permission.READ_ACADEMIC)
  @ApiOperation({ summary: 'List all sections for school' })
  @ApiResponse({ status: 200, description: 'Paginated list of sections' })
  findAllSections(@TenantId() schoolId: string, @CampusId() campusId: string | undefined, @Query() query: PaginationDto) {
    return this.academicsService.findAllSections(schoolId, query, campusId)
  }

  @Get('sections/class/:classId')
  @RequirePermission(Permission.READ_ACADEMIC)
  @ApiOperation({ summary: 'List sections for a class' })
  @ApiResponse({ status: 200, description: 'List of sections' })
  findSectionsByClass(@Param('classId') classId: string, @TenantId() schoolId: string) {
    return this.academicsService.findSectionsByClass(classId, schoolId)
  }

  @Patch('sections/:id')
  @RequirePermission(Permission.UPDATE_ACADEMIC)
  @ApiOperation({ summary: 'Update a section' })
  @ApiResponse({ status: 200, description: 'Section updated' })
  async updateSection(@Param('id') id: string, @TenantId() schoolId: string, @Body() dto: UpdateSectionDto) {
    return this.academicsService.updateSection(id, schoolId, dto)
  }

  @Delete('sections/:id')
  @RequirePermission(Permission.DELETE_ACADEMIC)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a section' })
  @ApiResponse({ status: 204, description: 'Section deleted' })
  async removeSection(@Param('id') id: string, @TenantId() schoolId: string) {
    return this.academicsService.removeSection(id, schoolId)
  }

  @Patch('sections/:id/restore')
  @RequirePermission(Permission.UPDATE_ACADEMIC)
  @ApiOperation({ summary: 'Restore a deleted section' })
  @ApiResponse({ status: 200, description: 'Section restored' })
  async restoreSection(@Param('id') id: string, @TenantId() schoolId: string) {
    return this.academicsService.restoreSection(id, schoolId)
  }

  @Delete('sections/:id/permanent')
  @RequirePermission(Permission.DELETE_ACADEMIC)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Permanently delete a section' })
  @ApiResponse({ status: 204, description: 'Section permanently deleted' })
  async deleteSectionPermanently(@Param('id') id: string, @TenantId() schoolId: string) {
    return this.academicsService.deleteSectionPermanently(id, schoolId)
  }

  // ─── Subjects ──────────────────────────────────────────────────

  @Post('subjects')
  @RequirePermission(Permission.CREATE_ACADEMIC)
  @ApiOperation({ summary: 'Create a new subject' })
  @ApiResponse({ status: 201, description: 'Subject created' })
  createSubject(@TenantId() schoolId: string, @CampusId() campusId: string | undefined, @Body() dto: CreateSubjectDto) {
    return this.academicsService.createSubject(schoolId, dto, campusId)
  }

  @Get('subjects')
  @RequirePermission(Permission.READ_ACADEMIC)
  @ApiOperation({ summary: 'List all subjects for school' })
  @ApiResponse({ status: 200, description: 'Paginated list of subjects' })
  findAllSubjects(@TenantId() schoolId: string, @CampusId() campusId: string | undefined, @Query() query: PaginationDto & { classId?: string }) {
    return this.academicsService.findAllSubjects(schoolId, query, campusId)
  }

  @Patch('subjects/:id')
  @RequirePermission(Permission.UPDATE_ACADEMIC)
  @ApiOperation({ summary: 'Update a subject' })
  @ApiResponse({ status: 200, description: 'Subject updated' })
  updateSubject(@Param('id') id: string, @TenantId() schoolId: string, @CampusId() campusId: string | undefined, @Body() dto: UpdateSubjectDto) {
    return this.academicsService.updateSubject(id, schoolId, dto, campusId)
  }

  @Delete('subjects/:id')
  @RequirePermission(Permission.DELETE_ACADEMIC)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a subject' })
  @ApiResponse({ status: 204, description: 'Subject deleted' })
  removeSubject(@Param('id') id: string, @TenantId() schoolId: string, @CampusId() campusId: string | undefined) {
    return this.academicsService.removeSubject(id, schoolId, campusId)
  }

  @Patch('subjects/:id/restore')
  @RequirePermission(Permission.UPDATE_ACADEMIC)
  @ApiOperation({ summary: 'Restore a deleted subject' })
  @ApiResponse({ status: 200, description: 'Subject restored' })
  restoreSubject(@Param('id') id: string, @TenantId() schoolId: string, @CampusId() campusId: string | undefined) {
    return this.academicsService.restoreSubject(id, schoolId, campusId)
  }

  @Delete('subjects/:id/permanent')
  @RequirePermission(Permission.DELETE_ACADEMIC)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Permanently delete a subject' })
  @ApiResponse({ status: 204, description: 'Subject permanently deleted' })
  deleteSubjectPermanently(@Param('id') id: string, @TenantId() schoolId: string, @CampusId() campusId: string | undefined) {
    return this.academicsService.deleteSubjectPermanently(id, schoolId, campusId)
  }
}
