import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { AuditService } from './audit.service'
import { PaginationDto } from '../../common/dto'
import { RequirePermission, TenantId, CampusId } from '../../common/decorators'
import { TenantGuard } from '../../common/guards'
import { Permission } from '../../common/constants'

@ApiTags('Audit')
@ApiBearerAuth()
@Controller('audit')
@UseGuards(TenantGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get()
  @RequirePermission(Permission.READ_AUDIT)
  @ApiOperation({ summary: 'Get audit logs for school' })
  @ApiResponse({ status: 200, description: 'Paginated audit logs' })
  findAll(@TenantId() schoolId: string, @CampusId() campusId: string | undefined, @Query() query: PaginationDto) {
    return this.auditService.findAll(schoolId, query, campusId)
  }

  @Get(':entity/:entityId')
  @RequirePermission(Permission.READ_AUDIT)
  @ApiOperation({ summary: 'Get audit trail for a specific entity' })
  @ApiResponse({ status: 200, description: 'Entity audit trail' })
  findByEntity(
    @TenantId() schoolId: string,
    @CampusId() campusId: string | undefined,
    @Param('entity') entity: string,
    @Param('entityId') entityId: string,
  ) {
    return this.auditService.findByEntity(schoolId, entity, entityId, campusId)
  }
}
