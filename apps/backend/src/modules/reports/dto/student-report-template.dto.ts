import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { IsOptional, IsString, Length, MaxLength } from 'class-validator'

export class UpsertStudentReportTemplateDto {
  @ApiProperty({
    description: 'HTML template content for report card rendering',
    minLength: 20,
  })
  @IsString()
  @Length(20, 500000)
  htmlContent: string

  @ApiPropertyOptional({ description: 'Optional template name override' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  templateName?: string

  @ApiPropertyOptional({ description: 'Optional template description override' })
  @IsOptional()
  @IsString()
  @MaxLength(280)
  description?: string
}
