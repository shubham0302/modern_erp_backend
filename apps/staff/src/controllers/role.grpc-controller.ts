import { StaffProto } from '@modern_erp/grpc-types';
import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';

import { RolePermission } from '../entities/role-permission.entity';
import { Role } from '../entities/role.entity';
import { RoleService } from '../services/role.service';

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
export class RoleGrpcController {
  constructor(private svc: RoleService) {}

  @GrpcMethod('StaffService', 'ListRoles')
  async list(data: StaffProto.ListRolesRequest): Promise<StaffProto.ListRolesResponse> {
    const res = await this.svc.list({
      page: data.page,
      limit: data.limit,
      search: data.search,
    });
    return {
      items: res.items.map(toProtoRole),
      total: res.total,
      page: res.page,
      limit: res.limit,
    };
  }

  @GrpcMethod('StaffService', 'GetRole')
  async get(data: StaffProto.GetRoleRequest): Promise<StaffProto.RoleDetailResponse> {
    const { role, permissions } = await this.svc.getById(data.id);
    return { role: toProtoRole(role), permissions: toProtoPermissions(permissions) };
  }

  @GrpcMethod('StaffService', 'CreateRole')
  async create(data: StaffProto.CreateRoleRequest): Promise<StaffProto.RoleDetailResponse> {
    const { role, permissions } = await this.svc.create({
      name: data.name,
      description: data.description,
      permissions: data.permissions,
    });
    return { role: toProtoRole(role), permissions: toProtoPermissions(permissions) };
  }

  @GrpcMethod('StaffService', 'UpdateRole')
  async update(data: StaffProto.UpdateRoleRequest): Promise<StaffProto.RoleDetailResponse> {
    const { role, permissions } = await this.svc.update({
      id: data.id,
      name: data.name,
      description: data.description,
      permissions: data.updatePermissions ? data.permissions : undefined,
    });
    return { role: toProtoRole(role), permissions: toProtoPermissions(permissions) };
  }

  @GrpcMethod('StaffService', 'DeleteRole')
  delete(data: StaffProto.DeleteRoleRequest): Promise<StaffProto.SuccessResponse> {
    return this.svc.delete({ id: data.id });
  }
}
