import {
  Controller, Get, Post, Patch, Delete,
  Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger'
import { ParentsService } from './parents.service'
import { LinkParentDto, UpdateParentLinkDto, CreateParentDto } from './dto'
import { RequirePermission, TenantId, CurrentUser, CampusId } from '../../common/decorators'
import { TenantGuard } from '../../common/guards'
import { Permission } from '../../common/constants'

@ApiTags('Parents')
@ApiBearerAuth()
@Controller('parents')
@UseGuards(TenantGuard)
export class ParentsController {
  constructor(private readonly parentsService: ParentsService) {}

  @Post()
  @RequirePermission(Permission.CREATE_PARENT)
  @ApiOperation({ summary: 'Create a parent user account' })
  @ApiResponse({ status: 201, description: 'Parent created' })
  createParent(@TenantId() schoolId: string, @CampusId() campusId: string | undefined, @Body() dto: CreateParentDto) {
    return this.parentsService.createParent(schoolId, dto, campusId)
  }

  @Post('link')
  @RequirePermission(Permission.UPDATE_PARENT)
  @ApiOperation({ summary: 'Link a parent user to a student' })
  @ApiResponse({ status: 201, description: 'Parent linked to student' })
  linkParent(@TenantId() schoolId: string, @Body() dto: LinkParentDto) {
    return this.parentsService.linkParent(schoolId, dto)
  }

  @Delete('link/:id')
  @RequirePermission(Permission.UPDATE_PARENT)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a parent-student link' })
  @ApiResponse({ status: 204, description: 'Link removed' })
  unlinkParent(@Param('id') id: string, @TenantId() schoolId: string) {
    return this.parentsService.unlinkParent(id, schoolId)
  }

  @Patch('link/:id')
  @RequirePermission(Permission.UPDATE_PARENT)
  @ApiOperation({ summary: 'Update parent-student link (relationship, primary)' })
  @ApiResponse({ status: 200, description: 'Link updated' })
  updateLink(@Param('id') id: string, @TenantId() schoolId: string, @Body() dto: UpdateParentLinkDto) {
    return this.parentsService.updateLink(id, schoolId, dto)
  }

  @Get('student/:studentId')
  @RequirePermission(Permission.READ_PARENT)
  @ApiOperation({ summary: 'Get all parents for a student' })
  @ApiResponse({ status: 200, description: 'List of parents' })
  getParentsForStudent(@Param('studentId') studentId: string, @TenantId() schoolId: string) {
    return this.parentsService.getParentsForStudent(studentId, schoolId)
  }

  @Get('children/:parentId')
  @RequirePermission(Permission.READ_PARENT)
  @ApiOperation({ summary: 'Get all children for a parent user' })
  @ApiResponse({ status: 200, description: 'List of children' })
  getChildren(@Param('parentId') parentId: string, @TenantId() schoolId: string) {
    return this.parentsService.getChildrenForParent(parentId, schoolId)
  }

  @Get('my-children')
  @ApiOperation({ summary: 'Get children for the currently logged-in parent' })
  @ApiResponse({ status: 200, description: 'List of children' })
  getMyChildren(@CurrentUser() user: any, @TenantId() schoolId: string) {
    return this.parentsService.getChildrenForParent(user.id, schoolId)
  }

  @Get('search')
  @RequirePermission(Permission.READ_PARENT)
  @ApiOperation({ summary: 'Search parents by name, phone, CNIC' })
  @ApiQuery({ name: 'q', required: false, description: 'Search query' })
  @ApiResponse({ status: 200, description: 'Matching parents' })
  searchParents(@TenantId() schoolId: string, @CampusId() campusId: string | undefined, @Query('q') q: string) {
    return this.parentsService.searchParents(schoolId, q || '', campusId)
  }

  @Get()
  @RequirePermission(Permission.READ_PARENT)
  @ApiOperation({ summary: 'List all parents with their linked children' })
  @ApiResponse({ status: 200, description: 'All parents' })
  findAll(@TenantId() schoolId: string, @CampusId() campusId: string | undefined) {
    return this.parentsService.findAll(schoolId, campusId)
  }
}
