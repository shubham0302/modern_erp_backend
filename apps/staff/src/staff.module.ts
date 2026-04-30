import { buildPostgresOptions, GrpcExceptionFilter } from '@modern_erp/common';
import { ModernERPLoggerModule } from '@modern_erp/logger';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';

import { HealthGrpcController } from './controllers/health.grpc-controller';
import { RoleGrpcController } from './controllers/role.grpc-controller';
import { StaffAuthGrpcController } from './controllers/staff-auth.grpc-controller';
import { StaffCrudGrpcController } from './controllers/staff-crud.grpc-controller';
import { StaffSecurityLogGrpcController } from './controllers/staff-security-log.grpc-controller';
import { RolePermission } from './entities/role-permission.entity';
import { Role } from './entities/role.entity';
import { StaffRefreshToken } from './entities/staff-refresh-token.entity';
import { StaffSecurityLog } from './entities/staff-security-log.entity';
import { Staff } from './entities/staff.entity';
import { RoleService } from './services/role.service';
import { StaffAuthService } from './services/staff-auth.service';
import { StaffCrudService } from './services/staff-crud.service';
import { StaffSecurityLogService } from './services/staff-security-log.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ModernERPLoggerModule,
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        buildPostgresOptions(config, [Role, RolePermission, Staff, StaffRefreshToken, StaffSecurityLog]),
    }),
    TypeOrmModule.forFeature([Role, RolePermission, Staff, StaffRefreshToken, StaffSecurityLog]),
  ],
  providers: [
    { provide: APP_FILTER, useClass: GrpcExceptionFilter },
    StaffSecurityLogService,
    RoleService,
    StaffAuthService,
    StaffCrudService,
  ],
  controllers: [
    HealthGrpcController,
    StaffAuthGrpcController,
    RoleGrpcController,
    StaffCrudGrpcController,
    StaffSecurityLogGrpcController,
  ],
})
export class StaffModule {}
