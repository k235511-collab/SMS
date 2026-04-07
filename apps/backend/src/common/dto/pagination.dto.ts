import { IsOptional, IsInt, Min, Max, IsString, IsIn } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiPropertyOptional } from '@nestjs/swagger'

export class PaginationDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  pageSize?: number = 20

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sortBy?: string = 'createdAt'

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc'

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deleted?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startDate?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endDate?: string

  get skip(): number {
    return ((this.page ?? 1) - 1) * (this.pageSize ?? 20)
  }

  get take(): number {
    return this.pageSize ?? 20
  }

  get orderBy(): Record<string, 'asc' | 'desc'> {
    return { [this.sortBy ?? 'createdAt']: this.sortOrder ?? 'desc' }
  }
}
