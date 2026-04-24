import { status as GrpcStatus } from '@grpc/grpc-js';
import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { Observable, throwError } from 'rxjs';

import { ErrorCode } from '../enums/error-codes.enum';

const ERROR_CODE_TO_GRPC_STATUS: Record<string, number> = {
  [ErrorCode.MISSING_TOKEN]: GrpcStatus.UNAUTHENTICATED,
  [ErrorCode.TOKEN_EXPIRED]: GrpcStatus.UNAUTHENTICATED,
  [ErrorCode.INVALID_TOKEN]: GrpcStatus.UNAUTHENTICATED,
  [ErrorCode.PLATFORM_MISMATCH]: GrpcStatus.UNAUTHENTICATED,
  [ErrorCode.INVALID_CREDENTIALS]: GrpcStatus.UNAUTHENTICATED,
  [ErrorCode.EMAIL_NOT_FOUND]: GrpcStatus.UNAUTHENTICATED,
  [ErrorCode.WRONG_PASSWORD]: GrpcStatus.UNAUTHENTICATED,
  [ErrorCode.REFRESH_TOKEN_REUSE_DETECTED]: GrpcStatus.UNAUTHENTICATED,

  [ErrorCode.ACCESS_SUSPENDED]: GrpcStatus.PERMISSION_DENIED,
  [ErrorCode.SUPER_ADMIN_REQUIRED]: GrpcStatus.PERMISSION_DENIED,
  [ErrorCode.SUPER_ADMIN_PROTECTED]: GrpcStatus.PERMISSION_DENIED,

  [ErrorCode.USER_NOT_FOUND]: GrpcStatus.NOT_FOUND,
  [ErrorCode.ADMIN_NOT_FOUND]: GrpcStatus.NOT_FOUND,
  [ErrorCode.STAFF_NOT_FOUND]: GrpcStatus.NOT_FOUND,
  [ErrorCode.ROLE_NOT_FOUND]: GrpcStatus.NOT_FOUND,
  [ErrorCode.ROUTE_NOT_FOUND]: GrpcStatus.NOT_FOUND,

  [ErrorCode.EMAIL_ALREADY_EXISTS]: GrpcStatus.ALREADY_EXISTS,
  [ErrorCode.ROLE_NAME_ALREADY_EXISTS]: GrpcStatus.ALREADY_EXISTS,
  [ErrorCode.ROLE_IN_USE]: GrpcStatus.ALREADY_EXISTS,

  [ErrorCode.ACCOUNT_DEACTIVATED]: GrpcStatus.FAILED_PRECONDITION,

  [ErrorCode.VALIDATION_FAILED]: GrpcStatus.INVALID_ARGUMENT,
  [ErrorCode.PASSWORD_TOO_WEAK]: GrpcStatus.INVALID_ARGUMENT,

  [ErrorCode.RATE_LIMITED]: GrpcStatus.RESOURCE_EXHAUSTED,

  [ErrorCode.INTERNAL_ERROR]: GrpcStatus.INTERNAL,
  [ErrorCode.SERVICE_UNAVAILABLE]: GrpcStatus.UNAVAILABLE,
  [ErrorCode.UNKNOWN_ERROR]: GrpcStatus.UNKNOWN,
};

interface RpcErrorPayload {
  errorCode?: unknown;
  [key: string]: unknown;
}

interface WireError {
  code: number;
  details: string;
  message: string;
}

// The gateway parses `details` as JSON to extract errorCode. grpc-js's
// default serverErrorToStatus falls back to 'Unknown Error' when the thrown
// object lacks `code`/`details`, which drops the RpcException payload on the
// wire. This filter explicitly shapes the error so grpc-js preserves it.
@Catch()
export class GrpcExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, _host: ArgumentsHost): Observable<never> {
    if (exception instanceof RpcException) {
      const raw = exception.getError();
      const payload: RpcErrorPayload =
        typeof raw === 'object' && raw !== null
          ? (raw as RpcErrorPayload)
          : { errorCode: ErrorCode.UNKNOWN_ERROR };

      const errorCode =
        typeof payload.errorCode === 'string' ? payload.errorCode : ErrorCode.UNKNOWN_ERROR;

      return throwError(
        (): WireError => ({
          code: ERROR_CODE_TO_GRPC_STATUS[errorCode] ?? GrpcStatus.UNKNOWN,
          details: JSON.stringify(payload),
          message: errorCode,
        }),
      );
    }

    return throwError(
      (): WireError => ({
        code: GrpcStatus.INTERNAL,
        details: JSON.stringify({ errorCode: ErrorCode.INTERNAL_ERROR }),
        message: exception instanceof Error ? exception.message : 'Internal error',
      }),
    );
  }
}
