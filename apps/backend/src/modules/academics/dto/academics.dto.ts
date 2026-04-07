import { IsString, IsOptional, IsBoolean, IsInt, Min } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

// ─── Class DTOs ──────────────────────────────────────────────────

export class CreateClassDto {
  @ApiProperty({ example: 'Grade 10' })
  @IsString()
  name: string

  @ApiProperty({ example: 'G10' })
  @IsString()
  code: string

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number
}

export class UpdateClassDto {
  @ApiPropertyOptional({ example: 'Grade 10 Updated' })
  @IsOptional()
  @IsString()
  name?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean

  @ApiPropertyOptional({ description: 'Move class to a different campus' })
  @IsOptional()
  @IsString()
  campusId?: string
}

// ─── Section DTOs ────────────────────────────────────────────────

export class CreateSectionDto {
  @ApiProperty({ example: 'A' })
  @IsString()
  name: string

  @ApiProperty({ description: 'Class ID this section belongs to' })
  @IsString()
  classId: string

  @ApiPropertyOptional({ example: 40 })
  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number
}

export class UpdateSectionDto {
  @ApiPropertyOptional({ example: 'B' })
  @IsOptional()
  @IsString()
  name?: string

  @ApiPropertyOptional({ example: 45 })
  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}

// ─── Subject DTOs ────────────────────────────────────────────────

export class CreateSubjectDto {
  @ApiProperty({ example: 'Mathematics' })
  @IsString()
  name: string

  @ApiProperty({ example: 'MATH' })
  @IsString()
  code: string

  @ApiProperty({ description: 'Class ID' })
  @IsString()
  classId: string
}

export class UpdateSubjectDto {
  @ApiPropertyOptional({ example: 'Advanced Mathematics' })
  @IsOptional()
  @IsString()
  name?: string

  @ApiPropertyOptional({ description: 'Class ID to reassign' })
  @IsOptional()
  @IsString()
  classId?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}

// ─── Class-Subject Assignment DTOs ───────────────────────────────

export class AssignSubjectToClassDto {
  @ApiProperty({ description: 'Class ID to assign the subject to' })
  @IsString()
  classId: string

  @ApiProperty({ description: 'Subject ID to assign' })
  @IsString()
  subjectId: string
}
