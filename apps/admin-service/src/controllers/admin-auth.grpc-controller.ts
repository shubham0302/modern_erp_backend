import * as grpc from '@grpc/grpc-js';
import { AdminProto } from '@modern_erp/grpc-types';
import { Controller, Logger } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';

import { Admin } from '../entities/admin.entity';
import { AdminAuthService } from '../services/admin-auth.service';

function toProto(a: Admin): AdminProto.Admin {
  return {
    id: a.id,
    name: a.name,
    email: a.email,
    phone: a.phone,
    isSuperAdmin: a.isSuperAdmin,
    isActive: a.isActive,
    createdAt: a.createdAt.toISOString(),
    updatedAt: a.updatedAt.toISOString(),
  };
}

@Controller()
export class AdminAuthGrpcController {
  private readonly perfLogger = new Logger('LoginPerf');

  constructor(private auth: AdminAuthService) {}

  @GrpcMethod('AdminService', 'Login')
  async login(
    data: AdminProto.LoginRequest,
    metadata: grpc.Metadata,
    call: grpc.ServerUnaryCall<AdminProto.LoginRequest, AdminProto.AuthTokenResponse>,
  ): Promise<AdminProto.AuthTokenResponse> {
    const perf: { dbStart?: number; dbEnd?: number } = {};
    const reqIdRaw = metadata.get('x-request-id')[0];
    const reqId = typeof reqIdRaw === 'string' ? reqIdRaw : 'unknown';
    try {
      const res = await this.auth.login(
        {
          email: data.email,
          password: data.password,
          ip: data.ip,
          deviceId: data.deviceId || null,
          appVersion: data.appVersion,
        },
        perf,
      );
      return {
        accessToken: res.accessToken,
        refreshToken: res.refreshToken,
        expiresIn: res.expiresIn,
        admin: toProto(res.admin),
      };
    } finally {
      if (perf.dbStart !== undefined && perf.dbEnd !== undefined) {
        this.perfLogger.log(`reqId=${reqId} db=${perf.dbEnd - perf.dbStart}ms`);
        const md = new grpc.Metadata();
        md.set('x-perf-db-start', String(perf.dbStart));
        md.set('x-perf-db-end', String(perf.dbEnd));
        try {
          call.sendMetadata(md);
        } catch {
          // ignore — client may have disconnected
        }
      }
    }
  }

  @GrpcMethod('AdminService', 'Refresh')
  async refresh(data: AdminProto.RefreshRequest): Promise<AdminProto.AuthTokenResponse> {
    const res = await this.auth.refresh({
      refreshToken: data.refreshToken,
      ip: data.ip,
      deviceId: data.deviceId || null,
      appVersion: data.appVersion,
    });
    return {
      accessToken: res.accessToken,
      refreshToken: res.refreshToken,
      expiresIn: res.expiresIn,
      admin: toProto(res.admin),
    };
  }

  @GrpcMethod('AdminService', 'Logout')
  logout(data: AdminProto.LogoutRequest): Promise<AdminProto.SuccessResponse> {
    return this.auth.logout({ refreshToken: data.refreshToken });
  }

  @GrpcMethod('AdminService', 'ChangePassword')
  changePassword(data: AdminProto.ChangePasswordRequest): Promise<AdminProto.SuccessResponse> {
    return this.auth.changePassword({
      adminId: data.adminId,
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });
  }
}
