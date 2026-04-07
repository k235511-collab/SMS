import { Injectable, NotFoundException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class FeatureFlagsService {
    constructor(private readonly prisma: PrismaService) { }

    async create(dto: { key: string; name: string; description?: string; isEnabled?: boolean }) {
        return this.prisma.featureFlag.create({ data: dto })
    }

    async findAll() {
        return this.prisma.featureFlag.findMany({ orderBy: { key: 'asc' } })
    }

    async isEnabled(key: string): Promise<boolean> {
        const flag = await this.prisma.featureFlag.findUnique({ where: { key } })
        return flag?.isEnabled ?? false
    }

    async toggle(key: string, isEnabled: boolean) {
        const flag = await this.prisma.featureFlag.findUnique({ where: { key } })
        if (!flag) throw new NotFoundException(`Feature flag "${key}" not found`)
        return this.prisma.featureFlag.update({ where: { key }, data: { isEnabled } })
    }

    async remove(key: string) {
        return this.prisma.featureFlag.delete({ where: { key } })
    }
}
