import { ErrorCode } from '@modern_erp/common';
import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, FindOptionsWhere, ILike, In, IsNull, Repository } from 'typeorm';

import { Design } from '../entities/design.entity';
import { DesignSizeFinish } from '../entities/design-size-finish.entity';
import { SeriesSizeFinish } from '../entities/series-size-finish.entity';
import { Series } from '../entities/series.entity';
import { SizeFinish } from '../entities/size-finish.entity';

import { cascadeDesignsForRemovedSsfIds } from './design.service';

export type SeriesWithSizeFinishes = Series & { sizeFinishes: SizeFinish[] };

function rpcError(errorCode: ErrorCode): RpcException {
  return new RpcException({ errorCode });
}

@Injectable()
export class SeriesService {
  constructor(
    @InjectRepository(Series) private repo: Repository<Series>,
    @InjectRepository(SeriesSizeFinish) private ssfRepo: Repository<SeriesSizeFinish>,
    private dataSource: DataSource,
  ) {}

  async list(input: {
    page?: number;
    limit?: number;
    search?: string;
    activeOnly?: boolean;
    includeDeleted?: boolean;
  }): Promise<{ items: SeriesWithSizeFinishes[]; total: number; page: number; limit: number }> {
    const page = input.page && input.page > 0 ? input.page : 1;
    const limit = input.limit && input.limit > 0 ? Math.min(input.limit, 200) : 50;
    const search = input.search?.trim();

    const where: FindOptionsWhere<Series> = {};
    if (search) where.name = ILike(`%${search}%`);
    if (input.activeOnly) where.isActive = true;

    const [seriesRows, total] = await this.repo.findAndCount({
      where,
      withDeleted: input.includeDeleted ?? false,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const sizeFinishesBySeriesId = await this.fetchSizeFinishesBySeriesIds(
      seriesRows.map((s) => s.id),
    );
    const items: SeriesWithSizeFinishes[] = seriesRows.map((s) =>
      Object.assign(s, { sizeFinishes: sizeFinishesBySeriesId.get(s.id) ?? [] }),
    );

    return { items, total, page, limit };
  }

  private async fetchSizeFinishesBySeriesIds(
    seriesIds: string[],
  ): Promise<Map<string, SizeFinish[]>> {
    const map = new Map<string, SizeFinish[]>();
    if (seriesIds.length === 0) return map;

    const mappings = await this.ssfRepo.find({
      where: { seriesId: In(seriesIds), isActive: true },
      relations: ['sizeFinish', 'sizeFinish.size', 'sizeFinish.finish'],
      order: { createdAt: 'DESC' },
    });

    for (const m of mappings) {
      const sf = m.sizeFinish;
      if (!sf || !sf.isActive) continue;
      if (!sf.size || !sf.size.isActive) continue;
      if (!sf.finish || !sf.finish.isActive) continue;
      const arr = map.get(m.seriesId) ?? [];
      arr.push(sf);
      map.set(m.seriesId, arr);
    }
    return map;
  }

  async getById(id: string, opts?: { activeOnly?: boolean }): Promise<SeriesWithSizeFinishes> {
    const where: FindOptionsWhere<Series> = { id };
    if (opts?.activeOnly) where.isActive = true;
    const series = await this.repo.findOne({ where });
    if (!series) throw rpcError(ErrorCode.SERIES_NOT_FOUND);

    const sizeFinishesBySeriesId = await this.fetchSizeFinishesBySeriesIds([series.id]);
    return Object.assign(series, {
      sizeFinishes: sizeFinishesBySeriesId.get(series.id) ?? [],
    });
  }

  async create(input: {
    name: string;
    sizeFinishIds?: string[];
    userId: string;
    platform: string;
    userName: string;
  }): Promise<Series> {
    const name = input.name.trim();
    const sizeFinishIds = Array.from(new Set((input.sizeFinishIds ?? []).filter(Boolean)));

    return this.dataSource.transaction(async (manager) => {
      const seriesRepo = manager.getRepository(Series);
      const ssfRepo = manager.getRepository(SeriesSizeFinish);
      const sizeFinishRepo = manager.getRepository(SizeFinish);

      const existing = await seriesRepo.findOne({ where: { name: ILike(name) } });
      if (existing) throw rpcError(ErrorCode.DUPLICATE_NAME);

      if (sizeFinishIds.length > 0) {
        const found = await sizeFinishRepo.find({
          where: { id: In(sizeFinishIds), deletedAt: IsNull() },
          select: ['id'],
        });
        if (found.length !== sizeFinishIds.length) {
          throw rpcError(ErrorCode.SIZE_FINISH_NOT_FOUND);
        }
      }

      const series = await seriesRepo.save(
        seriesRepo.create({
          name,
          updatedBy: input.userId,
          updatedByPlatform: input.platform,
          updatedByName: input.userName,
        }),
      );

      if (sizeFinishIds.length > 0) {
        await ssfRepo.save(
          sizeFinishIds.map((sizeFinishId) =>
            ssfRepo.create({ seriesId: series.id, sizeFinishId }),
          ),
        );
      }

      return series;
    });
  }

  async update(input: {
    id: string;
    name?: string;
    isActive?: boolean;
    sizeFinishIds?: string[];
    deletedSizeFinishIds?: string[];
    userId: string;
    platform: string;
    userName: string;
  }): Promise<Series> {
    const idsToAdd = Array.from(new Set((input.sizeFinishIds ?? []).filter(Boolean)));
    const idsToRemove = Array.from(new Set((input.deletedSizeFinishIds ?? []).filter(Boolean)));
    const overlap = idsToAdd.filter((id) => idsToRemove.includes(id));
    if (overlap.length > 0) throw rpcError(ErrorCode.VALIDATION_FAILED);

    return this.dataSource.transaction(async (manager) => {
      const seriesRepo = manager.getRepository(Series);
      const ssfRepo = manager.getRepository(SeriesSizeFinish);
      const sizeFinishRepo = manager.getRepository(SizeFinish);
      const designRepo = manager.getRepository(Design);

      const target = await seriesRepo.findOne({ where: { id: input.id } });
      if (!target) throw rpcError(ErrorCode.SERIES_NOT_FOUND);

      const patch: Partial<Series> = {
        updatedBy: input.userId,
        updatedByPlatform: input.platform,
        updatedByName: input.userName,
      };
      if (input.name !== undefined) {
        const name = input.name.trim();
        const dup = await seriesRepo.findOne({ where: { name: ILike(name) } });
        if (dup && dup.id !== target.id) throw rpcError(ErrorCode.DUPLICATE_NAME);
        patch.name = name;
      }
      if (input.isActive !== undefined) patch.isActive = input.isActive;

      await seriesRepo.update({ id: target.id }, patch);

      if (idsToAdd.length > 0) {
        const found = await sizeFinishRepo.find({
          where: { id: In(idsToAdd), deletedAt: IsNull() },
          select: ['id'],
        });
        if (found.length !== idsToAdd.length) throw rpcError(ErrorCode.SIZE_FINISH_NOT_FOUND);

        const existing = await ssfRepo.find({
          where: { seriesId: target.id, sizeFinishId: In(idsToAdd) },
          withDeleted: true,
        });
        const existingBySfId = new Map(existing.map((e) => [e.sizeFinishId, e]));

        const reviveIds: string[] = [];
        const toCreate: string[] = [];
        for (const sizeFinishId of idsToAdd) {
          const m = existingBySfId.get(sizeFinishId);
          if (!m) toCreate.push(sizeFinishId);
          else if (m.deletedAt) reviveIds.push(m.id);
        }

        if (reviveIds.length > 0) {
          await ssfRepo.restore({ id: In(reviveIds) });
          await ssfRepo.update({ id: In(reviveIds) }, { isActive: true });
        }
        if (toCreate.length > 0) {
          await ssfRepo.save(
            toCreate.map((sizeFinishId) =>
              ssfRepo.create({ seriesId: target.id, sizeFinishId }),
            ),
          );
        }
      }

      if (idsToRemove.length > 0) {
        const liveMappings = await ssfRepo.find({
          where: {
            seriesId: target.id,
            sizeFinishId: In(idsToRemove),
            deletedAt: IsNull(),
          },
          select: ['id'],
        });

        if (liveMappings.length > 0) {
          const ssfIds = liveMappings.map((m) => m.id);
          await cascadeDesignsForRemovedSsfIds(manager, ssfIds);
          await ssfRepo.softDelete({ id: In(ssfIds) });
          await ssfRepo.update({ id: In(ssfIds) }, { isActive: false });
        }
      }

      return seriesRepo.findOneOrFail({ where: { id: target.id } });
    });
  }

  async delete(input: {
    id: string;
    userId: string;
    platform: string;
    userName: string;
  }): Promise<{ success: boolean }> {
    return this.dataSource.transaction(async (manager) => {
      const seriesRepo = manager.getRepository(Series);
      const ssfRepo = manager.getRepository(SeriesSizeFinish);
      const designRepo = manager.getRepository(Design);

      const target = await seriesRepo.findOne({ where: { id: input.id } });
      if (!target) throw rpcError(ErrorCode.SERIES_NOT_FOUND);

      const liveDesigns = await designRepo.find({
        where: { seriesId: target.id, deletedAt: IsNull() },
        select: ['id'],
      });
      if (liveDesigns.length > 0) {
        const designIds = liveDesigns.map((d) => d.id);
        const dsfRepo = manager.getRepository(DesignSizeFinish);
        await dsfRepo.softDelete({ designId: In(designIds) });
        await dsfRepo.update({ designId: In(designIds) }, { isActive: false });
        await designRepo.softDelete({ id: In(designIds) });
        await designRepo.update({ id: In(designIds) }, { isActive: false });
      }

      const liveSsf = await ssfRepo.find({
        where: { seriesId: target.id, deletedAt: IsNull() },
        select: ['id'],
      });
      if (liveSsf.length > 0) {
        const ssfIds = liveSsf.map((s) => s.id);
        await ssfRepo.softDelete({ id: In(ssfIds) });
        await ssfRepo.update({ id: In(ssfIds) }, { isActive: false });
      }

      await seriesRepo.softDelete({ id: target.id });
      await seriesRepo.update(
        { id: target.id },
        {
          isActive: false,
          updatedBy: input.userId,
          updatedByPlatform: input.platform,
          updatedByName: input.userName,
        },
      );

      return { success: true };
    });
  }

  async restore(input: {
    id: string;
    userId: string;
    platform: string;
    userName: string;
  }): Promise<Series> {
    return this.dataSource.transaction(async (manager) => {
      const seriesRepo = manager.getRepository(Series);

      const target = await seriesRepo.findOne({ where: { id: input.id }, withDeleted: true });
      if (!target) throw rpcError(ErrorCode.SERIES_NOT_FOUND);

      const conflict = await seriesRepo.findOne({
        where: { name: ILike(target.name), deletedAt: IsNull() },
      });
      if (conflict && conflict.id !== target.id) throw rpcError(ErrorCode.DUPLICATE_NAME);

      await seriesRepo.restore({ id: target.id });
      await seriesRepo.update(
        { id: target.id },
        {
          isActive: true,
          updatedBy: input.userId,
          updatedByPlatform: input.platform,
          updatedByName: input.userName,
        },
      );

      return seriesRepo.findOneOrFail({ where: { id: target.id } });
    });
  }
}
