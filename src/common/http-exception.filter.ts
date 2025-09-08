import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    const isHttp = exception instanceof HttpException;
    const status = isHttp ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const payload = isHttp ? (exception as HttpException).getResponse() : { message: 'Internal server error' };

    res.status(status).json({
      ok: false,
      statusCode: status,
      path: req.originalUrl,
      method: req.method,
      error: payload,
      timestamp: new Date().toISOString(),
    });
  }
}