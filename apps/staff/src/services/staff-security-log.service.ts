import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, EntityManager, FindOptionsWhere, Repository } from 'typeorm';

import { StaffSecurityLog } from '../entities/staff-security-log.entity';
import { StaffActionType } from '../enums/staff-action-type.enum';

export interface WriteLogInput {
  staffId: string | null;
  staffName: string | null;
  actionType: StaffActionType;
  description?: string | null;
  ip?: string | null;
}

export interface ListLogInput {
  page?: number;
  limit?: number;
  staffId?: string;
  actionType?: string;
  from?: string;
  to?: string;
}

export interface ListLogResult {
  items: StaffSecurityLog[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class StaffSecurityLogService {
  constructor(
    @InjectRepository(StaffSecurityLog)
    private repo: Repository<StaffSecurityLog>,
  ) {}

  async write(input: WriteLogInput, manager?: EntityManager): Promise<void> {
    const repo = manager ? manager.getRepository(StaffSecurityLog) : this.repo;
    const row = repo.create({
      staffId: input.staffId,
      staffName: input.staffName,
      actionType: input.actionType,
      description: input.description ?? null,
      ip: input.ip ?? null,
    });
    await repo.save(row);
  }

  async list(input: ListLogInput): Promise<ListLogResult> {
    const page = input.page && input.page > 0 ? input.page : 1;
    const limit = input.limit && input.limit > 0 ? Math.min(input.limit, 200) : 50;

    const where: FindOptionsWhere<StaffSecurityLog> = {};
    if (input.staffId) where.staffId = input.staffId;
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
