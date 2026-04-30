import { ErrorCode } from '@modern_erp/common';
import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, IsNull, Repository } from 'typeorm';

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

  async listBySize(sizeId: string, opts?: { activeOnly?: boolean }): Promise<SizeFinish[]> {
    const [size, items] = await Promise.all([
      this.sizeRepo.findOne({ where: { id: sizeId }, select: ['id'] }),
      this.repo.find({
        where: opts?.activeOnly ? { sizeId, isActive: true } : { sizeId },
        relations: ['size', 'finish'],
        order: { createdAt: 'DESC' },
      }),
    ]);
    if (!size) throw rpcError(ErrorCode.SIZE_NOT_FOUND);
    return items;
  }

  async addFinishToSize(input: { sizeId: string; finishId: string }): Promise<SizeFinish> {
    const [size, finish, existing] = await Promise.all([
      this.sizeRepo.findOne({ where: { id: input.sizeId } }),
      this.finishRepo.findOne({ where: { id: input.finishId } }),
      this.repo.findOne({
        where: { sizeId: input.sizeId, finishId: input.finishId, deletedAt: IsNull() },
        select: ['id'],
      }),
    ]);
    if (!size) throw rpcError(ErrorCode.SIZE_NOT_FOUND);
    if (!finish) throw rpcError(ErrorCode.FINISH_NOT_FOUND);
    if (existing) throw rpcError(ErrorCode.DUPLICATE_MAPPING);

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
