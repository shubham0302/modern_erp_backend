import { StaffProto } from '@modern_erp/grpc-types';
import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';

import { RolePermission } from '../entities/role-permission.entity';
import { Role } from '../entities/role.entity';
import { Staff } from '../entities/staff.entity';
import { StaffAuthService } from '../services/staff-auth.service';

function toProtoStaff(s: Staff): StaffProto.Staff {
  return {
    id: s.id,
    name: s.name,
    email: s.email,
    phone: s.phone,
    roleId: s.roleId,
    isActive: s.isActive,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}

function toProtoRole(r: Role): StaffProto.Role {
  return {
    id: r.id,
    name: r.name,
    description: r.description ?? '',
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

function toProtoPermissions(ps: RolePermission[]): StaffProto.Permission[] {
  return ps.map((p) => ({ module: p.module, canRead: p.canRead, canWrite: p.canWrite }));
}

@Controller()
export class StaffAuthGrpcController {
  constructor(private auth: StaffAuthService) {}

  @GrpcMethod('StaffService', 'Login')
  async login(data: StaffProto.LoginRequest): Promise<StaffProto.AuthTokenResponse> {
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
      staff: {
        staff: toProtoStaff(res.staff),
        role: toProtoRole(res.role),
        permissions: toProtoPermissions(res.permissions),
      },
    };
  }

  @GrpcMethod('StaffService', 'Refresh')
  async refresh(data: StaffProto.RefreshRequest): Promise<StaffProto.AuthTokenResponse> {
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
      staff: {
        staff: toProtoStaff(res.staff),
        role: toProtoRole(res.role),
        permissions: toProtoPermissions(res.permissions),
      },
    };
  }

  @GrpcMethod('StaffService', 'Logout')
  logout(data: StaffProto.LogoutRequest): Promise<StaffProto.SuccessResponse> {
    return this.auth.logout({ refreshToken: data.refreshToken });
  }

  @GrpcMethod('StaffService', 'ChangePassword')
  changePassword(data: StaffProto.ChangePasswordRequest): Promise<StaffProto.SuccessResponse> {
    return this.auth.changePassword({
      staffId: data.staffId,
      currentPassword: data.currentPassword,
      newPassword: data.newPassword,
    });
  }
}
