import { ErrorCode, Module as BusinessModule } from '@modern_erp/common';
import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, ILike, Repository } from 'typeorm';

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
    private dataSource: DataSource,
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

    return this.dataSource.transaction(async (manager) => {
      const roleRepo = manager.getRepository(Role);
      const permRepo = manager.getRepository(RolePermission);

      const existing = await roleRepo.findOne({ where: { name: input.name } });
      if (existing) throw rpcError(ErrorCode.ROLE_NAME_ALREADY_EXISTS);

      const role = await roleRepo.save(
        roleRepo.create({
          name: input.name,
          description: input.description ?? null,
        }),
      );

      const permissions = input.permissions.length
        ? await permRepo.save(
            input.permissions.map((p) =>
              permRepo.create({
                roleId: role.id,
                module: p.module,
                canRead: p.canRead,
                canWrite: p.canWrite,
              }),
            ),
          )
        : [];

      await this.log.write(
        {
          staffId: null,
          staffName: null,
          actionType: StaffActionType.ROLE_CREATED,
          description: `created role ${role.name}`,
          ip: null,
        },
        manager,
      );

      return { role, permissions };
    });
  }

  async update(input: {
    id: string;
    name?: string;
    description?: string;
    permissions?: PermissionInput[];
  }): Promise<RoleWithPermissions> {
    if (input.permissions) this.assertValidModules(input.permissions);

    return this.dataSource.transaction(async (manager) => {
      const roleRepo = manager.getRepository(Role);
      const permRepo = manager.getRepository(RolePermission);

      const role = await roleRepo.findOne({ where: { id: input.id } });
      if (!role) throw rpcError(ErrorCode.ROLE_NOT_FOUND);

      const changed: string[] = [];
      const patch: Partial<Role> = {};
      if (input.name !== undefined) {
        patch.name = input.name;
        changed.push('name');
      }
      if (input.description !== undefined) {
        patch.description = input.description;
        changed.push('description');
      }
      if (Object.keys(patch).length > 0) {
        await roleRepo.update({ id: role.id }, patch);
      }

      let permissions: RolePermission[];
      if (input.permissions !== undefined) {
        await permRepo.delete({ roleId: role.id });
        permissions = input.permissions.length
          ? await permRepo.save(
              input.permissions.map((p) =>
                permRepo.create({
                  roleId: role.id,
                  module: p.module,
                  canRead: p.canRead,
                  canWrite: p.canWrite,
                }),
              ),
            )
          : [];
        changed.push('permissions');
      } else {
        permissions = await permRepo.find({ where: { roleId: role.id } });
      }

      const updated = await roleRepo.findOneOrFail({ where: { id: role.id } });

      await this.log.write(
        {
          staffId: null,
          staffName: null,
          actionType: StaffActionType.ROLE_UPDATED,
          description: `updated role ${updated.name}: ${changed.join(', ') || 'no changes'}`,
          ip: null,
        },
        manager,
      );

      return { role: updated, permissions };
    });
  }

  async delete(input: { id: string }): Promise<{ success: boolean }> {
    return this.dataSource.transaction(async (manager) => {
      const roleRepo = manager.getRepository(Role);
      const staffRepo = manager.getRepository(Staff);

      const role = await roleRepo.findOne({ where: { id: input.id } });
      if (!role) throw rpcError(ErrorCode.ROLE_NOT_FOUND);

      const inUse = await staffRepo.count({ where: { roleId: input.id } });
      if (inUse > 0) throw rpcError(ErrorCode.ROLE_IN_USE);

      await roleRepo.softDelete({ id: role.id });
      await this.log.write(
        {
          staffId: null,
          staffName: null,
          actionType: StaffActionType.ROLE_DELETED,
          description: `deleted role ${role.name}`,
          ip: null,
        },
        manager,
      );
      return { success: true };
    });
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
