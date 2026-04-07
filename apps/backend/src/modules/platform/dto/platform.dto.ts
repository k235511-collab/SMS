import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsEmail,
  IsIn,
  Min,
  MinLength,
  ValidateIf,
  IsArray,
} from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { PaginationDto } from '../../../common/dto'

// ─── School DTOs ─────────────────────────────────────────────────

export class CreateSchoolDto {
  @ApiProperty({ example: 'Demo School' })
  @IsString()
  name: string

  @ApiProperty({ example: 'demo-school' })
  @IsString()
  slug: string

  @ApiProperty({ example: 'DEMO-001' })
  @IsString()
  code: string

  @ApiPropertyOptional({ example: 'demo.school.com' })
  @IsOptional()
  @IsString()
  domain?: string

  @ApiPropertyOptional({ example: '123 Education Lane' })
  @IsOptional()
  @IsString()
  address?: string

  @ApiPropertyOptional({ example: '+1234567890' })
  @IsOptional()
  @IsString()
  phone?: string

  @ApiPropertyOptional({ example: 'info@demo.com' })
  @IsOptional()
  @IsEmail()
  email?: string

  @ApiPropertyOptional({ example: 'https://demo.school.com' })
  @IsOptional()
  @IsString()
  website?: string

  @ApiPropertyOptional({ description: 'Subscription plan ID' })
  @IsOptional()
  @IsString()
  subscriptionPlanId?: string

  // Auto-create admin user fields
  @ApiPropertyOptional({ example: 'admin@school.com', description: 'Auto-create admin user with this email' })
  @IsOptional()
  @IsEmail()
  adminEmail?: string

  @ApiPropertyOptional({ example: 'admin123', description: 'Admin user password' })
  @IsOptional()
  @ValidateIf((o) => !!o.adminPassword)
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  adminPassword?: string

  @ApiPropertyOptional({ description: 'Google ID for admin user' })
  @IsOptional()
  @IsString()
  adminGoogleId?: string

  @ApiPropertyOptional({ example: 'Admin' })
  @IsOptional()
  @IsString()
  adminFirstName?: string

  @ApiPropertyOptional({ example: 'User' })
  @IsOptional()
  @IsString()
  adminLastName?: string
}

export class UpdateSchoolDto {
  @ApiPropertyOptional({ example: 'Updated School Name' })
  @IsOptional()
  @IsString()
  name?: string

  @ApiPropertyOptional({ example: 'updated-slug' })
  @IsOptional()
  @IsString()
  slug?: string

  @ApiPropertyOptional({ example: 'UPD-001' })
  @IsOptional()
  @IsString()
  code?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  domain?: string

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

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subscriptionPlanId?: string

  @ApiPropertyOptional({ description: 'Manual expiry date override' })
  @IsOptional()
  @IsString()
  subscriptionExpiresAt?: string
}

export class SwitchSchoolAdminDto {
  @ApiProperty({ example: 'admin@school.com', description: 'New email for the admin' })
  @IsEmail()
  adminEmail: string

  @ApiPropertyOptional({ example: 'admin123', description: 'New password' })
  @IsOptional()
  @ValidateIf((o) => !!o.adminPassword)
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  adminPassword?: string

  @ApiPropertyOptional({ description: 'New Google ID for admin user' })
  @IsOptional()
  @IsString()
  adminGoogleId?: string

  @ApiPropertyOptional({ example: 'Admin' })
  @IsOptional()
  @IsString()
  adminFirstName?: string

  @ApiPropertyOptional({ example: 'User' })
  @IsOptional()
  @IsString()
  adminLastName?: string
}

// ─── Subscription Plan DTOs ─────────────────────────────────────

export class CreateSubscriptionPlanDto {
  @ApiProperty({ example: 'Premium' })
  @IsString()
  name: string

  @ApiProperty({ example: 'premium' })
  @IsString()
  slug: string

