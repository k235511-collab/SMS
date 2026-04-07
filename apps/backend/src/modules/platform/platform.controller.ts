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
import { PlatformService } from './platform.service'
import {
  CreateSchoolDto,
  UpdateSchoolDto,
  CreateSubscriptionPlanDto,
  UpdateSubscriptionPlanDto,
  CreatePlatformAdminDto,
  SchoolFilterDto,
  SwitchSchoolAdminDto,
  RegistrationFilterDto,
  ApproveRegistrationDto,
  RejectRegistrationDto,
} from './dto'
import { CurrentUser } from '../../common/decorators'
import { PaginationDto } from '../../common/dto'
import { RequirePermission } from '../../common/decorators'
import { Permission } from '../../common/constants'
import { TenantGuard } from '../../common/guards/tenant.guard'

@ApiTags('Platform')
@ApiBearerAuth()
@Controller('platform')
@UseGuards(TenantGuard)
@RequirePermission(Permission.MANAGE_PLATFORM)
export class PlatformController {
  constructor(private readonly platformService: PlatformService) {}

  // ─── Stats & Overview ──────────────────────────────────────────

  @Get('stats')
  @ApiOperation({ summary: 'Get platform-wide statistics' })
  @ApiResponse({ status: 200, description: 'Platform stats' })
  getStats() {
    return this.platformService.getStats()
  }

  @Get('recent-activity')
  @ApiOperation({ summary: 'Get recent platform activity' })
  @ApiResponse({ status: 200, description: 'Recent activity feed' })
  getRecentActivity(@Query('limit') limit?: string) {
    return this.platformService.getRecentActivity(limit ? parseInt(limit, 10) : 20)
  }

  @Get('overview')
  @ApiOperation({ summary: 'Get schools overview (by plan, top schools)' })
  @ApiResponse({ status: 200, description: 'Schools overview' })
  getSchoolsOverview() {
    return this.platformService.getSchoolsOverview()
  }

  // ─── Schools ───────────────────────────────────────────────────

  @Post('schools')
  @ApiOperation({ summary: 'Create a new school with auto-created roles and optional admin' })
  @ApiResponse({ status: 201, description: 'School created successfully' })
  createSchool(@Body() dto: CreateSchoolDto) {
    return this.platformService.createSchool(dto)
  }

  @Get('schools')
  @ApiOperation({ summary: 'List all schools with stats (supports status/plan filters)' })
  @ApiResponse({ status: 200, description: 'Paginated list of schools' })
  findAllSchools(@Query() query: SchoolFilterDto) {
    return this.platformService.findAllSchools(query)
  }

  @Get('schools/:id')
  @ApiOperation({ summary: 'Get school by ID with detailed stats' })
  @ApiResponse({ status: 200, description: 'School details' })
  findSchoolById(@Param('id') id: string) {
    return this.platformService.findSchoolById(id)
  }

  @Patch('schools/:id')
  @ApiOperation({ summary: 'Update a school' })
  @ApiResponse({ status: 200, description: 'School updated successfully' })
  updateSchool(@Param('id') id: string, @Body() dto: UpdateSchoolDto) {
    return this.platformService.updateSchool(id, dto)
  }

  @Get('schools/:id/admin')
  @ApiOperation({ summary: 'Get the primary super admin for a school' })
  @ApiResponse({ status: 200, description: 'Admin details returned successfully' })
  getSchoolAdmin(@Param('id') id: string) {
    return this.platformService.getSchoolAdmin(id)
  }

  @Patch('schools/:id/switch-admin')
  @ApiOperation({ summary: 'Switch or update the primary school admin credentials' })
  @ApiResponse({ status: 200, description: 'Admin updated successfully' })
  switchSchoolAdmin(@Param('id') id: string, @Body() dto: SwitchSchoolAdminDto) {
    return this.platformService.switchSchoolAdmin(id, dto)
  }

