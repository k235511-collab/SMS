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
import { AcademicYearsService } from './academic-years.service'
import { CreateAcademicYearDto, UpdateAcademicYearDto } from './dto'
import { PaginationDto } from '../../common/dto'
import { RequirePermission, TenantId } from '../../common/decorators'
import { TenantGuard } from '../../common/guards'
import { Permission } from '../../common/constants'

@ApiTags('Academic Years')
@ApiBearerAuth()
@Controller('academic-years')
@UseGuards(TenantGuard)
export class AcademicYearsController {
  constructor(private readonly service: AcademicYearsService) {}

  @Post()
  @RequirePermission(Permission.CREATE_ACADEMIC)
  @ApiOperation({ summary: 'Create an academic year' })
  @ApiResponse({ status: 201, description: 'Academic year created' })
  create(@TenantId() schoolId: string, @Body() dto: CreateAcademicYearDto) {
    return this.service.create(schoolId, dto)
  }

  @Get()
  @RequirePermission(Permission.READ_ACADEMIC)
  @ApiOperation({ summary: 'List academic years' })
  @ApiResponse({ status: 200, description: 'Paginated list of academic years' })
  findAll(@TenantId() schoolId: string, @Query() query: PaginationDto) {
    return this.service.findAll(schoolId, query)
  }

  @Get('current')
  @RequirePermission(Permission.READ_ACADEMIC)
  @ApiOperation({ summary: 'Get current academic year' })
  @ApiResponse({ status: 200, description: 'Current academic year' })
  getCurrent(@TenantId() schoolId: string) {
    return this.service.getCurrent(schoolId)
  }

  @Get(':id')
  @RequirePermission(Permission.READ_ACADEMIC)
  @ApiOperation({ summary: 'Get academic year by ID' })
  @ApiResponse({ status: 200, description: 'Academic year details' })
  findById(@Param('id') id: string, @TenantId() schoolId: string) {
    return this.service.findById(id, schoolId)
  }

  @Patch(':id')
  @RequirePermission(Permission.UPDATE_ACADEMIC)
  @ApiOperation({ summary: 'Update an academic year' })
  @ApiResponse({ status: 200, description: 'Academic year updated' })
  update(@Param('id') id: string, @TenantId() schoolId: string, @Body() dto: UpdateAcademicYearDto) {
    return this.service.update(id, schoolId, dto)
  }

  @Delete(':id')
  @RequirePermission(Permission.DELETE_ACADEMIC)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an academic year' })
  @ApiResponse({ status: 204, description: 'Academic year deleted' })
  remove(@Param('id') id: string, @TenantId() schoolId: string) {
    return this.service.remove(id, schoolId)
  }
}
