import { AdminProto } from '@modern_erp/grpc-types';
import { Controller } from '@nestjs/common';
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
  constructor(private auth: AdminAuthService) {}

  @GrpcMethod('AdminService', 'Login')
  async login(data: AdminProto.LoginRequest): Promise<AdminProto.AuthTokenResponse> {
    const res = await this.auth.login({
      email: data.email,
      password: data.password,
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
