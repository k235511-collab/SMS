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
import { RolesService } from './roles.service'
import { CreateRoleDto, UpdateRoleDto, AssignPermissionsDto } from './dto'
import { PaginationDto } from '../../common/dto'
import { RequirePermission, TenantId, CampusId } from '../../common/decorators'
import { TenantGuard } from '../../common/guards'
import { Permission } from '../../common/constants'

@ApiTags('Roles')
@ApiBearerAuth()
@Controller('roles')
@UseGuards(TenantGuard)
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Post()
  @RequirePermission(Permission.CREATE_ROLE)
  @ApiOperation({ summary: 'Create a new role' })
  @ApiResponse({ status: 201, description: 'Role created' })
  create(@TenantId() schoolId: string, @CampusId() campusId: string | undefined, @Body() dto: CreateRoleDto) {
    return this.rolesService.create(schoolId, dto, campusId)
  }

  @Get()
  @RequirePermission(Permission.READ_ROLE)
  @ApiOperation({ summary: 'List roles for current school' })
  @ApiResponse({ status: 200, description: 'Paginated list of roles' })
  findAll(@TenantId() schoolId: string, @CampusId() campusId: string | undefined, @Query() query: PaginationDto) {
    return this.rolesService.findAll(schoolId, query, campusId)
  }

  @Get(':id')
  @RequirePermission(Permission.READ_ROLE)
  @ApiOperation({ summary: 'Get role by ID' })
  @ApiResponse({ status: 200, description: 'Role details' })
  findById(@Param('id') id: string, @TenantId() schoolId: string, @CampusId() campusId: string | undefined) {
    return this.rolesService.findById(id, schoolId, campusId)
  }

  @Patch(':id')
  @RequirePermission(Permission.UPDATE_ROLE)
  @ApiOperation({ summary: 'Update a role' })
  @ApiResponse({ status: 200, description: 'Role updated' })
  update(@Param('id') id: string, @TenantId() schoolId: string, @CampusId() campusId: string | undefined, @Body() dto: UpdateRoleDto) {
    return this.rolesService.update(id, schoolId, dto, campusId)
  }

  @Delete(':id')
  @RequirePermission(Permission.DELETE_ROLE)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a role' })
  @ApiResponse({ status: 204, description: 'Role deleted' })
  remove(@Param('id') id: string, @TenantId() schoolId: string, @CampusId() campusId: string | undefined) {
    return this.rolesService.remove(id, schoolId, campusId)
  }

  @Post(':id/permissions')
  @RequirePermission(Permission.UPDATE_ROLE)
  @ApiOperation({ summary: 'Assign permissions to a role' })
  @ApiResponse({ status: 200, description: 'Permissions assigned' })
  assignPermissions(
    @Param('id') id: string,
    @TenantId() schoolId: string,
    @CampusId() campusId: string | undefined,
    @Body() dto: AssignPermissionsDto,
  ) {
    return this.rolesService.assignPermissions(id, schoolId, dto, campusId)
  }

  @Post(':id/default')
  @RequirePermission(Permission.SUPER_ADMIN_BYPASS)
  @ApiOperation({ summary: 'Set current permissions as default for this role' })
  @ApiResponse({ status: 200, description: 'Default permissions set' })
  setDefault(
    @Param('id') id: string,
    @TenantId() schoolId: string,
    @CampusId() campusId: string | undefined,
  ) {
    return this.rolesService.setAsDefault(id, schoolId, campusId)
  }

  @Patch(':id/default')
  @RequirePermission(Permission.UPDATE_ROLE)
  @ApiOperation({ summary: 'Restore permissions from defaults' })
  @ApiResponse({ status: 200, description: 'Permissions restored' })
  restoreDefault(
    @Param('id') id: string,
    @TenantId() schoolId: string,
    @CampusId() campusId: string | undefined,
  ) {
    return this.rolesService.restoreDefaults(id, schoolId, campusId)
  }
}
