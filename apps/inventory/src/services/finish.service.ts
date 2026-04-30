import { ErrorCode } from '@modern_erp/common';
import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, FindOptionsWhere, ILike, IsNull, Repository } from 'typeorm';

import { Finish } from '../entities/finish.entity';
import { SizeFinish } from '../entities/size-finish.entity';

function rpcError(errorCode: ErrorCode): RpcException {
  return new RpcException({ errorCode });
}

@Injectable()
export class FinishService {
  constructor(
    @InjectRepository(Finish) private repo: Repository<Finish>,
    @InjectRepository(SizeFinish) private sizeFinishRepo: Repository<SizeFinish>,
    private dataSource: DataSource,
  ) {}

  async list(input: {
    page?: number;
    limit?: number;
    search?: string;
    activeOnly?: boolean;
  }): Promise<{ items: Finish[]; total: number; page: number; limit: number }> {
    const page = input.page && input.page > 0 ? input.page : 1;
    const limit = input.limit && input.limit > 0 ? Math.min(input.limit, 200) : 50;
    const search = input.search?.trim();

    const where: FindOptionsWhere<Finish> = {};
    if (search) where.name = ILike(`%${search}%`);
    if (input.activeOnly) where.isActive = true;

    const [items, total] = await this.repo.findAndCount({
      where,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total, page, limit };
  }

  async getById(id: string, opts?: { activeOnly?: boolean }): Promise<Finish> {
    const where: FindOptionsWhere<Finish> = { id };
    if (opts?.activeOnly) where.isActive = true;
    const finish = await this.repo.findOne({ where });
    if (!finish) throw rpcError(ErrorCode.FINISH_NOT_FOUND);
    return finish;
  }

  async create(input: { name: string }): Promise<Finish> {
    const name = input.name.trim();
    const existing = await this.repo.findOne({ where: { name: ILike(name) } });
    if (existing) throw rpcError(ErrorCode.DUPLICATE_NAME);

    return this.repo.save(this.repo.create({ name }));
  }

  async update(input: { id: string; name?: string; isActive?: boolean }): Promise<Finish> {
    const target = await this.repo.findOne({ where: { id: input.id } });
    if (!target) throw rpcError(ErrorCode.FINISH_NOT_FOUND);

    const patch: Partial<Finish> = {};
    if (input.name !== undefined) {
      const name = input.name.trim();
      const dup = await this.repo.findOne({ where: { name: ILike(name) } });
      if (dup && dup.id !== target.id) throw rpcError(ErrorCode.DUPLICATE_NAME);
      patch.name = name;
    }
    if (input.isActive !== undefined) patch.isActive = input.isActive;

    await this.repo.update({ id: target.id }, patch);
    return this.repo.findOneOrFail({ where: { id: target.id } });
  }

  async delete(input: { id: string }): Promise<{ success: boolean }> {
    return this.dataSource.transaction(async (manager) => {
      const finishRepo = manager.getRepository(Finish);
      const sizeFinishRepo = manager.getRepository(SizeFinish);

      const target = await finishRepo.findOne({ where: { id: input.id } });
      if (!target) throw rpcError(ErrorCode.FINISH_NOT_FOUND);

      const inUse = await sizeFinishRepo.count({
        where: { finishId: target.id, deletedAt: IsNull() },
      });
      if (inUse > 0) throw rpcError(ErrorCode.RESOURCE_IN_USE);

      await finishRepo.softDelete({ id: target.id });
      await finishRepo.update({ id: target.id }, { isActive: false });

      return { success: true };
    });
  }

  async restore(input: { id: string }): Promise<Finish> {
    return this.dataSource.transaction(async (manager) => {
      const finishRepo = manager.getRepository(Finish);

      const target = await finishRepo.findOne({ where: { id: input.id }, withDeleted: true });
      if (!target) throw rpcError(ErrorCode.FINISH_NOT_FOUND);

      const conflict = await finishRepo.findOne({
        where: { name: ILike(target.name), deletedAt: IsNull() },
      });
      if (conflict && conflict.id !== target.id) throw rpcError(ErrorCode.DUPLICATE_NAME);

      await finishRepo.restore({ id: target.id });
      await finishRepo.update({ id: target.id }, { isActive: true });

      return finishRepo.findOneOrFail({ where: { id: target.id } });
    });
  }
}
