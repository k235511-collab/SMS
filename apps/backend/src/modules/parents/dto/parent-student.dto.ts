import { IsString, IsOptional, IsBoolean, IsEnum, IsUUID } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Gender } from '@prisma/client'

export enum Relationship {
  FATHER = 'FATHER',
  MOTHER = 'MOTHER',
  GUARDIAN = 'GUARDIAN',
  OTHER = 'OTHER',
}

export class CreateParentDto {
  @ApiProperty({ example: 'Ahmed' })
  @IsString()
  firstName: string

  @ApiProperty({ example: 'Khan' })
  @IsString()
  lastName: string

  @ApiPropertyOptional({ example: '+923001234567' })
  @IsOptional()
  @IsString()
  phone?: string

  @ApiPropertyOptional({ enum: Gender })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender

  @ApiPropertyOptional({ example: '12345-6789012-3' })
  @IsOptional()
  @IsString()
  cnic?: string

  @ApiPropertyOptional({ example: 'Engineer' })
  @IsOptional()
  @IsString()
  profession?: string

  @ApiPropertyOptional({ example: 'MBA' })
  @IsOptional()
  @IsString()
  qualification?: string

  @ApiPropertyOptional({ example: '123 Main St' })
  @IsOptional()
  @IsString()
  address?: string

  @ApiPropertyOptional({ description: 'Avatar/photo URL' })
  @IsOptional()
  @IsString()
  avatar?: string

  @ApiPropertyOptional({ description: 'Student ID to link immediately' })
  @IsOptional()
  @IsString()
  studentId?: string

  @ApiPropertyOptional({ enum: Relationship, default: Relationship.GUARDIAN })
  @IsOptional()
  @IsEnum(Relationship)
  relationship?: Relationship
}

export class LinkParentDto {
  @ApiProperty({ description: 'Parent user ID' })
  @IsUUID()
  parentId: string

  @ApiProperty({ description: 'Student ID' })
  @IsUUID()
  studentId: string

  @ApiPropertyOptional({ enum: Relationship, default: Relationship.GUARDIAN })
  @IsOptional()
  @IsEnum(Relationship)
  relationship?: Relationship

  @ApiPropertyOptional({ description: 'Is this the primary guardian?', default: false })
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean
}

export class UpdateParentLinkDto {
  @ApiPropertyOptional({ enum: Relationship })
  @IsOptional()
  @IsEnum(Relationship)
  relationship?: Relationship

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isPrimary?: boolean
}
