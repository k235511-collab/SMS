import { IsString, IsOptional, IsNumber, IsEnum, IsBoolean } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

import { AssignmentType } from '@prisma/client'

export class CreateAssignmentDto {
    @ApiProperty() @IsString() title: string
    @ApiPropertyOptional() @IsOptional() @IsString() description?: string
    @ApiProperty() @IsString() dueDate: string
    @ApiPropertyOptional() @IsOptional() @IsNumber() totalMarks?: number
    @ApiPropertyOptional({ enum: AssignmentType }) @IsOptional() @IsEnum(AssignmentType) type?: AssignmentType
    @ApiProperty() @IsString() classId: string
    @ApiProperty() @IsString() subjectId: string
    @ApiPropertyOptional() @IsOptional() @IsString() teacherId?: string
}

export class UpdateAssignmentDto {
    @ApiPropertyOptional() @IsOptional() @IsString() title?: string
    @ApiPropertyOptional() @IsOptional() @IsString() description?: string
    @ApiPropertyOptional() @IsOptional() @IsString() dueDate?: string
    @ApiPropertyOptional() @IsOptional() @IsNumber() totalMarks?: number
    @ApiPropertyOptional({ enum: AssignmentType }) @IsOptional() @IsEnum(AssignmentType) type?: AssignmentType
    @ApiPropertyOptional() @IsOptional() @IsString() classId?: string
    @ApiPropertyOptional() @IsOptional() @IsString() subjectId?: string
    @ApiPropertyOptional() @IsOptional() @IsBoolean() isActive?: boolean
}

export class CreateSubmissionDto {
    @ApiPropertyOptional() @IsOptional() @IsString() content?: string
    @ApiPropertyOptional() @IsOptional() @IsString() fileUrl?: string
    @ApiProperty() @IsString() assignmentId: string
    @ApiProperty() @IsString() studentId: string
}

export class GradeSubmissionDto {
    @ApiProperty() @IsNumber() marks: number
    @ApiPropertyOptional() @IsOptional() @IsString() grade?: string
    @ApiPropertyOptional() @IsOptional() @IsString() feedback?: string
}
