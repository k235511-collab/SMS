import { IsString, IsOptional, IsEnum, IsDateString, IsArray, IsNumber, Min, Max } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { DiscountType, Gender, Relationship, StudentStatus } from '@prisma/client'

export class CreateStudentDto {
  @ApiProperty({ example: 'STU-001' })
  @IsString()
  rollNumber: string

  @ApiProperty({ example: 'John' })
  @IsString()
  firstName: string

  @ApiProperty({ example: 'Doe' })
  @IsString()
  lastName: string

  @ApiPropertyOptional({ example: '2010-05-15' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string

  @ApiPropertyOptional({ enum: Gender })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender

  @ApiPropertyOptional({ example: 'O+' })
  @IsOptional()
  @IsString()
  bloodGroup?: string

  @ApiPropertyOptional({ example: 'Mr. Smith' })
  @IsOptional()
  @IsString()
  guardianName?: string

  @ApiPropertyOptional({ example: '+1234567890' })
  @IsOptional()
  @IsString()
  guardianPhone?: string

  @ApiPropertyOptional({ example: 'guardian@demo.com' })
  @IsOptional()
  @IsString()
  guardianEmail?: string

  @ApiPropertyOptional({ example: '123 Student St' })
  @IsOptional()
  @IsString()
  address?: string

  @ApiPropertyOptional({ description: 'Optional linked user account ID' })
  @IsOptional()
  @IsString()
  userId?: string

  @ApiPropertyOptional({ example: 'class-uuid' })
  @IsOptional()
  @IsString()
  classId?: string

  @ApiPropertyOptional({ example: 'section-uuid' })
  @IsOptional()
  @IsString()
  sectionId?: string

  @ApiPropertyOptional({ enum: StudentStatus, default: StudentStatus.ACTIVE })
  @IsOptional()
  @IsEnum(StudentStatus)
  status?: StudentStatus

  @ApiPropertyOptional({ description: 'Academic Year ID for enrollment' })
  @IsOptional()
  @IsString()
  academicYearId?: string

  // ── New fields ──

  @ApiPropertyOptional({ example: '12345-6789012-3' })
  @IsOptional()
  @IsString()
  cnic?: string

  @ApiPropertyOptional({ example: '+923001234567' })
  @IsOptional()
  @IsString()
  phone?: string

  @ApiPropertyOptional({ example: 'Science' })
  @IsOptional()
  @IsString()
  group?: string

  @ApiPropertyOptional({ example: 'Islam' })
  @IsOptional()
  @IsString()
  religion?: string

  @ApiPropertyOptional({ example: 'Admitted with scholarship' })
  @IsOptional()
  @IsString()
  admissionNote?: string

  @ApiPropertyOptional({ description: 'Profile image URL' })
  @IsOptional()
  @IsString()
  profileImage?: string

  @ApiPropertyOptional({ description: 'Parent user ID to link' })
  @IsOptional()
  @IsString()
  parentId?: string

  @ApiPropertyOptional({ description: 'Relationship of parent to student', enum: Relationship })
  @IsOptional()
  @IsEnum(Relationship)
  relationship?: Relationship

  @ApiPropertyOptional({ description: 'Discount type for fee', enum: ['PERCENTAGE', 'FIXED'] })
  @IsOptional()
  @IsEnum(DiscountType)
  discountType?: DiscountType

  @ApiPropertyOptional({ description: 'Discount value (e.g. 10 for 10% or 1000 for Rs 1000)', example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountValue?: number

  @ApiPropertyOptional({ description: 'Document types submitted', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  documents?: string[]
}

export class UpdateStudentDto {
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
  @IsDateString()
  dateOfBirth?: string

  @ApiPropertyOptional({ enum: Gender })
  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bloodGroup?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  guardianName?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  guardianPhone?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  guardianEmail?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  classId?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sectionId?: string

  @ApiPropertyOptional({ enum: StudentStatus })
  @IsOptional()
  @IsEnum(StudentStatus)
  status?: StudentStatus

  // ── New fields ──

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cnic?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  group?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  religion?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  admissionNote?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  profileImage?: string

  @ApiPropertyOptional({ description: 'Parent user ID to link' })
  @IsOptional()
  @IsString()
  parentId?: string

  @ApiPropertyOptional({ description: 'Relationship of parent to student', enum: Relationship })
  @IsOptional()
  @IsEnum(Relationship)
  relationship?: Relationship

  @ApiPropertyOptional({ description: 'Discount type for fee', enum: ['PERCENTAGE', 'FIXED'] })
  @IsOptional()
  @IsEnum(DiscountType)
  discountType?: DiscountType

  @ApiPropertyOptional({ description: 'Discount value (e.g. 10 for 10% or 1000 for Rs 1000)', example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discountValue?: number

  @ApiPropertyOptional({ description: 'Document types submitted', type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  documents?: string[]

  @ApiPropertyOptional({ description: 'Date of leaving school' })
  @IsOptional()
  @IsDateString()
  leaveDate?: string

  @ApiPropertyOptional({ description: 'Reason for leaving school' })
  @IsOptional()
  @IsString()
  leaveReason?: string
}
