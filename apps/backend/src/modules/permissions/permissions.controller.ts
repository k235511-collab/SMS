import {
  Controller,
  Get,
  Post,
  Query,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger'
import { PermissionsService } from './permissions.service'
import { RequirePermission } from '../../common/decorators'
import { Permission } from '../../common/constants'

@ApiTags('Permissions')
@ApiBearerAuth()
@Controller('permissions')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  @RequirePermission(Permission.MANAGE_PLATFORM)
  @ApiOperation({ summary: 'List all permissions, optionally filtered by module' })
  @ApiQuery({ name: 'module', required: false, description: 'Filter by module name' })
  @ApiResponse({ status: 200, description: 'List of permissions' })
  findAll(@Query('module') module?: string) {
    return this.permissionsService.findAll(module)
  }

  @Post('seed')
  @RequirePermission(Permission.MANAGE_PLATFORM)
  @ApiOperation({ summary: 'Seed default permissions' })
  @ApiResponse({ status: 201, description: 'Permissions seeded successfully' })
  seed() {
    return this.permissionsService.seed()
  }
}
