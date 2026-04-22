import { ErrorCode, Module as BusinessModule } from '@modern_erp/common';
import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';

import { RolePermission } from '../entities/role-permission.entity';
import { Role } from '../entities/role.entity';
import { Staff } from '../entities/staff.entity';
import { StaffActionType } from '../enums/staff-action-type.enum';

import { StaffSecurityLogService } from './staff-security-log.service';

function rpcError(errorCode: ErrorCode): RpcException {
  return new RpcException({ errorCode });
}

export interface PermissionInput {
  module: string;
  canRead: boolean;
  canWrite: boolean;
}

export interface RoleWithPermissions {
  role: Role;
  permissions: RolePermission[];
}

@Injectable()
export class RoleService {
  constructor(
    @InjectRepository(Role) private roleRepo: Repository<Role>,
    @InjectRepository(RolePermission) private permRepo: Repository<RolePermission>,
    @InjectRepository(Staff) private staffRepo: Repository<Staff>,
    private log: StaffSecurityLogService,
  ) {}

  async list(input: {
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<{ items: Role[]; total: number; page: number; limit: number }> {
    const page = input.page && input.page > 0 ? input.page : 1;
    const limit = input.limit && input.limit > 0 ? Math.min(input.limit, 200) : 50;
    const search = input.search?.trim();
    const [items, total] = await this.roleRepo.findAndCount({
      where: search ? { name: ILike(`%${search}%`) } : {},
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { items, total, page, limit };
  }

  async getById(id: string): Promise<RoleWithPermissions> {
    const role = await this.roleRepo.findOne({ where: { id } });
    if (!role) throw rpcError(ErrorCode.ROLE_NOT_FOUND);
    const permissions = await this.permRepo.find({ where: { roleId: id } });
    return { role, permissions };
  }

  async create(input: {
    name: string;
    description?: string;
    permissions: PermissionInput[];
  }): Promise<RoleWithPermissions> {
    this.assertValidModules(input.permissions);
    const existing = await this.roleRepo.findOne({ where: { name: input.name } });
    if (existing) throw rpcError(ErrorCode.ROLE_NAME_ALREADY_EXISTS);

    const role = await this.roleRepo.save(
      this.roleRepo.create({
        name: input.name,
        description: input.description ?? null,
      }),
    );

    const permissions = await this.permRepo.save(
      input.permissions.map((p) =>
        this.permRepo.create({
          roleId: role.id,
          module: p.module,
          canRead: p.canRead,
          canWrite: p.canWrite,
        }),
      ),
    );

    await this.log.write({
      staffId: null,
      staffName: null,
      actionType: StaffActionType.ROLE_CREATED,
      description: `created role ${role.name}`,
      ip: null,
    });

    return { role, permissions };
  }

  async update(input: { id: string; name?: string; description?: string }): Promise<Role> {
    const role = await this.roleRepo.findOne({ where: { id: input.id } });
    if (!role) throw rpcError(ErrorCode.ROLE_NOT_FOUND);

    const patch: Partial<Role> = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.description !== undefined) patch.description = input.description;

    await this.roleRepo.update({ id: role.id }, patch);
    const updated = await this.roleRepo.findOneOrFail({ where: { id: role.id } });

    await this.log.write({
      staffId: null,
      staffName: null,
      actionType: StaffActionType.ROLE_UPDATED,
      description: `updated role ${updated.name}`,
      ip: null,
    });
    return updated;
  }

  async delete(input: { id: string }): Promise<{ success: boolean }> {
    const role = await this.roleRepo.findOne({ where: { id: input.id } });
    if (!role) throw rpcError(ErrorCode.ROLE_NOT_FOUND);

    const inUse = await this.staffRepo.count({ where: { roleId: input.id } });
    if (inUse > 0) throw rpcError(ErrorCode.ROLE_IN_USE);

    await this.roleRepo.softDelete({ id: role.id });
    await this.log.write({
      staffId: null,
      staffName: null,
      actionType: StaffActionType.ROLE_DELETED,
      description: `deleted role ${role.name}`,
      ip: null,
    });
    return { success: true };
  }

  async replacePermissions(input: {
    roleId: string;
    permissions: PermissionInput[];
  }): Promise<RolePermission[]> {
    this.assertValidModules(input.permissions);
    const role = await this.roleRepo.findOne({ where: { id: input.roleId } });
    if (!role) throw rpcError(ErrorCode.ROLE_NOT_FOUND);

    await this.permRepo.delete({ roleId: input.roleId });
    const permissions = await this.permRepo.save(
      input.permissions.map((p) =>
        this.permRepo.create({
          roleId: input.roleId,
          module: p.module,
          canRead: p.canRead,
          canWrite: p.canWrite,
        }),
      ),
    );

    await this.log.write({
      staffId: null,
      staffName: null,
      actionType: StaffActionType.ROLE_PERMISSIONS_REPLACED,
      description: `replaced permissions for ${role.name}`,
      ip: null,
    });

    return permissions;
  }

  private assertValidModules(perms: PermissionInput[]): void {
    const valid = new Set<string>(Object.values(BusinessModule));
    for (const p of perms) {
      if (!valid.has(p.module)) {
        throw rpcError(ErrorCode.VALIDATION_FAILED);
      }
    }
  }
}
