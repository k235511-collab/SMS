import { IsString, IsOptional, IsInt, IsBoolean, Min, Max } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateTimetableSlotDto {
  @ApiProperty({ example: 1, description: '0=Sun, 1=Mon, ..., 6=Sat' })
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number

  @ApiProperty({ example: '08:00' })
  @IsString()
  startTime: string

  @ApiProperty({ example: '08:45' })
  @IsString()
  endTime: string

  @ApiProperty()
  @IsString()
  sectionId: string

  @ApiProperty()
  @IsString()
  subjectId: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  teacherId?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  academicYearId?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  room?: string
}

export class UpdateTimetableSlotDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startTime?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endTime?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subjectId?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  teacherId?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  academicYearId?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  room?: string
}

// ─── Period Template DTOs ──────────────────────────────────────────────────

export class CreatePeriodTemplateDto {
  @ApiProperty({ example: 'Period 1' })
  @IsString()
  label: string

  @ApiProperty({ example: '08:00' })
  @IsString()
  startTime: string

  @ApiProperty({ example: '08:45' })
  @IsString()
  endTime: string

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  sortOrder?: number

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isBreak?: boolean
}

export class UpdatePeriodTemplateDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  label?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startTime?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endTime?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  sortOrder?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isBreak?: boolean
}
