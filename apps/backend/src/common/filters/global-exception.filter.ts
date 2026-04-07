import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'
import { Request, Response } from 'express'

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name)

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()
    const request = ctx.getRequest<Request>()

    let status = HttpStatus.INTERNAL_SERVER_ERROR
    let message = 'Internal server error'
    let errors: Record<string, string[]> | undefined

    if (exception instanceof HttpException) {
      status = exception.getStatus()
      const exResponse = exception.getResponse()

      if (typeof exResponse === 'string') {
        message = exResponse
      } else if (typeof exResponse === 'object') {
        const obj = exResponse as Record<string, unknown>
        message = (obj.message as string) || exception.message

        // Handle class-validator errors — include details in message
        if (Array.isArray(obj.message)) {
          const validationErrors = obj.message as string[]
          message = validationErrors.join(', ')
          errors = { validation: validationErrors }
        }
      }
      // Never leak internal 5xx exception details to clients.
      if (status >= 500) {
        message = 'Something went wrong. Please try again later.'
        errors = undefined
      }
    } else if (exception instanceof Error) {
      this.logger.error(
        `Unhandled exception: ${exception.message}`,
        exception.stack,
      )
      // Hide raw runtime/DB error details from API consumers.
      message = 'Something went wrong. Please try again later.'
    }

    const errorResponse = {
      success: false,
      statusCode: status,
      message,
      errors,
      path: request.url,
      method: request.method,
      timestamp: new Date().toISOString(),
    }

    if (status >= 500) {
      this.logger.error(
        `${request.method} ${request.url} ${status}`,
        JSON.stringify(errorResponse),
      )
    }

    response.status(status).json(errorResponse)
  }
}
