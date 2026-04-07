import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, HttpCode, HttpStatus } from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { FeatureFlagsService } from './feature-flags.service'
import { RequirePermission } from '../../common/decorators'
import { Permission } from '../../common/constants'

@ApiTags('Feature Flags')
@ApiBearerAuth()
@Controller('feature-flags')
@RequirePermission(Permission.MANAGE_FEATURE_FLAGS)
export class FeatureFlagsController {
    constructor(private readonly featureFlagsService: FeatureFlagsService) { }

    @Post()
    @ApiOperation({ summary: 'Create a feature flag' })
    create(@Body() dto: { key: string; name: string; description?: string; isEnabled?: boolean }) {
        return this.featureFlagsService.create(dto)
    }

    @Get()
    @ApiOperation({ summary: 'List all feature flags' })
    findAll() {
        return this.featureFlagsService.findAll()
    }

    @Get(':key/check')
    @ApiOperation({ summary: 'Check if feature flag is enabled' })
    check(@Param('key') key: string) {
        return this.featureFlagsService.isEnabled(key)
    }

    @Patch(':key/toggle')
    @ApiOperation({ summary: 'Toggle feature flag' })
    toggle(@Param('key') key: string, @Body() dto: { isEnabled: boolean }) {
        return this.featureFlagsService.toggle(key, dto.isEnabled)
    }

    @Delete(':key')
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete a feature flag' })
    remove(@Param('key') key: string) {
        return this.featureFlagsService.remove(key)
    }
}
