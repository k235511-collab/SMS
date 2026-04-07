import { IsString, IsOptional, IsBoolean } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class AssignClassDto {
  @ApiProperty({ description: 'Class ID to assign' })
  @IsString()
  classId: string

  @ApiPropertyOptional({ description: 'Section ID (optional)' })
  @IsOptional()
  @IsString()
  sectionId?: string

  @ApiPropertyOptional({ description: 'Subject ID (optional)' })
  @IsOptional()
  @IsString()
  subjectId?: string

  @ApiPropertyOptional({ description: 'Academic Year ID (optional)' })
  @IsOptional()
  @IsString()
  academicYearId?: string

  @ApiPropertyOptional({ description: 'Whether this assignment is active' })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
