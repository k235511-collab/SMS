import { IsString, IsOptional, IsNumber, IsInt } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateBookDto {
    @ApiProperty() @IsString() title: string
    @ApiPropertyOptional() @IsOptional() @IsString() author?: string
    @ApiPropertyOptional() @IsOptional() @IsString() isbn?: string
    @ApiPropertyOptional() @IsOptional() @IsString() category?: string
    @ApiPropertyOptional() @IsOptional() @IsString() publisher?: string
    @ApiPropertyOptional() @IsOptional() @IsString() edition?: string
    @ApiPropertyOptional() @IsOptional() @IsInt() totalCopies?: number
    @ApiPropertyOptional() @IsOptional() @IsString() location?: string
    @ApiPropertyOptional() @IsOptional() @IsString() coverImage?: string
}

export class UpdateBookDto {
    @ApiPropertyOptional() @IsOptional() @IsString() title?: string
    @ApiPropertyOptional() @IsOptional() @IsString() author?: string
    @ApiPropertyOptional() @IsOptional() @IsString() isbn?: string
    @ApiPropertyOptional() @IsOptional() @IsString() category?: string
    @ApiPropertyOptional() @IsOptional() @IsString() publisher?: string
    @ApiPropertyOptional() @IsOptional() @IsString() edition?: string
    @ApiPropertyOptional() @IsOptional() @IsInt() totalCopies?: number
    @ApiPropertyOptional() @IsOptional() @IsString() location?: string
    @ApiPropertyOptional() @IsOptional() @IsString() coverImage?: string
}

export class IssueBookDto {
    @ApiProperty() @IsString() bookId: string
    @ApiProperty() @IsString() studentId: string
    @ApiProperty() @IsString() dueDate: string
}

export class ReturnBookDto {
    @ApiPropertyOptional() @IsOptional() @IsNumber() fine?: number
    @ApiPropertyOptional() @IsOptional() @IsString() remarks?: string
}
