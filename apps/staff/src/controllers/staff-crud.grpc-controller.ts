import { StaffProto } from '@modern_erp/grpc-types';
import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';

import { RolePermission } from '../entities/role-permission.entity';
import { Role } from '../entities/role.entity';
import { Staff } from '../entities/staff.entity';
import { StaffCrudService } from '../services/staff-crud.service';

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
export class StaffCrudGrpcController {
  constructor(private crud: StaffCrudService) {}

  @GrpcMethod('StaffService', 'GetStaff')
  async getStaff(data: StaffProto.GetStaffRequest): Promise<StaffProto.GetStaffResponse> {
    const { staff, role, permissions } = await this.crud.getDetail(data.id);
    return {
      staff: toProtoStaff(staff),
      role: toProtoRole(role),
      permissions: toProtoPermissions(permissions),
    };
  }

  @GrpcMethod('StaffService', 'GetStaffDetail')
  async getDetail(data: StaffProto.GetStaffDetailRequest): Promise<StaffProto.StaffDetailResponse> {
    const { staff, role, permissions } = await this.crud.getDetail(data.id);
    return {
      staff: toProtoStaff(staff),
      role: toProtoRole(role),
      permissions: toProtoPermissions(permissions),
    };
  }

  @GrpcMethod('StaffService', 'ListStaff')
  async list(data: StaffProto.ListStaffRequest): Promise<StaffProto.ListStaffResponse> {
    const res = await this.crud.list({
      page: data.page,
      limit: data.limit,
      search: data.search,
      roleId: data.roleId || undefined,
      isActive: data.isActive,
    });
    return {
      items: res.items.map(toProtoStaff),
      total: res.total,
      page: res.page,
      limit: res.limit,
    };
  }

  @GrpcMethod('StaffService', 'CreateStaff')
  async create(data: StaffProto.CreateStaffRequest): Promise<StaffProto.StaffResponse> {
    const staff = await this.crud.create({
      name: data.name,
      email: data.email,
      phone: data.phone,
      password: data.password,
      roleId: data.roleId,
    });
    return { staff: toProtoStaff(staff) };
  }

  @GrpcMethod('StaffService', 'UpdateStaff')
  async update(data: StaffProto.UpdateStaffRequest): Promise<StaffProto.StaffResponse> {
    const staff = await this.crud.update({
      id: data.id,
      name: data.name,
      phone: data.phone,
      roleId: data.roleId,
      email: data.email,
    });
    return { staff: toProtoStaff(staff) };
  }

  @GrpcMethod('StaffService', 'DeleteStaff')
  delete(data: StaffProto.DeleteStaffRequest): Promise<StaffProto.SuccessResponse> {
    return this.crud.delete({ id: data.id });
  }

  @GrpcMethod('StaffService', 'RecoverStaff')
  async recover(data: StaffProto.RecoverStaffRequest): Promise<StaffProto.StaffResponse> {
    const staff = await this.crud.recover({ id: data.id });
    return { staff: toProtoStaff(staff) };
  }

  @GrpcMethod('StaffService', 'AdminChangeStaffPassword')
  adminChangePassword(
    data: StaffProto.AdminChangeStaffPasswordRequest,
  ): Promise<StaffProto.SuccessResponse> {
    return this.crud.adminChangePassword({ id: data.id, newPassword: data.newPassword });
  }
}
