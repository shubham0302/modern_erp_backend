import { ErrorCode } from '@modern_erp/common';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { ILike, IsNull, Repository } from 'typeorm';

import { Admin } from '../entities/admin.entity';
import { AdminActionType } from '../enums/admin-action-type.enum';

import { AdminSecurityLogService } from './admin-security-log.service';

function rpcError(errorCode: ErrorCode): RpcException {
  return new RpcException({ errorCode });
}

@Injectable()
export class AdminCrudService {
  private readonly bcryptRounds: number;

  constructor(
    config: ConfigService,
    @InjectRepository(Admin) private repo: Repository<Admin>,
    private log: AdminSecurityLogService,
  ) {
    this.bcryptRounds = parseInt(config.getOrThrow<string>('BCRYPT_ROUNDS'), 10);
  }

  private async assertSuperAdmin(actorId: string): Promise<Admin> {
    const actor = await this.repo.findOne({ where: { id: actorId } });
    if (!actor) throw rpcError(ErrorCode.ADMIN_NOT_FOUND);
    if (!actor.isActive) throw rpcError(ErrorCode.ACCOUNT_DEACTIVATED);
    if (!actor.isSuperAdmin) throw rpcError(ErrorCode.SUPER_ADMIN_REQUIRED);
    return actor;
  }

  async list(input: {
    actorId: string;
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<{ items: Admin[]; total: number; page: number; limit: number }> {
    await this.assertSuperAdmin(input.actorId);

    const page = input.page && input.page > 0 ? input.page : 1;
    const limit = input.limit && input.limit > 0 ? Math.min(input.limit, 200) : 50;
    const search = input.search?.trim();

    const [items, total] = await this.repo.findAndCount({
      where: search ? [{ name: ILike(`%${search}%`) }, { email: ILike(`%${search}%`) }] : {},
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total, page, limit };
  }

  async create(input: {
    actorId: string;
    name: string;
    email: string;
    phone: string;
    password: string;
    isSuperAdmin: boolean;
  }): Promise<Admin> {
    const actor = await this.assertSuperAdmin(input.actorId);

    const existing = await this.repo.findOne({ where: { email: input.email } });
    if (existing) throw rpcError(ErrorCode.EMAIL_ALREADY_EXISTS);

    const passwordHash = await bcrypt.hash(input.password, this.bcryptRounds);
    const saved = await this.repo.save(
      this.repo.create({
        name: input.name,
        email: input.email,
        phone: input.phone,
        passwordHash,
        isSuperAdmin: input.isSuperAdmin,
      }),
    );

    await this.log.write({
      adminId: actor.id,
      adminName: actor.name,
      actionType: AdminActionType.ADMIN_CREATED,
      description: `created admin ${saved.email}`,
      ip: null,
    });

    return saved;
  }

  async update(input: {
    actorId: string;
    id: string;
    name?: string;
    phone?: string;
    isActive?: boolean;
    isSuperAdmin?: boolean;
  }): Promise<Admin> {
    const actor = await this.assertSuperAdmin(input.actorId);
    const target = await this.repo.findOne({ where: { id: input.id } });
    if (!target) throw rpcError(ErrorCode.ADMIN_NOT_FOUND);

    if (target.isSuperAdmin && (input.isActive === false || input.isSuperAdmin === false)) {
      const activeSupers = await this.repo.count({
        where: { isSuperAdmin: true, isActive: true, deletedAt: IsNull() },
      });
      if (activeSupers <= 1) throw rpcError(ErrorCode.SUPER_ADMIN_PROTECTED);
    }

    const patch: Partial<Admin> = {};
    if (input.name !== undefined) patch.name = input.name;
    if (input.phone !== undefined) patch.phone = input.phone;
    if (input.isActive !== undefined) patch.isActive = input.isActive;
    if (input.isSuperAdmin !== undefined) patch.isSuperAdmin = input.isSuperAdmin;

    await this.repo.update({ id: target.id }, patch);
    const updated = await this.repo.findOneOrFail({ where: { id: target.id } });

    await this.log.write({
      adminId: actor.id,
      adminName: actor.name,
      actionType: AdminActionType.ADMIN_UPDATED,
      description: `updated admin ${updated.email}: ${Object.keys(patch).join(', ')}`,
      ip: null,
    });

    return updated;
  }

  async delete(input: { actorId: string; id: string }): Promise<{ success: boolean }> {
    const actor = await this.assertSuperAdmin(input.actorId);

    if (actor.id === input.id) throw rpcError(ErrorCode.SUPER_ADMIN_PROTECTED);

    const target = await this.repo.findOne({ where: { id: input.id } });
    if (!target) throw rpcError(ErrorCode.ADMIN_NOT_FOUND);

    if (target.isSuperAdmin) {
      const activeSupers = await this.repo.count({
        where: { isSuperAdmin: true, isActive: true, deletedAt: IsNull() },
      });
      if (activeSupers <= 1) throw rpcError(ErrorCode.SUPER_ADMIN_PROTECTED);
    }

    await this.repo.softDelete({ id: target.id });

    await this.log.write({
      adminId: actor.id,
      adminName: actor.name,
      actionType: AdminActionType.ADMIN_DELETED,
      description: `deleted admin ${target.email}`,
      ip: null,
    });

    return { success: true };
  }

  async getById(id: string): Promise<Admin> {
    const admin = await this.repo.findOne({ where: { id } });
    if (!admin) throw rpcError(ErrorCode.ADMIN_NOT_FOUND);
    return admin;
  }
}
