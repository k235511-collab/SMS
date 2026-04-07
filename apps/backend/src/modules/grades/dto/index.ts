import { IsString, IsOptional, IsNumber, IsEnum } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

import { GradeCategory } from '@prisma/client'

export class CreateGradeDto {
    @ApiProperty() @IsNumber() score: number
    @ApiPropertyOptional() @IsOptional() @IsNumber() maxScore?: number
    @ApiPropertyOptional() @IsOptional() @IsNumber() weight?: number
    @ApiPropertyOptional({ enum: GradeCategory }) @IsOptional() @IsEnum(GradeCategory) category?: GradeCategory
    @ApiPropertyOptional() @IsOptional() @IsString() remarks?: string
    @ApiProperty() @IsString() studentId: string
    @ApiProperty() @IsString() subjectId: string
    @ApiPropertyOptional() @IsOptional() @IsString() academicYearId?: string
}

export class UpdateGradeDto {
    @ApiPropertyOptional() @IsOptional() @IsNumber() score?: number
    @ApiPropertyOptional() @IsOptional() @IsNumber() maxScore?: number
    @ApiPropertyOptional() @IsOptional() @IsNumber() weight?: number
    @ApiPropertyOptional({ enum: GradeCategory }) @IsOptional() @IsEnum(GradeCategory) category?: GradeCategory
    @ApiPropertyOptional() @IsOptional() @IsString() remarks?: string
}
