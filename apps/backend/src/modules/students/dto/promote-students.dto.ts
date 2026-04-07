import { IsString, IsArray, ValidateNested, IsOptional } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'

export class ClassMappingDto {
  @ApiProperty({ description: 'Source class ID (current year)' })
  @IsString()
  fromClassId: string

  @ApiProperty({ description: 'Target class ID (next year)' })
  @IsString()
  toClassId: string

  @ApiPropertyOptional({ description: 'Target section ID (optional)' })
  @IsOptional()
  @IsString()
  toSectionId?: string
}

export class PromoteStudentsDto {
  @ApiProperty({ description: 'Student IDs to promote', type: [String] })
  @IsArray()
  @IsString({ each: true })
  studentIds: string[]

  @ApiProperty({ description: 'Source academic year ID' })
  @IsString()
  fromYearId: string

  @ApiProperty({ description: 'Target academic year ID' })
  @IsString()
  toYearId: string

  @ApiProperty({ description: 'Class mapping: which class each source class promotes to', type: [ClassMappingDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ClassMappingDto)
  classMappings: ClassMappingDto[]
}
