import { ErrorCode } from '@modern_erp/common';
import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, FindOptionsWhere, IsNull, Repository } from 'typeorm';

import { Finish } from '../entities/finish.entity';
import { SeriesSizeFinish } from '../entities/series-size-finish.entity';
import { SizeFinish } from '../entities/size-finish.entity';
import { Size } from '../entities/size.entity';

function rpcError(errorCode: ErrorCode): RpcException {
  return new RpcException({ errorCode });
}

@Injectable()
export class SizeFinishService {
  constructor(
    @InjectRepository(SizeFinish) private repo: Repository<SizeFinish>,
    @InjectRepository(Size) private sizeRepo: Repository<Size>,
    @InjectRepository(Finish) private finishRepo: Repository<Finish>,
    @InjectRepository(SeriesSizeFinish) private ssfRepo: Repository<SeriesSizeFinish>,
    private dataSource: DataSource,
  ) {}

  async getById(id: string): Promise<SizeFinish> {
    const item = await this.repo.findOne({
      where: { id },
      relations: ['size', 'finish'],
    });
    if (!item) throw rpcError(ErrorCode.SIZE_FINISH_NOT_FOUND);
    return item;
  }

  async listBySize(
    sizeId: string,
    opts?: { activeOnly?: boolean; includeDeleted?: boolean },
  ): Promise<SizeFinish[]> {
    const [size, items] = await Promise.all([
      this.sizeRepo.findOne({
        where: { id: sizeId },
        withDeleted: opts?.includeDeleted ?? false,
        select: ['id'],
      }),
      this.repo.find({
        where: opts?.activeOnly ? { sizeId, isActive: true } : { sizeId },
        withDeleted: opts?.includeDeleted ?? false,
        relations: ['size', 'finish'],
        order: { createdAt: 'DESC' },
      }),
    ]);
    if (!size) throw rpcError(ErrorCode.SIZE_NOT_FOUND);
    return items;
  }

  async list(input: {
    page?: number;
    limit?: number;
    activeOnly?: boolean;
    includeDeleted?: boolean;
    fetchAll?: boolean;
  }): Promise<{ items: SizeFinish[]; total: number; page: number; limit: number }> {
    const where: FindOptionsWhere<SizeFinish> = {};
    if (input.activeOnly) where.isActive = true;

    if (input.fetchAll) {
      const items = await this.repo.find({
        where,
        withDeleted: input.includeDeleted ?? false,
        relations: ['size', 'finish'],
        order: { createdAt: 'DESC' },
      });
      return { items, total: items.length, page: 1, limit: items.length };
    }

    const page = input.page && input.page > 0 ? input.page : 1;
    const limit = input.limit && input.limit > 0 ? Math.min(input.limit, 200) : 50;

    const [items, total] = await this.repo.findAndCount({
      where,
      withDeleted: input.includeDeleted ?? false,
      relations: ['size', 'finish'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total, page, limit };
  }

  async listByFinish(
    finishId: string,
    opts?: { activeOnly?: boolean; includeDeleted?: boolean },
  ): Promise<SizeFinish[]> {
    const [finish, items] = await Promise.all([
      this.finishRepo.findOne({
        where: { id: finishId },
        withDeleted: opts?.includeDeleted ?? false,
        select: ['id'],
      }),
      this.repo.find({
        where: opts?.activeOnly ? { finishId, isActive: true } : { finishId },
        withDeleted: opts?.includeDeleted ?? false,
        relations: ['size', 'finish'],
        order: { createdAt: 'DESC' },
      }),
    ]);
    if (!finish) throw rpcError(ErrorCode.FINISH_NOT_FOUND);
    return items;
  }

  async addFinishToSize(input: { sizeId: string; finishId: string }): Promise<SizeFinish> {
    const [size, finish, existing] = await Promise.all([
      this.sizeRepo.findOne({ where: { id: input.sizeId } }),
      this.finishRepo.findOne({ where: { id: input.finishId } }),
      this.repo.findOne({
        where: { sizeId: input.sizeId, finishId: input.finishId },
        withDeleted: true,
      }),
    ]);
    if (!size) throw rpcError(ErrorCode.SIZE_NOT_FOUND);
    if (!finish) throw rpcError(ErrorCode.FINISH_NOT_FOUND);

    if (existing && !existing.deletedAt) throw rpcError(ErrorCode.DUPLICATE_MAPPING);

    if (existing) {
      await this.repo.restore({ id: existing.id });
      await this.repo.update({ id: existing.id }, { isActive: true });
      const revived = await this.repo.findOneOrFail({
        where: { id: existing.id },
        relations: ['size', 'finish'],
      });
      return revived;
    }

    const saved = await this.repo.save(
      this.repo.create({ sizeId: input.sizeId, finishId: input.finishId }),
    );
    saved.size = size;
    saved.finish = finish;
    return saved;
  }

  async removeFinishFromSize(input: { sizeFinishId: string }): Promise<{ success: boolean }> {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(SizeFinish);
      const ssfRepo = manager.getRepository(SeriesSizeFinish);

      const target = await repo.findOne({ where: { id: input.sizeFinishId } });
      if (!target) throw rpcError(ErrorCode.SIZE_FINISH_NOT_FOUND);

      const inUse = await ssfRepo.count({
        where: { sizeFinishId: target.id, deletedAt: IsNull() },
      });
      if (inUse > 0) throw rpcError(ErrorCode.RESOURCE_IN_USE);

      await repo.softDelete({ id: target.id });
      await repo.update({ id: target.id }, { isActive: false });

      return { success: true };
    });
  }
}