  @ApiPropertyOptional({ example: 500, description: 'Max students (null = unlimited)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxStudents?: number

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxTeachers?: number

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxCampuses?: number

  @ApiProperty({ example: 0, description: 'Price in PKR/month (set to 0 for free plans)' })
  @IsNumber()
  @Min(0)
  price: number

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean

  @ApiPropertyOptional({ example: ['Attendance', 'Exams'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[]

  @ApiPropertyOptional({ example: 30, description: 'Duration in days (null = lifetime)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  durationDays?: number
}

export class UpdateSubscriptionPlanDto {
  @ApiPropertyOptional({ example: 'Enterprise' })
  @IsOptional()
  @IsString()
  name?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxStudents?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxTeachers?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  maxCampuses?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean

  @ApiPropertyOptional({ example: ['Attendance', 'Exams'] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  features?: string[]

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  durationDays?: number

  @ApiPropertyOptional({ description: 'Apply plan duration changes to all existing schools' })
  @IsOptional()
  @IsBoolean()
  applyToExisting?: boolean
}

// ─── Platform Admin DTOs ─────────────────────────────────────────

export class CreatePlatformAdminDto {
  @ApiProperty({ example: 'admin@platform.com' })
  @IsEmail()
  email: string

  @ApiProperty({ example: 'securePassword123' })
  @IsString()
  @MinLength(6)
  password: string

  @ApiProperty({ example: 'John' })
  @IsString()
  firstName: string

  @ApiProperty({ example: 'Doe' })
  @IsString()
  lastName: string
}

// ─── School Filter DTO (extends Pagination) ──────────────────────

export class SchoolFilterDto extends PaginationDto {
  @ApiPropertyOptional({ enum: ['active', 'inactive'], description: 'Filter by school status' })
  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: 'active' | 'inactive'

  @ApiPropertyOptional({ description: 'Filter by subscription plan ID' })
  @IsOptional()
  @IsString()
  planId?: string
}

// ─── School Registration (self-service signup) ──────────────────

export class SubmitSchoolRegistrationDto {
  @ApiProperty({ example: 'Springfield Academy', description: 'School name (slug and code auto-generated)' })
  @IsString()
  schoolName: string

  @ApiPropertyOptional({ example: 'info@springfield.edu' })
  @IsOptional()
  @IsEmail()
  email?: string

  @ApiPropertyOptional({ example: '+1234567890' })
  @IsOptional()
  @IsString()
  phone?: string

  @ApiPropertyOptional({ example: '742 Evergreen Terrace' })
  @IsOptional()
  @IsString()
  address?: string

  @ApiPropertyOptional({ example: 'springfield.edu' })
  @IsOptional()
  @IsString()
  domain?: string

  @ApiPropertyOptional({ example: 'https://springfield.edu' })
  @IsOptional()
  @IsString()
  website?: string

  // Admin user fields
  @ApiProperty({ example: 'admin@springfield.edu' })
  @IsEmail()
  adminEmail: string

  @ApiProperty({ example: 'John' })
  @IsString()
  adminFirstName: string

  @ApiProperty({ example: 'Doe' })
  @IsString()
  adminLastName: string

  @ApiPropertyOptional({ example: 'securePass123', description: 'Required if not using Google' })
  @IsOptional()
  @ValidateIf((o) => !!o.adminPassword)
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters long' })
  adminPassword?: string

  @ApiPropertyOptional({ description: 'Google ID from OAuth (alternative to password)' })
  @IsOptional()
  @IsString()
  adminGoogleId?: string
}

export class RegistrationFilterDto extends PaginationDto {
  @ApiPropertyOptional({ enum: ['PENDING', 'APPROVED', 'REJECTED'], description: 'Filter by registration status' })
  @IsOptional()
  @IsIn(['PENDING', 'APPROVED', 'REJECTED'])
  status?: 'PENDING' | 'APPROVED' | 'REJECTED'
}

export class RejectRegistrationDto {
  @ApiProperty({ example: 'Duplicate school registration' })
  @IsString()
  reason: string
}

export class ApproveRegistrationDto {
  @ApiProperty({ description: 'ID of the subscription plan to assign to the approved school' })
  @IsString()
  subscriptionPlanId: string
}
