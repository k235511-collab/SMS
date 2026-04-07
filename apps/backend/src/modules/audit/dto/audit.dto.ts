import { IsString, IsOptional } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateAuditLogDto {
  @ApiProperty({ example: 'CREATE' })
  @IsString()
  action: string

  @ApiProperty({ example: 'Student' })
  @IsString()
  entity: string

  @ApiProperty({ example: 'uuid-here' })
  @IsString()
  entityId: string

  @ApiPropertyOptional()
  @IsOptional()
  oldData?: any

  @ApiPropertyOptional()
  @IsOptional()
  newData?: any

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  userId?: string
}
