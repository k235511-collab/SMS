import { Controller, Get, Post, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { ResourcesService } from './resources.service'
import { TenantId, RequirePermission, CampusId } from '../../common/decorators'
import { TenantGuard } from '../../common/guards'
import { Permission } from '../../common/constants'

@ApiTags('Resources')
@ApiBearerAuth()
@Controller('resources')
@UseGuards(TenantGuard)
export class ResourcesController {
    constructor(private readonly resourcesService: ResourcesService) { }

    @Post()
    @ApiOperation({ summary: 'Upload a resource' })
    @RequirePermission(Permission.CREATE_RESOURCE)
    create(@TenantId() schoolId: string, @Body() dto: any, @CampusId() campusId?: string) {
        return this.resourcesService.create(schoolId, dto, undefined, campusId)
    }

    @Get()
    @ApiOperation({ summary: 'List resources' })
    @RequirePermission(Permission.READ_RESOURCE)
    findAll(@TenantId() schoolId: string, @Query('category') category?: string, @Query('subjectId') subjectId?: string, @Query('search') search?: string, @CampusId() campusId?: string) {
        return this.resourcesService.findAll(schoolId, { category, subjectId, search }, campusId)
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get resource' })
    @RequirePermission(Permission.READ_RESOURCE)
    findOne(@Param('id') id: string, @TenantId() schoolId: string) {
        return this.resourcesService.findById(id, schoolId)
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete a resource' })
    @RequirePermission(Permission.DELETE_RESOURCE)
    remove(@Param('id') id: string, @TenantId() schoolId: string) {
        return this.resourcesService.remove(id, schoolId)
    }
}
