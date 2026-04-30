import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, EntityManager, FindOptionsWhere, Repository } from 'typeorm';

import { AdminSecurityLog } from '../entities/admin-security-log.entity';
import { AdminActionType } from '../enums/admin-action-type.enum';

export interface WriteLogInput {
  adminId: string | null;
  adminName: string | null;
  actionType: AdminActionType;
  description?: string | null;
  ip?: string | null;
}

export interface ListLogInput {
  page?: number;
  limit?: number;
  adminId?: string;
  actionType?: string;
  from?: string;
  to?: string;
}

export interface ListLogResult {
  items: AdminSecurityLog[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class AdminSecurityLogService {
  constructor(
    @InjectRepository(AdminSecurityLog)
    private repo: Repository<AdminSecurityLog>,
  ) {}

  async write(input: WriteLogInput, manager?: EntityManager): Promise<void> {
    const repo = manager ? manager.getRepository(AdminSecurityLog) : this.repo;
    const row = repo.create({
      adminId: input.adminId,
      adminName: input.adminName,
      actionType: input.actionType,
      description: input.description ?? null,
      ip: input.ip ?? null,
    });
    await repo.save(row);
  }

  async list(input: ListLogInput): Promise<ListLogResult> {
    const page = input.page && input.page > 0 ? input.page : 1;
    const limit = input.limit && input.limit > 0 ? Math.min(input.limit, 200) : 50;

    const where: FindOptionsWhere<AdminSecurityLog> = {};
    if (input.adminId) where.adminId = input.adminId;
    if (input.actionType) where.actionType = input.actionType;
    if (input.from && input.to) {
      where.createdAt = Between(new Date(input.from), new Date(input.to));
    }

    const [items, total] = await this.repo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total, page, limit };
  }
}
