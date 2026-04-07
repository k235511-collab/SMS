import { IsString, IsOptional, IsEmail, IsBoolean, IsEnum, IsDateString, MinLength } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Gender } from '@prisma/client'

export class CreateUserDto {
  @ApiProperty({ example: 'user@demo.com' })
  @IsEmail()
  email: string

  @ApiProperty({ example: 'password123' })
  @IsString()
  @MinLength(6)
  password: string

  @ApiProperty({ example: 'John' })
  @IsString()
  firstName: string

  @ApiProperty({ example: 'Doe' })
  @IsString()
  lastName: string

  @ApiPropertyOptional({ example: '+1234567890' })
  @IsOptional()
  @IsString()
  phone?: string

  @ApiProperty({ description: 'Role ID to assign' })
  @IsString()
  roleId: string

  // ── New fields ──

  @ApiPropertyOptional({ enum: Gender })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender

  @ApiPropertyOptional({ example: '1990-05-15' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string

  @ApiPropertyOptional({ example: 'A+' })
  @IsOptional()
  @IsString()
  bloodGroup?: string

  @ApiPropertyOptional({ example: '123 Main St' })
  @IsOptional()
  @IsString()
  address?: string

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

  @ApiPropertyOptional({ description: 'Avatar/photo URL' })
  @IsOptional()
  @IsString()
  avatar?: string

  @ApiPropertyOptional({ description: 'Campus ID to assign user to' })
  @IsOptional()
  @IsString()
  campusId?: string
}

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'updated@demo.com' })
  @IsOptional()
  @IsEmail()
  email?: string

  @ApiPropertyOptional({ example: 'newpassword123' })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string

  @ApiPropertyOptional({ example: 'Jane' })
  @IsOptional()
  @IsString()
  firstName?: string

  @ApiPropertyOptional({ example: 'Smith' })
  @IsOptional()
  @IsString()
  lastName?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  roleId?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean

  // ── New fields ──

  @ApiPropertyOptional({ enum: Gender })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bloodGroup?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cnic?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  profession?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  qualification?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  avatar?: string

  @ApiPropertyOptional({ description: 'Campus ID to assign user to' })
  @IsOptional()
  @IsString()
  campusId?: string
}
