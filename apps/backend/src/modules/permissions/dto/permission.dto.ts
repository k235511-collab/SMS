import { IsString, IsOptional } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreatePermissionDto {
  @ApiProperty({ example: 'students:read', description: 'Unique permission name' })
  @IsString()
  name: string

  @ApiProperty({ example: 'students', description: 'Module this permission belongs to' })
  @IsString()
  module: string

  @ApiProperty({ example: 'read', description: 'Action type (create, read, update, delete)' })
  @IsString()
  action: string

  @ApiPropertyOptional({ example: 'Read access to student records' })
  @IsOptional()
  @IsString()
  description?: string
}
