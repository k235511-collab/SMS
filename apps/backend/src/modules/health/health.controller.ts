import { Controller, Get } from '@nestjs/common'
import { ApiTags } from '@nestjs/swagger'
import { PrismaService } from '../../prisma/prisma.service'
import { Public } from '../../common/decorators'

@ApiTags('Health')
@Public()
@Controller('health')
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async check() {
    try {
      // Intentional raw probe: the health check only needs a lightweight DB ping.
      await this.prisma.$queryRaw`SELECT 1`
      return { 
        status: 'ok', 
        database: 'connected', 
        timestamp: new Date().toISOString()
      }
    } catch (e: any) {
      return { 
        status: 'error', 
        database: 'disconnected', 
        message: e.message,
        timestamp: new Date().toISOString() 
      }
    }
  }
}
