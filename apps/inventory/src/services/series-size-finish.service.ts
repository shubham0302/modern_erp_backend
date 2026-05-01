import { ErrorCode } from '@modern_erp/common';
import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { Design } from '../entities/design.entity';
import { DesignSizeFinish } from '../entities/design-size-finish.entity';
import { SeriesSizeFinish } from '../entities/series-size-finish.entity';
import { Series } from '../entities/series.entity';
import { SizeFinish } from '../entities/size-finish.entity';

function rpcError(errorCode: ErrorCode): RpcException {
  return new RpcException({ errorCode });
}

@Injectable()
export class SeriesSizeFinishService {
  constructor(
    @InjectRepository(SeriesSizeFinish) private repo: Repository<SeriesSizeFinish>,
    @InjectRepository(Series) private seriesRepo: Repository<Series>,
    @InjectRepository(SizeFinish) private sizeFinishRepo: Repository<SizeFinish>,
    private dataSource: DataSource,
  ) {}

  async getById(id: string): Promise<SeriesSizeFinish> {
    const item = await this.repo.findOne({
      where: { id },
      relations: ['series', 'sizeFinish', 'sizeFinish.size', 'sizeFinish.finish'],
    });
    if (!item) throw rpcError(ErrorCode.SERIES_SIZE_FINISH_NOT_FOUND);
    return item;
  }

  async listBySeries(
    seriesId: string,
    opts?: { activeOnly?: boolean },
  ): Promise<SeriesSizeFinish[]> {
    const [series, items] = await Promise.all([
      this.seriesRepo.findOne({ where: { id: seriesId }, select: ['id'] }),
      this.repo.find({
        where: opts?.activeOnly ? { seriesId, isActive: true } : { seriesId },
        relations: ['series', 'sizeFinish', 'sizeFinish.size', 'sizeFinish.finish'],
        order: { createdAt: 'DESC' },
      }),
    ]);
    if (!series) throw rpcError(ErrorCode.SERIES_NOT_FOUND);
    return items;
  }

  async addSeriesToSizeFinish(input: {
    seriesId: string;
    sizeFinishId: string;
  }): Promise<SeriesSizeFinish> {
    const [series, sizeFinish, existing] = await Promise.all([
      this.seriesRepo.findOne({ where: { id: input.seriesId } }),
      this.sizeFinishRepo.findOne({
        where: { id: input.sizeFinishId },
        relations: ['size', 'finish'],
      }),
      this.repo.findOne({
        where: { seriesId: input.seriesId, sizeFinishId: input.sizeFinishId },
        withDeleted: true,
      }),
    ]);
    if (!series) throw rpcError(ErrorCode.SERIES_NOT_FOUND);
    if (!sizeFinish) throw rpcError(ErrorCode.SIZE_FINISH_NOT_FOUND);

    if (existing && !existing.deletedAt) throw rpcError(ErrorCode.DUPLICATE_MAPPING);

    if (existing) {
      await this.repo.restore({ id: existing.id });
      await this.repo.update({ id: existing.id }, { isActive: true });
      const revived = await this.repo.findOneOrFail({
        where: { id: existing.id },
        relations: ['series', 'sizeFinish', 'sizeFinish.size', 'sizeFinish.finish'],
      });
      return revived;
    }

    const saved = await this.repo.save(
      this.repo.create({ seriesId: input.seriesId, sizeFinishId: input.sizeFinishId }),
    );
    saved.series = series;
    saved.sizeFinish = sizeFinish;
    return saved;
  }

  async removeSeriesFromSizeFinish(input: {
    seriesSizeFinishId: string;
  }): Promise<{ success: boolean }> {
    return this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(SeriesSizeFinish);
      const dsfRepo = manager.getRepository(DesignSizeFinish);

      const target = await repo.findOne({ where: { id: input.seriesSizeFinishId } });
      if (!target) throw rpcError(ErrorCode.SERIES_SIZE_FINISH_NOT_FOUND);

      const inUse = await dsfRepo
        .createQueryBuilder('dsf')
        .innerJoin(Design, 'd', 'd.id = dsf.design_id')
        .where('d.series_id = :seriesId', { seriesId: target.seriesId })
        .andWhere('dsf.size_finish_id = :sfId', { sfId: target.sizeFinishId })
        .andWhere('dsf.deleted_at IS NULL')
        .andWhere('d.deleted_at IS NULL')
        .getCount();
      if (inUse > 0) throw rpcError(ErrorCode.RESOURCE_IN_USE);

      await repo.softDelete({ id: target.id });
      await repo.update({ id: target.id }, { isActive: false });

      return { success: true };
    });
  }
}