  @Delete('schools/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a school' })
  @ApiResponse({ status: 204, description: 'School deleted' })
  deleteSchool(@Param('id') id: string) {
    return this.platformService.deleteSchool(id)
  }

  @Patch('schools/:id/toggle-status')
  @ApiOperation({ summary: 'Toggle school active/inactive status' })
  @ApiResponse({ status: 200, description: 'School status toggled' })
  toggleSchoolStatus(@Param('id') id: string) {
    return this.platformService.toggleSchoolStatus(id)
  }

  @Post('schools/:id/impersonate')
  @ApiOperation({ summary: 'Impersonate school admin — get a JWT to log in as school super_admin' })
  @ApiResponse({ status: 200, description: 'Impersonation token' })
  impersonateSchool(@Param('id') id: string) {
    return this.platformService.impersonateSchool(id)
  }

  // ─── Subscription Plans ────────────────────────────────────────

  @Post('plans')
  @ApiOperation({ summary: 'Create a subscription plan' })
  @ApiResponse({ status: 201, description: 'Plan created successfully' })
  createPlan(@Body() dto: CreateSubscriptionPlanDto) {
    return this.platformService.createPlan(dto)
  }

  @Get('plans')
  @ApiOperation({ summary: 'List all subscription plans' })
  @ApiResponse({ status: 200, description: 'List of plans' })
  findAllPlans() {
    return this.platformService.findAllPlans()
  }

  @Patch('plans/:id')
  @ApiOperation({ summary: 'Update a subscription plan' })
  @ApiResponse({ status: 200, description: 'Plan updated successfully' })
  updatePlan(@Param('id') id: string, @Body() dto: UpdateSubscriptionPlanDto) {
    return this.platformService.updatePlan(id, dto)
  }

  @Delete('plans/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a subscription plan (only if no schools assigned)' })
  @ApiResponse({ status: 204, description: 'Plan deleted' })
  deletePlan(@Param('id') id: string) {
    return this.platformService.deletePlan(id)
  }

  // ─── Platform Admins ───────────────────────────────────────────

  @Get('admins')
  @ApiOperation({ summary: 'List all platform admins' })
  @ApiResponse({ status: 200, description: 'List of platform admins' })
  findAllAdmins() {
    return this.platformService.findAllPlatformAdmins()
  }

  @Post('admins')
  @ApiOperation({ summary: 'Create a new platform admin' })
  @ApiResponse({ status: 201, description: 'Platform admin created' })
  createAdmin(@Body() dto: CreatePlatformAdminDto) {
    return this.platformService.createPlatformAdmin(dto)
  }

  @Patch('admins/:id/toggle-status')
  @ApiOperation({ summary: 'Toggle platform admin active/inactive' })
  @ApiResponse({ status: 200, description: 'Admin status toggled' })
  toggleAdminStatus(@Param('id') id: string) {
    return this.platformService.togglePlatformAdminStatus(id)
  }

  // ─── Audit Logs (cross-school) ─────────────────────────────────

  @Get('audit-logs')
  @ApiOperation({ summary: 'Get platform-wide audit logs (all schools)' })
  @ApiResponse({ status: 200, description: 'Paginated audit logs' })
  getAuditLogs(@Query() query: PaginationDto) {
    return this.platformService.getPlatformAuditLogs(query)
  }

  // ─── Platform Settings ─────────────────────────────────────────

  @Get('settings')
  @ApiOperation({ summary: 'Get platform settings' })
  @ApiResponse({ status: 200, description: 'Platform settings grouped by category' })
  getSettings(@Query('group') group?: string) {
    return this.platformService.getSettings(group)
  }

  @Patch('settings')
  @ApiOperation({ summary: 'Update platform settings' })
  @ApiResponse({ status: 200, description: 'Settings updated' })
  updateSettings(@Body() body: { settings: Array<{ key: string; value: string; group?: string }> }) {
    return this.platformService.updateSettings(body.settings)
  }

  // ─── Login History ─────────────────────────────────────────────

  @Get('login-history')
  @ApiOperation({ summary: 'Get platform-wide login history' })
  @ApiResponse({ status: 200, description: 'Paginated login history' })
  getLoginHistory(@Query() query: PaginationDto) {
    return this.platformService.getLoginHistory(query)
  }

  // ─── School Registrations (approval workflow) ─────────────────

  @Get('registrations')
  @ApiOperation({ summary: 'List all school registration requests' })
  @ApiResponse({ status: 200, description: 'Paginated list of registrations' })
  findAllRegistrations(@Query() query: RegistrationFilterDto) {
    return this.platformService.findAllRegistrations(query)
  }

  @Get('registrations/pending-count')
  @ApiOperation({ summary: 'Get count of pending registrations (for badge)' })
  @ApiResponse({ status: 200, description: 'Pending count' })
  getPendingCount() {
    return this.platformService.getPendingRegistrationCount()
  }

  @Patch('registrations/:id/approve')
  @ApiOperation({ summary: 'Approve a school registration — creates school + admin user with selected plan' })
  @ApiResponse({ status: 200, description: 'Registration approved and school created' })
  approveRegistration(
    @Param('id') id: string,
    @Body() dto: ApproveRegistrationDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.platformService.approveRegistration(id, dto, user.userId)
  }

  @Patch('registrations/:id/reject')
  @ApiOperation({ summary: 'Reject a school registration' })
  @ApiResponse({ status: 200, description: 'Registration rejected' })
  rejectRegistration(
    @Param('id') id: string,
    @Body() dto: RejectRegistrationDto,
    @CurrentUser() user: { userId: string },
  ) {
    return this.platformService.rejectRegistration(id, dto, user.userId)
  }
}
