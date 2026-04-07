import { IsString, IsOptional, IsEmail } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class UpdateSchoolProfileDto {
  @ApiPropertyOptional({ example: 'Updated School Name' })
  @IsOptional()
  @IsString()
  name?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  logo?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  website?: string

  @ApiPropertyOptional({ example: 'TCF-01' })
  @IsOptional()
  @IsString()
  code?: string

  @ApiPropertyOptional()
  @IsOptional()
  settings?: any
}
