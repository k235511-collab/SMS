import { IsString, IsOptional, IsBoolean } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateCampusDto {
  @ApiProperty({ example: 'Main Campus' })
  @IsString()
  name: string

  @ApiProperty({ example: 'MAIN-01' })
  @IsString()
  code: string

  @ApiPropertyOptional({ example: '456 Campus Road' })
  @IsOptional()
  @IsString()
  address?: string

  @ApiPropertyOptional({ example: '+0987654321' })
  @IsOptional()
  @IsString()
  phone?: string
}

export class UpdateCampusDto {
  @ApiPropertyOptional({ example: 'Updated Campus' })
  @IsOptional()
  @IsString()
  name?: string

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
  @IsBoolean()
  isActive?: boolean
}
