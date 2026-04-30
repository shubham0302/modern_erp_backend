import { ErrorCode } from '@modern_erp/common';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { DataSource, IsNull, Repository } from 'typeorm';

import { RolePermission } from '../entities/role-permission.entity';
import { Role } from '../entities/role.entity';
import { StaffRefreshToken } from '../entities/staff-refresh-token.entity';
import { Staff } from '../entities/staff.entity';
import { StaffActionType } from '../enums/staff-action-type.enum';

import { StaffSecurityLogService } from './staff-security-log.service';

function rpcError(errorCode: ErrorCode): RpcException {
  return new RpcException({ errorCode });
}

export interface StaffWithRole {
  staff: Staff;
  role: Role;
  permissions: RolePermission[];
}

@Injectable()
export class StaffCrudService {
  private readonly bcryptRounds: number;

  constructor(
    config: ConfigService,
    @InjectRepository(Staff) private staffRepo: Repository<Staff>,
    @InjectRepository(Role) private roleRepo: Repository<Role>,
    @InjectRepository(RolePermission) private permRepo: Repository<RolePermission>,
    @InjectRepository(StaffRefreshToken)
    private tokenRepo: Repository<StaffRefreshToken>,
    private log: StaffSecurityLogService,
    private dataSource: DataSource,
  ) {
    this.bcryptRounds = parseInt(config.getOrThrow<string>('BCRYPT_ROUNDS'), 10);
  }

  async list(input: {
    page?: number;
    limit?: number;
    search?: string;
    roleId?: string;
    isActive?: boolean;
  }): Promise<{ items: Staff[]; total: number; page: number; limit: number }> {
    const page = input.page && input.page > 0 ? input.page : 1;
    const limit = input.limit && input.limit > 0 ? Math.min(input.limit, 200) : 50;

    const qb = this.staffRepo.createQueryBuilder('s').where('s.deleted_at IS NULL');
    if (input.roleId) qb.andWhere('s.role_id = :roleId', { roleId: input.roleId });
    if (input.isActive !== undefined) qb.andWhere('s.is_active = :a', { a: input.isActive });
    if (input.search?.trim()) {
      const q = `%${input.search.trim()}%`;
      qb.andWhere('(s.name ILIKE :q OR s.email ILIKE :q)', { q });
    }
    qb.orderBy('s.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit };
  }

  async getDetail(id: string): Promise<StaffWithRole> {
    const staff = await this.staffRepo.findOne({
      where: { id },
      relations: ['role', 'role.permissions'],
    });
    if (!staff) throw rpcError(ErrorCode.STAFF_NOT_FOUND);
    if (!staff.role) throw rpcError(ErrorCode.ROLE_NOT_FOUND);
    return { staff, role: staff.role, permissions: staff.role.permissions ?? [] };
  }

  async create(input: {
    name: string;
    email: string;
    phone: string;
    password: string;
    roleId: string;
  }): Promise<Staff> {
    const [role, existing] = await Promise.all([
      this.roleRepo.findOne({ where: { id: input.roleId }, select: ['id'] }),
      this.staffRepo.findOne({ where: { email: input.email }, select: ['id'] }),
    ]);
    if (!role) throw rpcError(ErrorCode.ROLE_NOT_FOUND);
    if (existing) throw rpcError(ErrorCode.EMAIL_ALREADY_EXISTS);

    const passwordHash = await bcrypt.hash(input.password, this.bcryptRounds);
    const saved = await this.staffRepo.save(
      this.staffRepo.create({
        name: input.name,
        email: input.email,
        phone: input.phone,
        passwordHash,
        roleId: input.roleId,
      }),
    );

    await this.log.write({
      staffId: saved.id,
      staffName: saved.name,
      actionType: StaffActionType.STAFF_CREATED,
      description: `created staff ${saved.email}`,
      ip: null,
    });

    return saved;
  }

  async update(input: {
    id: string;
    name?: string;
    phone?: string;
    roleId?: string;
    email?: string;
  }): Promise<Staff> {
    const [staff, role] = await Promise.all([
      this.staffRepo.findOne({ where: { id: input.id } }),
      input.roleId
        ? this.roleRepo.findOne({ where: { id: input.roleId }, select: ['id'] })
        : Promise.resolve(null),
    ]);
    if (!staff) throw rpcError(ErrorCode.STAFF_NOT_FOUND);
    if (input.roleId && !role) throw rpcError(ErrorCode.ROLE_NOT_FOUND);

    if (input.email !== undefined && input.email !== staff.email) {
      const collision = await this.staffRepo.findOne({
        where: { email: input.email },
        select: ['id'],
      });
      if (collision) throw rpcError(ErrorCode.EMAIL_ALREADY_EXISTS);
    }

    const patch: Partial<Staff> = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.phone !== undefined) patch.phone = input.phone;
    if (input.roleId !== undefined) patch.roleId = input.roleId;
    if (input.email !== undefined) patch.email = input.email;

    await this.staffRepo.update({ id: staff.id }, patch);
    const updated = await this.staffRepo.findOneOrFail({ where: { id: staff.id } });

    await this.log.write({
      staffId: updated.id,
      staffName: updated.name,
      actionType: StaffActionType.STAFF_UPDATED,
      description: `updated staff ${updated.email}: ${Object.keys(patch).join(', ')}`,
      ip: null,
    });
    return updated;
  }

  async delete(input: { id: string }): Promise<{ success: boolean }> {
    return this.dataSource.transaction(async (manager) => {
      const staffRepo = manager.getRepository(Staff);

      const staff = await staffRepo.findOne({ where: { id: input.id } });
      if (!staff) throw rpcError(ErrorCode.STAFF_NOT_FOUND);

      await staffRepo.softDelete({ id: input.id });
      await staffRepo.update({ id: input.id }, { isActive: false });

      await this.log.write(
        {
          staffId: staff.id,
          staffName: staff.name,
          actionType: StaffActionType.STAFF_DELETED,
          description: `deleted staff ${staff.email}`,
          ip: null,
        },
        manager,
      );
      return { success: true };
    });
  }

  async recover(input: { id: string }): Promise<Staff> {
    return this.dataSource.transaction(async (manager) => {
      const staffRepo = manager.getRepository(Staff);

      const target = await staffRepo.findOne({
        where: { id: input.id },
        withDeleted: true,
      });
      if (!target) throw rpcError(ErrorCode.STAFF_NOT_FOUND);

      await staffRepo.restore({ id: target.id });
      await staffRepo.update({ id: target.id }, { isActive: true });

      const recovered = await staffRepo.findOneOrFail({ where: { id: target.id } });

      await this.log.write(
        {
          staffId: recovered.id,
          staffName: recovered.name,
          actionType: StaffActionType.STAFF_RECOVERED,
          description: `recovered staff ${recovered.email}`,
          ip: null,
        },
        manager,
      );
      return recovered;
    });
  }

  async adminChangePassword(input: {
    id: string;
    newPassword: string;
  }): Promise<{ success: boolean }> {
    const staff = await this.staffRepo.findOne({ where: { id: input.id } });
    if (!staff) throw rpcError(ErrorCode.STAFF_NOT_FOUND);
    const newHash = await bcrypt.hash(input.newPassword, this.bcryptRounds);
    await this.staffRepo.update({ id: staff.id }, { passwordHash: newHash });
    await this.tokenRepo.update(
      { staffId: staff.id, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );
    await this.log.write({
      staffId: staff.id,
      staffName: staff.name,
      actionType: StaffActionType.PASSWORD_CHANGED,
      description: 'admin-forced password change',
      ip: null,
    });
    return { success: true };
  }
}
