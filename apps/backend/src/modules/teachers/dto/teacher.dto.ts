import { IsString, IsOptional, IsBoolean, IsEnum, IsDateString, IsNumber, IsEmail, MinLength } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Gender, MaritalStatus } from '@prisma/client'

export class CreateTeacherDto {
  @ApiProperty({ example: 'EMP-001' })
  @IsString()
  employeeId: string

  @ApiProperty({ example: 'Jane' })
  @IsString()
  firstName: string

  @ApiProperty({ example: 'Smith' })
  @IsString()
  lastName: string

  @ApiPropertyOptional({ example: 'M.Ed' })
  @IsOptional()
  @IsString()
  qualification?: string

  @ApiPropertyOptional({ example: 'Mathematics' })
  @IsOptional()
  @IsString()
  specialization?: string

  @ApiPropertyOptional({ description: 'Optional linked user account ID' })
  @IsOptional()
  @IsString()
  userId?: string

  // ── New fields ──

  @ApiPropertyOptional({ description: 'Email for auto-creating user account' })
  @IsOptional()
  @IsEmail()
  email?: string

  @ApiPropertyOptional({ description: 'Password for auto-creating user account' })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string

  @ApiPropertyOptional({ example: 50000 })
  @IsOptional()
  @IsNumber()
  salary?: number

  @ApiPropertyOptional({ example: '2025-01-15' })
  @IsOptional()
  @IsDateString()
  joinDate?: string

  @ApiPropertyOptional({ example: '12345-6789012-3' })
  @IsOptional()
  @IsString()
  cnic?: string

  @ApiPropertyOptional({ enum: MaritalStatus })
  @IsOptional()
  @IsEnum(MaritalStatus)
  maritalStatus?: MaritalStatus

  @ApiPropertyOptional({ example: 'Muhammad Ahmed' })
  @IsOptional()
  @IsString()
  fatherHusbandName?: string

  @ApiPropertyOptional({ example: '12345-6789012-3' })
  @IsOptional()
  @IsString()
  fatherHusbandCnic?: string

  @ApiPropertyOptional({ example: 'B.Ed' })
  @IsOptional()
  @IsString()
  qualificationAtAppt?: string

  @ApiPropertyOptional({ example: 'Science' })
  @IsOptional()
  @IsString()
  department?: string

  @ApiPropertyOptional({ example: '5 years' })
  @IsOptional()
  @IsString()
  experience?: string

  @ApiPropertyOptional({ enum: Gender })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender

  @ApiPropertyOptional({ example: '1990-05-15' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string

  @ApiPropertyOptional({ example: '+923001234567' })
  @IsOptional()
  @IsString()
  phone?: string

  @ApiPropertyOptional({ example: 'A+' })
  @IsOptional()
  @IsString()
  bloodGroup?: string

  @ApiPropertyOptional({ example: 'Islam' })
  @IsOptional()
  @IsString()
  religion?: string

  @ApiPropertyOptional({ example: 'Senior Teacher' })
  @IsOptional()
  @IsString()
  designation?: string

  @ApiPropertyOptional({ example: '123 Main St' })
  @IsOptional()
  @IsString()
  address?: string

  @ApiPropertyOptional({ example: 'Excellent teacher' })
  @IsOptional()
  @IsString()
  note?: string

  @ApiPropertyOptional({ description: 'Photo URL' })
  @IsOptional()
  @IsString()
  photo?: string

  @ApiPropertyOptional({ description: 'Role ID for the user account' })
  @IsOptional()
  @IsString()
  roleId?: string

  @ApiPropertyOptional({ description: 'Class this teacher is class-teacher of' })
  @IsOptional()
  @IsString()
  classTeacherOfId?: string
}

export class UpdateTeacherDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  firstName?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lastName?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  qualification?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  specialization?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean

  // ── New fields ──

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  salary?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  joinDate?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cnic?: string

  @ApiPropertyOptional({ enum: MaritalStatus })
  @IsOptional()
  @IsEnum(MaritalStatus)
  maritalStatus?: MaritalStatus

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fatherHusbandName?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fatherHusbandCnic?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  qualificationAtAppt?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  department?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  experience?: string

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
  phone?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bloodGroup?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  religion?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  designation?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  photo?: string

  @ApiPropertyOptional({ description: 'Role ID for the user account' })
  @IsOptional()
  @IsString()
  roleId?: string

  @ApiPropertyOptional({ description: 'Transfer teacher to a different campus' })
  @IsOptional()
  @IsString()
  campusId?: string

  @ApiPropertyOptional({ description: 'Class this teacher is class-teacher of' })
  @IsOptional()
  @IsString()
  classTeacherOfId?: string
}

/**
 * Limited DTO for teacher self-service profile update.
 * Teachers can only update personal/contact info — not salary, role, campus, etc.
 */
export class UpdateTeacherProfileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  photo?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  religion?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bloodGroup?: string
}