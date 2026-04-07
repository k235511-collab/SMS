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
import { CampusesService } from './campuses.service'
import { CreateCampusDto, UpdateCampusDto } from './dto'
import { PaginationDto } from '../../common/dto'
import { RequirePermission, TenantId, CurrentUser } from '../../common/decorators'
import { TenantGuard } from '../../common/guards'
import { Permission } from '../../common/constants'

@ApiTags('Campuses')
@ApiBearerAuth()
@Controller('campuses')
@UseGuards(TenantGuard)
export class CampusesController {
  constructor(private readonly campusesService: CampusesService) {}

  @Post()
  @RequirePermission(Permission.CREATE_CAMPUS)
  @ApiOperation({ summary: 'Create a new campus' })
  @ApiResponse({ status: 201, description: 'Campus created' })
  create(
    @TenantId() schoolId: string,
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateCampusDto,
  ) {
    return this.campusesService.create(schoolId, user.userId, dto)
  }

  @Get('all')
  @RequirePermission(Permission.READ_CAMPUS)
  @ApiOperation({ summary: 'List all active campuses (simple, no pagination)' })
  @ApiResponse({ status: 200, description: 'Array of campuses' })
  findAllSimple(@TenantId() schoolId: string) {
    return this.campusesService.findAllSimple(schoolId)
  }

  @Get()
  @RequirePermission(Permission.READ_CAMPUS)
  @ApiOperation({ summary: 'List campuses for current school' })
  @ApiResponse({ status: 200, description: 'Paginated list of campuses' })
  findAll(@TenantId() schoolId: string, @Query() query: PaginationDto) {
    return this.campusesService.findAll(schoolId, query)
  }

  @Get(':id')
  @RequirePermission(Permission.READ_CAMPUS)
  @ApiOperation({ summary: 'Get campus by ID' })
  @ApiResponse({ status: 200, description: 'Campus details' })
  findById(@Param('id') id: string, @TenantId() schoolId: string) {
    return this.campusesService.findById(id, schoolId)
  }

  @Patch(':id')
  @RequirePermission(Permission.UPDATE_CAMPUS)
  @ApiOperation({ summary: 'Update a campus' })
  @ApiResponse({ status: 200, description: 'Campus updated' })
  update(
    @Param('id') id: string,
    @TenantId() schoolId: string,
    @CurrentUser() user: { userId: string },
    @Body() dto: UpdateCampusDto,
  ) {
    return this.campusesService.update(id, schoolId, user.userId, dto)
  }

  @Delete(':id')
  @RequirePermission(Permission.DELETE_CAMPUS)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a campus' })
  @ApiResponse({ status: 204, description: 'Campus deleted' })
  remove(
    @Param('id') id: string,
    @TenantId() schoolId: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.campusesService.remove(id, schoolId, user.userId)
  }
}
