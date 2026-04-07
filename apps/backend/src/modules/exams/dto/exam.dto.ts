import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsArray,
  IsDateString,
  ValidateNested,
  Min,
} from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { ExamType, ExamStatus } from '@prisma/client'
import { PaginationDto } from '../../../common/dto'

// ─── Exam DTOs ───────────────────────────────────────────────────

export class CreateExamDto {
  @ApiProperty({ example: 'Mid-Term Examination' })
  @IsString()
  name: string

  @ApiProperty({ enum: ExamType, example: ExamType.MID_TERM })
  @IsEnum(ExamType)
  type: ExamType

  @ApiProperty({ example: 'class-uuid' })
  @IsString()
  classId: string

  @ApiProperty({ example: 'section-uuid' })
  @IsString()
  sectionId: string

  @ApiProperty({ example: 'subject-uuid' })
  @IsString()
  subjectId: string

  @ApiProperty({ example: 'academic-year-uuid' })
  @IsString()
  academicYearId: string

  @ApiPropertyOptional({ example: 'teacher-uuid' })
  @IsOptional()
  @IsString()
  teacherId?: string

  @ApiPropertyOptional({ example: '2025-03-01' })
  @IsOptional()
  @IsDateString()
  startDate?: string

  @ApiPropertyOptional({ example: '2025-03-15' })
  @IsOptional()
  @IsDateString()
  endDate?: string

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  duration?: number

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalMarks?: number

  @ApiPropertyOptional({ example: 33 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  passingMarks?: number

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  weightage?: number

  @ApiPropertyOptional({ example: 'Chapters 1-5' })
  @IsOptional()
  @IsString()
  syllabus?: string

  @ApiPropertyOptional({ enum: ExamStatus, example: ExamStatus.DRAFT })
  @IsOptional()
  @IsEnum(ExamStatus)
  status?: ExamStatus
}

export class GetExamsDto extends PaginationDto {
  @ApiPropertyOptional({ example: 'class-uuid' })
  @IsOptional()
  @IsString()
  classId?: string

  @ApiPropertyOptional({ example: 'academic-year-uuid' })
  @IsOptional()
  @IsString()
  academicYearId?: string

  @ApiPropertyOptional({ example: 'subject-uuid' })
  @IsOptional()
  @IsString()
  subjectId?: string
}

export class GetExamStudentResultsDto extends PaginationDto {
  @ApiPropertyOptional({ example: 'exam-uuid' })
  @IsOptional()
  @IsString()
  examId?: string

  @ApiPropertyOptional({ example: 'class-uuid' })
  @IsOptional()
  @IsString()
  classId?: string

  @ApiPropertyOptional({ example: 'subject-uuid' })
  @IsOptional()
  @IsString()
  subjectId?: string

  @ApiPropertyOptional({ example: 'section-uuid' })
  @IsOptional()
  @IsString()
  sectionId?: string

  @ApiPropertyOptional({ example: 'academic-year-uuid' })
  @IsOptional()
  @IsString()
  academicYearId?: string
}

export class UpdateExamDto {
  @ApiPropertyOptional({ example: 'Final Examination' })
  @IsOptional()
  @IsString()
  name?: string

  @ApiPropertyOptional({ enum: ExamType })
  @IsOptional()
  @IsEnum(ExamType)
  type?: ExamType

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  duration?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalMarks?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  passingMarks?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  weightage?: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  syllabus?: string

  @ApiPropertyOptional({ enum: ExamStatus })
  @IsOptional()
  @IsEnum(ExamStatus)
  status?: ExamStatus

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  classId?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sectionId?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subjectId?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  teacherId?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  academicYearId?: string
}

// ─── Status Update DTO ─────────────────────────────────────────────

export class UpdateExamStatusDto {
  @ApiProperty({ enum: ExamStatus, example: ExamStatus.SCHEDULED })
  @IsEnum(ExamStatus)
  status: ExamStatus
}

// ─── Teacher Assignment DTOs ────────────────────────────────────────

export class AssignTeacherDto {
  @ApiProperty({ example: 'teacher-uuid' })
  @IsString()
  teacherId: string

  @ApiPropertyOptional({ example: 'INVIGILATOR' })
  @IsOptional()
  @IsString()
  role?: string
}

// ─── Result DTOs ─────────────────────────────────────────────────

export class RecordResultDto {
  @ApiProperty()
  @IsString()
  examId: string

  @ApiProperty()
  @IsString()
  subjectId: string

  @ApiProperty()
  @IsString()
  studentId: string

  @ApiProperty({ example: 85.5 })
  @IsNumber()
  @Min(0)
  marksObtained: number

  @ApiPropertyOptional({ example: 'A' })
  @IsOptional()
  @IsString()
  grade?: string

  @ApiPropertyOptional({ example: 'Excellent performance' })
  @IsOptional()
  @IsString()
  remarks?: string

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isAbsent?: boolean
}

export class StudentResultEntryDto {
  @ApiProperty()
  @IsString()
  studentId: string

  @ApiProperty({ example: 85.5 })
  @IsNumber()
  @Min(0)
  marksObtained: number

  @ApiPropertyOptional({ example: 'A' })
  @IsOptional()
  @IsString()
  grade?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remarks?: string

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isAbsent?: boolean
}

export class BulkRecordResultDto {
  @ApiProperty()
  @IsString()
  examId: string

  @ApiProperty()
  @IsString()
  subjectId: string

  @ApiProperty({ type: [StudentResultEntryDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StudentResultEntryDto)
  results: StudentResultEntryDto[]
}
