import { ModernERPLoggerModule } from '@modern_erp/logger';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';

import { AdminAuthController } from './controllers/admin/admin-auth.controller';
import { AdminManagementController } from './controllers/admin/admin-management.controller';
import { AdminMeController } from './controllers/admin/admin-me.controller';
import { RoleManagementController } from './controllers/admin/role-management.controller';
import { SecurityLogsController } from './controllers/admin/security-logs.controller';
import { StaffManagementController } from './controllers/admin/staff-management.controller';
import { HealthController } from './controllers/health.controller';
import { DesignController } from './controllers/inventory/design.controller';
import { FinishController } from './controllers/inventory/finish.controller';
import { InventoryMappingController } from './controllers/inventory/mapping.controller';
import { SeriesController } from './controllers/inventory/series.controller';
import { SizeController } from './controllers/inventory/size.controller';
import { StaffAuthController } from './controllers/staff/staff-auth.controller';
import { StaffMeController } from './controllers/staff/staff-me.controller';
import { GlobalExceptionFilter } from './filters/global-exception.filter';
import { GrpcClientRegistry } from './grpc/grpc-client.registry';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PlatformCrossCheckGuard } from './guards/platform-cross-check.guard';
import { PlatformResolverGuard } from './guards/platform-resolver.guard';
import { RateLimiterGuard } from './guards/rate-limiter.guard';
import { UserContextGuard } from './guards/user-context.guard';
import { RequestIdInterceptor } from './interceptors/request-id.interceptor';
import { ResponseTransformInterceptor } from './interceptors/response-transform.interceptor';
import { RedisModule } from './redis/redis.module';
import { ErrorLocalizerService } from './services/error-localizer.service';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), ModernERPLoggerModule, RedisModule],
  providers: [
    GrpcClientRegistry,
    ErrorLocalizerService,

    { provide: APP_INTERCEPTOR, useClass: RequestIdInterceptor },
    { provide: APP_INTERCEPTOR, useClass: ResponseTransformInterceptor },

    { provide: APP_GUARD, useClass: PlatformResolverGuard },
    { provide: APP_GUARD, useClass: RateLimiterGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PlatformCrossCheckGuard },
    { provide: APP_GUARD, useClass: UserContextGuard },

    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
  ],
  controllers: [
    HealthController,
    AdminAuthController,
    AdminMeController,
    AdminManagementController,
    RoleManagementController,
    StaffManagementController,
    SecurityLogsController,
    StaffAuthController,
    StaffMeController,
    SizeController,
    FinishController,
    SeriesController,
    DesignController,
    InventoryMappingController,
  ],
})
export class AppModule {}
