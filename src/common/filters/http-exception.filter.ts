import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { Response } from 'express';
import { ErrorResponse } from '../util';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let code = 'INTERNAL_SERVER_ERROR';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse: string | object = exception.getResponse();

      if (
        exception instanceof BadRequestException &&
        typeof exceptionResponse === 'object'
      ) {
        const validationErrors = (exceptionResponse as Record<string, unknown>)
          .message;
        if (Array.isArray(validationErrors) && validationErrors.length > 0) {
          message = validationErrors.join(', ');
          code = 'VALIDATION_ERROR';
        } else {
          message =
            ((exceptionResponse as Record<string, unknown>)
              .message as string) || message;
          code = this.mapStatusToCode(status);
        }
      } else {
        if (typeof exceptionResponse === 'string') {
          message = exceptionResponse;
          code = this.mapStatusToCode(status);
        } else if (
          typeof exceptionResponse === 'object' &&
          exceptionResponse !== null
        ) {
          message =
            ((exceptionResponse as Record<string, unknown>)
              .message as string) || message;
          code =
            ((exceptionResponse as Record<string, unknown>).code as string) ||
            this.mapStatusToCode(status);
        }
      }
    }

    const errorResponse: ErrorResponse = {
      status: 'error',
      code,
      message,
      timestamp: new Date().toISOString(),
    };

    response.status(status).json(errorResponse);
  }

  private mapStatusToCode(status: number): string {
    const codeMap: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      409: 'CONFLICT',
      500: 'INTERNAL_SERVER_ERROR',
    };
    return codeMap[status] || 'UNKNOWN_ERROR';
  }
}
