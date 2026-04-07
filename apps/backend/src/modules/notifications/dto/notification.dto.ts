import { IsString, IsOptional, IsEnum, IsArray } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export enum NotificationType {
  INFO = 'INFO',
  WARNING = 'WARNING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR',
  ANNOUNCEMENT = 'ANNOUNCEMENT',
}

export class CreateNotificationDto {
  @ApiProperty({ example: 'Fee Payment Reminder' })
  @IsString()
  title: string

  @ApiProperty({ example: 'Your fee payment is due by March 15.' })
  @IsString()
  message: string

  @ApiPropertyOptional({ enum: NotificationType, default: NotificationType.INFO })
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType

  @ApiProperty({ description: 'Recipient user ID' })
  @IsString()
  recipientId: string

  @ApiPropertyOptional({ description: 'Deep link URL' })
  @IsOptional()
  @IsString()
  link?: string
}

export class BulkNotificationDto {
  @ApiProperty({ example: 'School Holiday Notice' })
  @IsString()
  title: string

  @ApiProperty({ example: 'School will be closed on March 20.' })
  @IsString()
  message: string

  @ApiPropertyOptional({ enum: NotificationType, default: NotificationType.ANNOUNCEMENT })
  @IsOptional()
  @IsEnum(NotificationType)
  type?: NotificationType

  @ApiProperty({ type: [String], description: 'Recipient user IDs' })
  @IsArray()
  @IsString({ each: true })
  recipientIds: string[]

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  link?: string
}
