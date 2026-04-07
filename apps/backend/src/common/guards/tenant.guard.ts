import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { requestContext } from '../context'

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()
    const user = request.user

    // Platform admins bypass tenant isolation entirely
    if (user?.isPlatformAdmin === true) {
      const store = requestContext.getStore()
      if (store) {
        store.isPlatformAdmin = true
        store.teacherId = null
      }
      return true
    }

    const schoolId =
      user?.schoolId || request.headers['x-school-id']

    if (!schoolId) {
      throw new ForbiddenException('School context is required')
    }

    const school = await this.prisma.school.findUnique({
      where: { id: schoolId },
      select: { id: true, isActive: true },
    })

    if (!school) {
      throw new ForbiddenException('Invalid school')
    }

    if (!school.isActive) {
      throw new ForbiddenException('School is deactivated')
    }

    request.schoolId = school.id

    // Update the AsyncLocalStorage store with the verified schoolId and user context
    const store = requestContext.getStore()
    if (store) {
      store.schoolId = school.id
      store.userId = user?.id || null
      store.campusId = user?.campusId || null
      store.role = user?.role || null
      store.isPlatformAdmin = user?.isPlatformAdmin === true
      store.teacherId = user?.teacherId || null
    }

    return true
  }
}
