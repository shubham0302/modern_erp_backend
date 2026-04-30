import { AdminProto } from '@modern_erp/grpc-types';
import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';

import { Admin } from '../entities/admin.entity';
import { AdminCrudService } from '../services/admin-crud.service';

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
export class AdminCrudGrpcController {
  constructor(private crud: AdminCrudService) {}

  @GrpcMethod('AdminService', 'GetAdmin')
  async getAdmin(data: AdminProto.GetAdminRequest): Promise<AdminProto.GetAdminResponse> {
    const admin = await this.crud.getById(data.id);
    return { admin: toProto(admin) };
  }

  @GrpcMethod('AdminService', 'ListAdmins')
  async list(data: AdminProto.ListAdminsRequest): Promise<AdminProto.ListAdminsResponse> {
    const res = await this.crud.list({
      actorId: data.actorId,
      page: data.page,
      limit: data.limit,
      search: data.search,
    });
    return {
      items: res.items.map(toProto),
      total: res.total,
      page: res.page,
      limit: res.limit,
    };
  }

  @GrpcMethod('AdminService', 'CreateAdmin')
  async create(data: AdminProto.CreateAdminRequest): Promise<AdminProto.AdminResponse> {
    const admin = await this.crud.create({
      actorId: data.actorId,
      name: data.name,
      email: data.email,
      phone: data.phone,
      password: data.password,
      isSuperAdmin: data.isSuperAdmin,
    });
    return { admin: toProto(admin) };
  }

  @GrpcMethod('AdminService', 'UpdateAdmin')
  async update(data: AdminProto.UpdateAdminRequest): Promise<AdminProto.AdminResponse> {
    const admin = await this.crud.update({
      actorId: data.actorId,
      id: data.id,
      name: data.name,
      phone: data.phone,
      isActive: data.isActive,
      isSuperAdmin: data.isSuperAdmin,
    });
    return { admin: toProto(admin) };
  }

  @GrpcMethod('AdminService', 'DeleteAdmin')
  delete(data: AdminProto.DeleteAdminRequest): Promise<AdminProto.SuccessResponse> {
    return this.crud.delete({ actorId: data.actorId, id: data.id });
  }

  @GrpcMethod('AdminService', 'RestoreAdmin')
  async restore(data: AdminProto.RestoreAdminRequest): Promise<AdminProto.AdminResponse> {
    const admin = await this.crud.restore({ actorId: data.actorId, id: data.id });
    return { admin: toProto(admin) };
  }
}
