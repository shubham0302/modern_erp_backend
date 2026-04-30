// Enums
export { Platform } from './enums/platform.enum';
export { Module } from './enums/module.enum';
export { ErrorCode } from './enums/error-codes.enum';

// Interfaces
export type { JwtPayload } from './interfaces/platform.interface';
export type {
  UserContext,
  CachedUser,
  CachedAdmin,
  CachedStaff,
  ModulePermission,
} from './interfaces/user-context.interface';
export type { GatewayRequest } from './interfaces/gateway-request.interface';
export type {
  RequestErrorContext,
  GrpcErrorMeta,
  KafkaErrorContext,
  ServiceErrorContext,
  SystemErrorContext,
} from './interfaces/logger.interface';

// Decorators
export { Public, IS_PUBLIC_KEY } from './decorators/public.decorator';
export { AnyPlatform, IS_ANY_PLATFORM_KEY } from './decorators/any-platform.decorator';
export { UserCtx } from './decorators/user-context.decorator';

// Filters
export { GrpcExceptionFilter } from './filters/grpc-exception.filter';

// DB
export { buildPostgresOptions } from './db/typeorm-pool';

// gRPC
export { extractGrpcContext } from './grpc/grpc-context.util';
export type { GrpcRequestContext } from './grpc/grpc-context.util';
export { GRPC_SERVICES } from './grpc/grpc-services.config';
export type {
  GrpcServiceName,
  GrpcMethodName,
  GrpcServiceDef,
  GrpcMethodDef,
} from './grpc/grpc-services.config';
