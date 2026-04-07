import { ApiProperty } from '@nestjs/swagger'

export class StudentStatsDto {
    @ApiProperty()
    total: number

    @ApiProperty()
    active: number

    @ApiProperty()
    inactive: number

    @ApiProperty()
    newThisMonth: number

    @ApiProperty()
    genderDistribution: Record<string, number>
}
