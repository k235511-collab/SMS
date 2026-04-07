import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { PaginationDto, PaginatedResult } from '../../common/dto'
import { getRequestContext } from '../../common/context'

/** 
 * Parameters for manual logging. 
 * Contextual fields (schoolId, userId, campusId) are now optional 
 * as they are automatically injected from RequestContext. 
 */
export interface AuditLogParams {
  action: string
  module: string
  entityType: string
  entityId: string
  oldData?: any
  newData?: any
  ipAddress?: string
  userAgent?: string
  userId?: string
  schoolId?: string
  campusId?: string
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name)
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Log an administrative or business action.
   * Automatically extracts context from the current request lifecycle.
   */
  async log(params: AuditLogParams) {
    const ctx = getRequestContext()
    
    // Fallback to params if context is missing (e.g. background jobs)
    const schoolId = ctx.schoolId || params.schoolId
    const userId = ctx.userId || params.userId
    const campusId = ctx.campusId || params.campusId

    if (!schoolId) {
      this.logger.warn(`Attempted to log action "${params.action}" without schoolId context. Skipping.`)
      return
    }

    return this.prisma.auditLog.create({
      data: {
        action: params.action,
        module: params.module,
        entityType: params.entityType,
        entityId: params.entityId,
        oldData: params.oldData ?? undefined,
        newData: params.newData ?? undefined,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        userId: userId || undefined,
        schoolId,
        campusId: campusId || undefined,
      },
    })
  }

  async findAll(schoolId: string, query: PaginationDto, campusId?: string): Promise<PaginatedResult<any>> {
    const where: any = { schoolId }
    if (campusId) where.campusId = campusId

    if (query.search) {
      where.OR = [
        { action: { contains: query.search, mode: 'insensitive' } },
        { module: { contains: query.search, mode: 'insensitive' } },
        { entityType: { contains: query.search, mode: 'insensitive' } },
      ]
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        skip: query.skip,
        take: query.take,
        orderBy: { [query.sortBy ?? 'createdAt']: query.sortOrder ?? 'desc' },
      }),
      this.prisma.auditLog.count({ where }),
    ])

    return new PaginatedResult(data, total, query.page ?? 1, query.pageSize ?? 20)
  }

  async findByEntity(schoolId: string, entityType: string, entityId: string, campusId?: string) {
    const where: any = { schoolId, entityType, entityId }
    if (campusId) where.campusId = campusId

    return this.prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    })
  }
}
