import { IsString, IsOptional, IsEnum } from 'class-validator'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { PaginationDto } from '../../../common/dto'
import { StudentStatus } from '@prisma/client'

export class GetStudentsDto extends PaginationDto {
    @ApiPropertyOptional({ description: 'Filter by Academic Year ID' })
    @IsOptional()
    @IsString()
    academicYearId?: string

    @ApiPropertyOptional({ description: 'Filter by Class ID' })
    @IsOptional()
    @IsString()
    classId?: string

    @ApiPropertyOptional({ description: 'Filter by Section ID' })
    @IsOptional()
    @IsString()
    sectionId?: string

    @ApiPropertyOptional({ description: 'Filter by Student Status' })
    @IsOptional()
    @IsEnum(StudentStatus)
    status?: StudentStatus

    @ApiPropertyOptional({ description: 'Filter by Registration/Roll Number' })
    @IsOptional()
    @IsString()
    regNo?: string

    @ApiPropertyOptional({ description: 'Filter by minimum balance' })
    @IsOptional()
    // @IsNumber() // Query params are strings, will parse in service
    balanceMin?: string

    @ApiPropertyOptional({ description: 'Filter by maximum balance' })
    @IsOptional()
    balanceMax?: string
}
