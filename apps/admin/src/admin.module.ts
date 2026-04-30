import { buildPostgresOptions, GrpcExceptionFilter } from '@modern_erp/common';
import { ModernERPLoggerModule } from '@modern_erp/logger';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AdminAuthGrpcController } from './controllers/admin-auth.grpc-controller';
import { AdminCrudGrpcController } from './controllers/admin-crud.grpc-controller';
import { AdminSecurityLogGrpcController } from './controllers/admin-security-log.grpc-controller';
import { HealthGrpcController } from './controllers/health.grpc-controller';
import { AdminRefreshToken } from './entities/admin-refresh-token.entity';
import { AdminSecurityLog } from './entities/admin-security-log.entity';
import { Admin } from './entities/admin.entity';
import { AdminAuthService } from './services/admin-auth.service';
import { AdminCrudService } from './services/admin-crud.service';
import { AdminSecurityLogService } from './services/admin-security-log.service';
import { SuperAdminSeederService } from './services/super-admin-seeder.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ModernERPLoggerModule,
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        buildPostgresOptions(config, [Admin, AdminRefreshToken, AdminSecurityLog]),
    }),
    TypeOrmModule.forFeature([Admin, AdminRefreshToken, AdminSecurityLog]),
  ],
  providers: [
    { provide: APP_FILTER, useClass: GrpcExceptionFilter },
    AdminSecurityLogService,
    AdminAuthService,
    AdminCrudService,
    SuperAdminSeederService,
  ],
  controllers: [
    HealthGrpcController,
    AdminAuthGrpcController,
    AdminCrudGrpcController,
    AdminSecurityLogGrpcController,
  ],
})
export class AdminModule {}
