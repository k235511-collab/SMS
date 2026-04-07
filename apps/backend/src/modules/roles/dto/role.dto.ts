import { IsString, IsOptional, IsBoolean, IsArray } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateRoleDto {
  @ApiProperty({ example: 'Teacher' })
  @IsString()
  name: string

  @ApiProperty({ example: 'teacher' })
  @IsString()
  slug: string

  @ApiPropertyOptional({ example: 'Teacher access role' })
  @IsOptional()
  @IsString()
  description?: string
}

export class UpdateRoleDto {
  @ApiPropertyOptional({ example: 'Senior Teacher' })
  @IsOptional()
  @IsString()
  name?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  slug?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string
}

export class AssignPermissionsDto {
  @ApiProperty({ type: [String], description: 'Array of permission IDs' })
  @IsArray()
  @IsString({ each: true })
  permissionIds: string[]
}
