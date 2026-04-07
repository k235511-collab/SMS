import { Controller, Get, Post, Body, UseGuards } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { BackupService } from './backup.service'
import { RequirePermission } from '../../common/decorators'
import { Permission } from '../../common/constants'

@ApiTags('Backup')
@ApiBearerAuth()
@Controller('backup')
@RequirePermission(Permission.MANAGE_BACKUP)
export class BackupController {
    constructor(private readonly backupService: BackupService) { }

    @Post()
    @ApiOperation({ summary: 'Create a database backup' })
    create(@Body() dto: { name?: string }) {
        return this.backupService.createBackup(dto.name)
    }

    @Get()
    @ApiOperation({ summary: 'List backups' })
    list() {
        return this.backupService.listBackups()
    }
}
