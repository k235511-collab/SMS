import {
    Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, HttpCode, HttpStatus,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger'
import { VehiclesService } from './vehicles.service'
import { RoutesService } from './routes.service'
import { TenantId, RequirePermission, CampusId } from '../../common/decorators'
import { TenantGuard } from '../../common/guards'
import { Permission } from '../../common/constants'

@ApiTags('Transport')
@ApiBearerAuth()
@Controller('transport')
@UseGuards(TenantGuard)
export class TransportController {
    constructor(
        private readonly vehiclesService: VehiclesService,
        private readonly routesService: RoutesService,
    ) { }

    // ─── Vehicles ───────────────────────────────────────
    @Post('vehicles')
    @ApiOperation({ summary: 'Add a vehicle' })
    @RequirePermission(Permission.CREATE_TRANSPORT)
    createVehicle(@TenantId() schoolId: string, @Body() dto: any, @CampusId() campusId?: string) {
        return this.vehiclesService.create(schoolId, dto, campusId)
    }

    @Get('vehicles')
    @ApiOperation({ summary: 'List vehicles' })
    @RequirePermission(Permission.READ_TRANSPORT)
    findAllVehicles(@TenantId() schoolId: string, @CampusId() campusId?: string) {
        return this.vehiclesService.findAll(schoolId, campusId)
    }

    @Get('vehicles/:id')
    @ApiOperation({ summary: 'Get vehicle details' })
    @RequirePermission(Permission.READ_TRANSPORT)
    findVehicle(@Param('id') id: string, @TenantId() schoolId: string) {
        return this.vehiclesService.findById(id, schoolId)
    }

    @Patch('vehicles/:id')
    @ApiOperation({ summary: 'Update a vehicle' })
    @RequirePermission(Permission.UPDATE_TRANSPORT)
    updateVehicle(@Param('id') id: string, @TenantId() schoolId: string, @Body() dto: any) {
        return this.vehiclesService.update(id, schoolId, dto)
    }

    @Delete('vehicles/:id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @RequirePermission(Permission.DELETE_TRANSPORT)
    removeVehicle(@Param('id') id: string, @TenantId() schoolId: string) {
        return this.vehiclesService.remove(id, schoolId)
    }

    // ─── Routes ─────────────────────────────────────────
    @Post('routes')
    @ApiOperation({ summary: 'Create a route' })
    @RequirePermission(Permission.CREATE_TRANSPORT)
    createRoute(@TenantId() schoolId: string, @Body() dto: any, @CampusId() campusId?: string) {
        return this.routesService.create(schoolId, dto, campusId)
    }

    @Get('routes')
    @ApiOperation({ summary: 'List routes' })
    @RequirePermission(Permission.READ_TRANSPORT)
    findAllRoutes(@TenantId() schoolId: string, @CampusId() campusId?: string) {
        return this.routesService.findAll(schoolId, campusId)
    }

    @Get('routes/:id')
    @ApiOperation({ summary: 'Get route details' })
    @RequirePermission(Permission.READ_TRANSPORT)
    findRoute(@Param('id') id: string, @TenantId() schoolId: string) {
        return this.routesService.findById(id, schoolId)
    }

    @Patch('routes/:id')
    @ApiOperation({ summary: 'Update a route' })
    @RequirePermission(Permission.UPDATE_TRANSPORT)
    updateRoute(@Param('id') id: string, @TenantId() schoolId: string, @Body() dto: any) {
        return this.routesService.update(id, schoolId, dto)
    }

    @Delete('routes/:id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @RequirePermission(Permission.DELETE_TRANSPORT)
    removeRoute(@Param('id') id: string, @TenantId() schoolId: string) {
        return this.routesService.remove(id, schoolId)
    }

    // ─── Assignments ────────────────────────────────────
    @Post('assignments')
    @ApiOperation({ summary: 'Assign student to route' })
    @RequirePermission(Permission.CREATE_TRANSPORT)
    assignStudent(@TenantId() schoolId: string, @Body() dto: any) {
        return this.routesService.assignStudent(schoolId, dto)
    }

    @Delete('assignments/:id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @RequirePermission(Permission.DELETE_TRANSPORT)
    removeAssignment(@Param('id') id: string, @TenantId() schoolId: string) {
        return this.routesService.removeAssignment(id, schoolId)
    }
}
