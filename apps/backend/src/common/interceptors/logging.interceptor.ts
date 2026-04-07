import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common'
import { Observable } from 'rxjs'
import { tap } from 'rxjs/operators'

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP')

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest()
    const { method, url } = request
    const schoolId = request.user?.schoolId || request.headers['x-school-id'] || 'none'
    const userId = request.user?.userId || 'anonymous'
    const now = Date.now()

    return next.handle().pipe(
      tap(() => {
        const response = context.switchToHttp().getResponse()
        const statusCode = response.statusCode
        const elapsed = Date.now() - now
        this.logger.log(
          `[School:${schoolId}] [User:${userId}] ${method} ${url} ${statusCode} ${elapsed}ms`,
        )
      }),
    )
  }
}
