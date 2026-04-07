import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsNumber,
  IsArray,
  IsInt,
  ValidateNested,
  Min,
} from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { SectionType, QuestionType } from '@prisma/client'

// ─── Question Option ─────────────────────────────────────────

export class QuestionOptionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  id?: string

  @ApiProperty({ example: 'Option A text' })
  @IsString()
  optionText: string

  @ApiProperty({ example: false })
  @IsBoolean()
  isCorrect: boolean

  @ApiProperty({ example: 0 })
  @IsInt()
  @Min(0)
  sortOrder: number
}

// ─── Question ─────────────────────────────────────────────────

export class ExamQuestionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  id?: string

  @ApiProperty({ example: '<p>What is 2+2?</p>' })
  @IsString()
  questionText: string

  @ApiProperty({ enum: QuestionType, example: 'MCQ' })
  @IsEnum(QuestionType)
  questionType: QuestionType

  @ApiProperty({ example: 5 })
  @IsNumber()
  @Min(0)
  marks: number

  @ApiProperty({ example: 0 })
  @IsInt()
  @Min(0)
  sortOrder: number

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  imageBase64?: string

  @ApiProperty({ type: [QuestionOptionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuestionOptionDto)
  options: QuestionOptionDto[]
}

// ─── Section ──────────────────────────────────────────────────

export class ExamSectionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  id?: string

  @ApiProperty({ example: 'Section A' })
  @IsString()
  title: string

  @ApiProperty({ enum: SectionType, example: 'OBJECTIVE' })
  @IsEnum(SectionType)
  type: SectionType

  @ApiPropertyOptional({ example: 'Circle the correct answer.' })
  @IsOptional()
  @IsString()
  instructions?: string

  @ApiProperty({ example: 20 })
  @IsInt()
  @Min(0)
  totalMarks: number

  @ApiProperty({ example: 0 })
  @IsInt()
  @Min(0)
  sortOrder: number

  @ApiProperty({ type: [ExamQuestionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExamQuestionDto)
  questions: ExamQuestionDto[]
}

// ─── Full Paper Upsert ────────────────────────────────────────

export class UpsertExamPaperDto {
  @ApiPropertyOptional({ example: 'Mid-Term Examination' })
  @IsOptional()
  @IsString()
  paperTitle?: string

  @ApiPropertyOptional({ example: 'The Citizen Foundation' })
  @IsOptional()
  @IsString()
  schoolName?: string

  @ApiPropertyOptional({ example: 'https://example.com/logo.png' })
  @IsOptional()
  @IsString()
  schoolLogo?: string

  @ApiPropertyOptional({ example: 'Read all questions carefully before answering.' })
  @IsOptional()
  @IsString()
  headerInstructions?: string

  @ApiPropertyOptional({ example: '2026-03-10' })
  @IsOptional()
  @IsString()
  date?: string

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsInt()
  @Min(0)
  totalMarks?: number

  @ApiPropertyOptional({ example: '2 hours' })
  @IsOptional()
  @IsString()
  duration?: string

  @ApiPropertyOptional({ example: 'Attempt all questions.' })
  @IsOptional()
  @IsString()
  instructions?: string

  @ApiProperty({ type: [ExamSectionDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExamSectionDto)
  sections: ExamSectionDto[]
}
