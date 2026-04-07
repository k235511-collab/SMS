import {
  IsString,
  IsOptional,
  IsIn,
  IsArray,
  IsDateString,
  ValidateNested,
} from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { AttendanceStatus } from '@prisma/client'
import { PaginationDto } from '../../../common/dto'

// Allow all Prisma statuses plus 'UNMARKED' (used to delete a record)
const ALLOWED_STATUSES = [...Object.values(AttendanceStatus), 'UNMARKED'] as const

export class MarkAttendanceItemDto {
  @ApiProperty()
  @IsString()
  studentId: string

  @ApiProperty({ example: 'PRESENT', description: 'AttendanceStatus or UNMARKED to clear' })
  @IsIn(ALLOWED_STATUSES)
  status: AttendanceStatus | 'UNMARKED'

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remarks?: string
}

export class MarkAttendanceDto {
  @ApiProperty({ example: '2025-01-15', description: 'Date in ISO format' })
  @IsDateString()
  date: string

  @ApiPropertyOptional({ description: 'Optional class ID (validated for teachers)' })
  @IsOptional()
  @IsString()
  classId?: string

  @ApiPropertyOptional({ description: 'Section ID (required for teachers)' })
  @IsOptional()
  @IsString()
  sectionId?: string

  @ApiProperty({ type: [MarkAttendanceItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MarkAttendanceItemDto)
  records: MarkAttendanceItemDto[]
}

export class AttendanceQueryDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sectionId?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  studentId?: string
}
