import { Injectable, NotFoundException } from '@nestjs/common'
import { NotificationType } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import { PaginationDto, PaginatedResult } from '../../common/dto'
import { CreateNotificationDto, BulkNotificationDto } from './dto'

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(schoolId: string, senderId: string | null, dto: CreateNotificationDto) {
    return this.prisma.notification.create({
      data: {
        title: dto.title,
        message: dto.message,
        type: (dto.type as NotificationType) ?? 'INFO',
        recipientId: dto.recipientId,
        senderId,
        link: dto.link,
        schoolId,
      },
    })
  }

  async bulkCreate(schoolId: string, senderId: string | null, dto: BulkNotificationDto) {
    const data = dto.recipientIds.map((recipientId) => ({
      title: dto.title,
      message: dto.message,
      type: (dto.type as NotificationType) ?? ('ANNOUNCEMENT' as NotificationType),
      recipientId,
      senderId,
      link: dto.link,
      schoolId,
    }))

    const result = await this.prisma.notification.createMany({ data })
    return { sent: result.count }
  }

  async findMyNotifications(userId: string, schoolId: string, query: PaginationDto): Promise<PaginatedResult<any>> {
    const where = { recipientId: userId, schoolId }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.notification.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
    ])

    return new PaginatedResult(data, total, query.page ?? 1, query.pageSize ?? 20)
  }

  async getUnreadCount(userId: string, schoolId: string) {
    const count = await this.prisma.notification.count({
      where: { recipientId: userId, schoolId, isRead: false },
    })
    return { unread: count }
  }

  async markAsRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, recipientId: userId },
    })

    if (!notification) {
      throw new NotFoundException('Notification not found')
    }

    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    })
  }

  async markAllAsRead(userId: string, schoolId: string) {
    const result = await this.prisma.notification.updateMany({
      where: { recipientId: userId, schoolId, isRead: false },
      data: { isRead: true },
    })
    return { updated: result.count }
  }
}
