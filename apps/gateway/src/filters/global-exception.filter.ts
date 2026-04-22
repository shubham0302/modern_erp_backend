import { GatewayRequest, GrpcErrorMeta, RequestErrorContext } from '@modern_erp/common';
import { ModernERPLogger } from '@modern_erp/logger';
import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';

import { ErrorLocalizerService } from '../services/error-localizer.service';

interface HttpExceptionResponse {
  errorCode?: string;
  details?: unknown;
  message?: string | string[];
}

interface GrpcError extends Error {
  code: number;
  details: string;
  metadata?: { get: (key: string) => string[] };
}

@Catch()
@Injectable()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly isProduction: boolean;

  constructor(
    private logger: ModernERPLogger,
    private errorLocalizer: ErrorLocalizerService,
    config: ConfigService,
  ) {
    this.isProduction = config.getOrThrow<string>('NODE_ENV') === 'production';
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<GatewayRequest>();
    const res = ctx.getResponse<Response>();

    const requestId = req.requestId ?? 'no-request-id';
    let statusCode: number = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode = 'INTERNAL_ERROR';
    let details: unknown = undefined;
    let grpcMeta: GrpcErrorMeta | undefined;

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const response = exception.getResponse() as HttpExceptionResponse | string;
      if (typeof response === 'object' && response !== null) {
        errorCode = response.errorCode ?? this.statusToErrorCode(statusCode);
        details = response.details ?? response.message;
      } else {
        errorCode = this.statusToErrorCode(statusCode);
      }
    } else if (this.isGrpcError(exception)) {
      statusCode = this.grpcToHttpStatus(exception.code);
      errorCode = this.extractErrorCodeFromGrpc(exception) ?? 'SERVICE_ERROR';
      grpcMeta = {
        code: exception.code,
        details: exception.details,
        service: exception.metadata?.get('service')?.[0] ?? 'unknown',
      };
    }

    if (exception instanceof Error) {
      const errorCtx: RequestErrorContext = {
        requestId,
        method: req.method,
        path: req.originalUrl,
        query: req.query as Record<string, unknown>,
        body: req.body as Record<string, unknown>,
        ip: req.userContext?.ip ?? req.ip ?? 'unknown',
        deviceId: req.userContext?.deviceId,
        userAgent: req.userContext?.appVersion,
        userId: req.userContext?.userId ?? req.jwtPayload?.sub,
        platform: req.userContext?.platform ?? req.targetPlatform,
        appVersion: req.userContext?.appVersion ?? req.jwtPayload?.version,
      };
      this.logger.captureRequestError(exception, errorCtx, grpcMeta);
    }

    const lang = req.userContext?.language ?? 'en';
    const { message, localizedDetails } = this.errorLocalizer.resolve(errorCode, lang, details);

    res.status(statusCode).json({
      success: false,
      error: {
        statusCode,
        errorCode,
        message,
        requestId,
        ...(localizedDetails !== undefined ? { details: localizedDetails } : {}),
        ...(!this.isProduction ? { path: req.originalUrl } : {}),
      },
    });
  }

  private isGrpcError(e: unknown): e is GrpcError {
    return (
      e instanceof Error &&
      'code' in e &&
      'details' in e &&
      typeof (e as GrpcError).code === 'number'
    );
  }

  /**
   * RpcException payloads arrive as JSON-serialized strings in `error.details`.
   * Extract errorCode from them if present.
   */
  private extractErrorCodeFromGrpc(e: GrpcError): string | undefined {
    try {
      const parsed: unknown = JSON.parse(e.details);
      if (typeof parsed === 'object' && parsed !== null && 'errorCode' in parsed) {
        const code = (parsed as { errorCode: unknown }).errorCode;
        if (typeof code === 'string') return code;
      }
    } catch {
      // details was not valid JSON — fall through
    }
    return undefined;
  }

  private statusToErrorCode(status: number): string {
    const map: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      429: 'RATE_LIMITED',
      500: 'INTERNAL_ERROR',
      503: 'SERVICE_UNAVAILABLE',
    };
    return map[status] ?? 'UNKNOWN_ERROR';
  }

  private grpcToHttpStatus(code: number): number {
    const map: Record<number, number> = {
      0: 200,
      1: 499,
      2: 500,
      3: 400,
      4: 504,
      5: 404,
      6: 409,
      7: 403,
      8: 429,
      9: 400,
      10: 409,
      11: 400,
      12: 501,
      13: 500,
      14: 503,
      15: 500,
      16: 401,
    };
    return map[code] ?? 500;
  }
}
