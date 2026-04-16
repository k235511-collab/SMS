import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsInt,
  IsDateString,
  IsArray,
  IsBoolean,
  Min,
  Max,
} from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { Type } from 'class-transformer'
import { FeeFrequency, PaymentMethod } from '@prisma/client'
import { PaginationDto } from '../../../common/dto'

// ─── Fee Structure DTOs ──────────────────────────────────────────

export class CreateFeeStructureDto {
  @ApiProperty({ example: 'Monthly Tuition Fee' })
  @IsString()
  name: string

  @ApiPropertyOptional({ example: 'Monthly tuition fee for all students' })
  @IsOptional()
  @IsString()
  description?: string

  @ApiProperty({ example: 5000 })
  @IsNumber()
  @Min(0)
  amount: number

  @ApiProperty({ enum: FeeFrequency, example: FeeFrequency.MONTHLY })
  @IsEnum(FeeFrequency)
  frequency: FeeFrequency

  @ApiPropertyOptional({ example: 15, description: 'Day of month fee is due (1-28)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(28)
  dueDay?: number

  @ApiPropertyOptional({ description: 'Class ID — if set, fee applies only to this class. If null, applies school-wide.' })
  @IsOptional()
  @IsString()
  classId?: string
}

export class UpdateFeeStructureDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number

  @ApiPropertyOptional({ enum: FeeFrequency })
  @IsOptional()
  @IsEnum(FeeFrequency)
  frequency?: FeeFrequency

  @ApiPropertyOptional({ example: 15 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(28)
  dueDay?: number

  @ApiPropertyOptional({ description: 'Class ID — if set, fee applies only to this class. Pass null to make school-wide.' })
  @IsOptional()
  @IsString()
  classId?: string | null
}

// ─── Invoice DTOs ────────────────────────────────────────────────

export class CreateInvoiceDto {
  @ApiProperty({ example: 'INV-2025-001' })
  @IsString()
  invoiceNo: string

  @ApiProperty({ example: 5000 })
  @IsNumber()
  @Min(0)
  totalAmount: number

  @ApiProperty({ example: '2025-04-30' })
  @IsDateString()
  dueDate: string

  @ApiPropertyOptional({ example: 'Monthly tuition fee for March' })
  @IsOptional()
  @IsString()
  notes?: string

  @ApiProperty({ description: 'Student ID' })
  @IsString()
  studentId: string

  @ApiPropertyOptional({ description: 'Fee structure ID' })
  @IsOptional()
  @IsString()
  feeStructureId?: string

}

export class UpdateInvoiceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalAmount?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dueDate?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string

  @ApiPropertyOptional({ enum: ['UNPAID', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED', 'REFUNDED'] })
  @IsOptional()
  @IsString()
  status?: string
}

export class GetInvoicesDto extends PaginationDto {

  @ApiPropertyOptional({ enum: ['UNPAID', 'PARTIAL', 'PAID', 'OVERDUE', 'CANCELLED', 'REFUNDED'] })
  @IsOptional()
  @IsString()
  status?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  studentId?: string
}

export class GetPaymentsDto extends PaginationDto {
  @ApiPropertyOptional({ enum: PaymentMethod })
  @IsOptional()
  @IsString()
  method?: string

  @ApiPropertyOptional({ description: 'Academic year ID used to scope payments by their invoice context' })
  @IsOptional()
  @IsString()
  academicYearId?: string
}

export class GetPendingFeesDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Class ID filter' })
  @IsOptional()
  @IsString()
  classId?: string

  @ApiPropertyOptional({ description: 'Section ID filter' })
  @IsOptional()
  @IsString()
  sectionId?: string

  @ApiPropertyOptional({ description: 'Invoice status filter' })
  @IsOptional()
  @IsString()
  status?: string

  @ApiPropertyOptional({ description: 'Academic year ID filter' })
  @IsOptional()
  @IsString()
  academicYearId?: string
}

// ─── Payment DTOs ────────────────────────────────────────────────

export class RecordPaymentDto {
  @ApiProperty({ description: 'Invoice ID' })
  @IsString()
  invoiceId: string

  @ApiProperty({ example: 2500 })
  @IsNumber()
  @Min(0)
  amount: number

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.CASH })
  @IsEnum(PaymentMethod)
  method: PaymentMethod

  @ApiPropertyOptional({ example: 'TXN-12345' })
  @IsOptional()
  @IsString()
  referenceNo?: string

  @ApiPropertyOptional({ example: '2025-03-15T10:30:00Z' })
  @IsOptional()
  @IsDateString()
  paidAt?: string
}

// ─── Batch Generate DTOs ─────────────────────────────────────────

export class BatchGenerateInvoicesDto {
  @ApiProperty({ description: 'Fee structure ID to generate invoices for' })
  @IsString()
  feeStructureId: string

  @ApiPropertyOptional({ description: 'Class ID — if provided, only students in this class. Otherwise all enrolled students.' })
  @IsOptional()
  @IsString()
  classId?: string

  @ApiPropertyOptional({ description: 'Academic year ID — defaults to current year' })
  @IsOptional()
  @IsString()
  academicYearId?: string

  @ApiPropertyOptional({ description: 'Specific student ID — if provided, only generate for this student.' })
  @IsOptional()
  @IsString()
  studentId?: string;

  @ApiPropertyOptional({ description: 'Campus ID to filter by' })
  @IsOptional()
  @IsString()
  campusId?: string;

  @ApiPropertyOptional({ description: 'Custom due date — defaults to feeStructure.dueDay of current month' })
  @IsOptional()
  @IsDateString()
  dueDate?: string

  @ApiPropertyOptional({ description: 'Explicit list of student IDs to generate invoices for' })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  studentIds?: string[]

  @ApiPropertyOptional({ description: 'Whether to apply enrollment discounts (default true)', default: true })
  @IsOptional()
  @IsBoolean()
  applyDiscounts?: boolean
}

// ─── Preview Invoices DTO ────────────────────────────────────────

export class PreviewInvoicesQueryDto {
  @ApiProperty({ description: 'Fee structure ID' })
  @IsString()
  feeStructureId: string

  @ApiPropertyOptional({ description: 'Class ID' })
  @IsOptional()
  @IsString()
  classId?: string

  @ApiPropertyOptional({ description: 'Academic year ID' })
  @IsOptional()
  @IsString()
  academicYearId?: string

  @ApiPropertyOptional({ description: 'Campus ID' })
  @IsOptional()
  @IsString()
  campusId?: string

}

// ─── Expense Category DTOs ───────────────────────────────────────

export class CreateExpenseCategoryDto {
  @ApiProperty({ example: 'Utilities' })
  @IsString()
  name: string
}

export class UpdateExpenseCategoryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string
}

// ─── Expense DTOs ────────────────────────────────────────────────

export class CreateExpenseDto {
  @ApiProperty({ example: 'Electricity Bill - January' })
  @IsString()
  title: string

  @ApiPropertyOptional({ example: 'Monthly electricity bill for school campus' })
  @IsOptional()
  @IsString()
  description?: string

  @ApiProperty({ example: 25000 })
  @IsNumber()
  @Min(0)
  amount: number

  @ApiProperty({ example: '2026-02-15' })
  @IsDateString()
  date: string

  @ApiPropertyOptional({ example: 'REC-001' })
  @IsOptional()
  @IsString()
  receiptNo?: string

  @ApiPropertyOptional({ example: 'K-Electric' })
  @IsOptional()
  @IsString()
  vendor?: string

  @ApiProperty({ description: 'Expense category ID' })
  @IsString()
  categoryId: string
}

export class UpdateExpenseDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  title?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  date?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  receiptNo?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vendor?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string
}
