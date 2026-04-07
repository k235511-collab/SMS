import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common'
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger'
import { NotificationsService } from './notifications.service'
import { CreateNotificationDto, BulkNotificationDto } from './dto'
import { PaginationDto } from '../../common/dto'
import { CurrentUser, TenantId, RequirePermission } from '../../common/decorators'
import { TenantGuard } from '../../common/guards'
import { Permission } from '../../common/constants'

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(TenantGuard)
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Post()
  @ApiOperation({ summary: 'Send a notification to a user' })
  @ApiResponse({ status: 201, description: 'Notification sent' })
  @RequirePermission(Permission.CREATE_NOTIFICATION)
  create(
    @TenantId() schoolId: string,
    @CurrentUser() user: { userId: string },
    @Body() dto: CreateNotificationDto,
  ) {
    return this.service.create(schoolId, user.userId, dto)
  }

  @Post('bulk')
  @ApiOperation({ summary: 'Send a notification to multiple users' })
  @ApiResponse({ status: 201, description: 'Notifications sent' })
  @RequirePermission(Permission.CREATE_NOTIFICATION)
  bulkCreate(
    @TenantId() schoolId: string,
    @CurrentUser() user: { userId: string },
    @Body() dto: BulkNotificationDto,
  ) {
    return this.service.bulkCreate(schoolId, user.userId, dto)
  }

  @Get('my')
  @ApiOperation({ summary: 'Get my notifications' })
  @ApiResponse({ status: 200, description: 'Paginated notifications' })
  findMy(
    @CurrentUser() user: { userId: string },
    @TenantId() schoolId: string,
    @Query() query: PaginationDto,
  ) {
    return this.service.findMyNotifications(user.userId, schoolId, query)
  }

  @Get('my/unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  @ApiResponse({ status: 200, description: 'Unread count' })
  getUnreadCount(
    @CurrentUser() user: { userId: string },
    @TenantId() schoolId: string,
  ) {
    return this.service.getUnreadCount(user.userId, schoolId)
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark a notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  markAsRead(
    @Param('id') id: string,
    @CurrentUser() user: { userId: string },
  ) {
    return this.service.markAsRead(id, user.userId)
  }

  @Patch('mark-all-read')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  markAllAsRead(
    @CurrentUser() user: { userId: string },
    @TenantId() schoolId: string,
  ) {
    return this.service.markAllAsRead(user.userId, schoolId)
  }
}
