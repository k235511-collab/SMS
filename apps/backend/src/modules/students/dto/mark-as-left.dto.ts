import { IsOptional, IsString, IsDateString } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class MarkAsLeftDto {
  @ApiPropertyOptional({ description: 'Date the student left school', example: '2026-03-01' })
  @IsOptional()
  @IsDateString()
  leaveDate?: string

  @ApiPropertyOptional({ description: 'Reason for leaving', example: 'Family relocated' })
  @IsOptional()
  @IsString()
  leaveReason?: string
}
