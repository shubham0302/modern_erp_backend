import { ErrorCode } from '@modern_erp/common';
import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  FindOptionsWhere,
  ILike,
  In,
  IsNull,
  Repository,
} from 'typeorm';

import { Design } from '../entities/design.entity';
import { DesignSizeFinish } from '../entities/design-size-finish.entity';
import { Series } from '../entities/series.entity';
import { SeriesSizeFinish } from '../entities/series-size-finish.entity';
import { SizeFinish } from '../entities/size-finish.entity';

export async function cascadeDesignsForRemovedSsfIds(
  manager: EntityManager,
  ssfIds: string[],
): Promise<void> {
  if (ssfIds.length === 0) return;
  const dsfRepo = manager.getRepository(DesignSizeFinish);
  const designRepo = manager.getRepository(Design);

  const affected = await dsfRepo
    .createQueryBuilder('dsf')
    .innerJoin(Design, 'd', 'd.id = dsf.design_id')
    .innerJoin(
      SeriesSizeFinish,
      'ssf',
      'ssf.series_id = d.series_id AND ssf.size_finish_id = dsf.size_finish_id',
    )
    .where('ssf.id IN (:...ssfIds)', { ssfIds })
    .andWhere('dsf.deleted_at IS NULL')
    .select(['dsf.id', 'dsf.designId'])
    .getMany();

  if (affected.length === 0) return;
  const dsfIds = affected.map((r) => r.id);
  await dsfRepo.softDelete({ id: In(dsfIds) });
  await dsfRepo.update({ id: In(dsfIds) }, { isActive: false });

  const designIds = Array.from(new Set(affected.map((r) => r.designId)));
  const remaining = await dsfRepo.find({
    where: { designId: In(designIds), deletedAt: IsNull() },
    select: ['designId'],
  });
  const stillHas = new Set(remaining.map((r) => r.designId));
  const orphaned = designIds.filter((id) => !stillHas.has(id));
  if (orphaned.length > 0) {
    await designRepo.softDelete({ id: In(orphaned) });
    await designRepo.update({ id: In(orphaned) }, { isActive: false });
  }
}

function rpcError(errorCode: ErrorCode): RpcException {
  return new RpcException({ errorCode });
}

export type DesignWithRelations = Design & {
  sizeFinishes: SizeFinish[];
};

const SIZE_FINISH_RELATIONS = ['size', 'finish'];

@Injectable()
export class DesignService {
  constructor(
    @InjectRepository(Design) private repo: Repository<Design>,
    @InjectRepository(DesignSizeFinish) private dsfRepo: Repository<DesignSizeFinish>,
    @InjectRepository(SeriesSizeFinish) private ssfRepo: Repository<SeriesSizeFinish>,
    @InjectRepository(Series) private seriesRepo: Repository<Series>,
    @InjectRepository(SizeFinish) private sizeFinishRepo: Repository<SizeFinish>,
    private dataSource: DataSource,
  ) {}

  async list(input: {
    page?: number;
    limit?: number;
    search?: string;
    seriesId?: string;
    sizeFinishId?: string;
    activeOnly?: boolean;
  }): Promise<{
    items: DesignWithRelations[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = input.page && input.page > 0 ? input.page : 1;
    const limit = input.limit && input.limit > 0 ? Math.min(input.limit, 200) : 50;
    const search = input.search?.trim();

    const qb = this.repo
      .createQueryBuilder('design')
      .leftJoinAndSelect('design.series', 'series')
      .orderBy('design.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (search) qb.andWhere('design.name ILIKE :search', { search: `%${search}%` });
    if (input.seriesId) qb.andWhere('design.seriesId = :seriesId', { seriesId: input.seriesId });
    if (input.sizeFinishId) {
      qb.andWhere(
        `EXISTS (
           SELECT 1 FROM design_size_finish dsf
           WHERE dsf.design_id = design.id
             AND dsf.size_finish_id = :sizeFinishId
             AND dsf.deleted_at IS NULL
         )`,
        { sizeFinishId: input.sizeFinishId },
      );
    }
    if (input.activeOnly) qb.andWhere('design.isActive = :active', { active: true });

    const [items, total] = await qb.getManyAndCount();
    const sizeFinishesByDesignId = await this.fetchSizeFinishesByDesignIds(items.map((d) => d.id));
    const enriched = items.map((d) =>
      Object.assign(d, { sizeFinishes: sizeFinishesByDesignId.get(d.id) ?? [] }),
    );
    return { items: enriched, total, page, limit };
  }

  async getById(id: string, opts?: { activeOnly?: boolean }): Promise<DesignWithRelations> {
    const where: FindOptionsWhere<Design> = { id };
    if (opts?.activeOnly) where.isActive = true;
    const design = await this.repo.findOne({ where, relations: ['series'] });
    if (!design) throw rpcError(ErrorCode.DESIGN_NOT_FOUND);

    const map = await this.fetchSizeFinishesByDesignIds([design.id]);
    return Object.assign(design, { sizeFinishes: map.get(design.id) ?? [] });
  }

  private async fetchSizeFinishesByDesignIds(
    designIds: string[],
  ): Promise<Map<string, SizeFinish[]>> {
    const map = new Map<string, SizeFinish[]>();
    if (designIds.length === 0) return map;

    const rows = await this.dsfRepo.find({
      where: { designId: In(designIds), isActive: true },
      relations: SIZE_FINISH_RELATIONS.map((r) => `sizeFinish.${r}`).concat(['sizeFinish']),
      order: { createdAt: 'ASC' },
    });

    for (const r of rows) {
      const sf = r.sizeFinish;
      if (!sf || !sf.isActive) continue;
      if (!sf.size || !sf.size.isActive) continue;
      if (!sf.finish || !sf.finish.isActive) continue;
      const arr = map.get(r.designId) ?? [];
      arr.push(sf);
      map.set(r.designId, arr);
    }
    return map;
  }

  async create(input: {
    name: string;
    thumbnailUrl?: string | null;
    seriesId: string;
    sizeFinishIds: string[];
    platform: string;
    userId: string;
    userName: string;
  }): Promise<DesignWithRelations> {
    const name = input.name.trim();
    const sizeFinishIds = Array.from(new Set(input.sizeFinishIds.filter(Boolean)));
    if (sizeFinishIds.length === 0) throw rpcError(ErrorCode.VALIDATION_FAILED);

    return this.dataSource.transaction(async (manager) => {
      const designRepo = manager.getRepository(Design);
      const dsfRepo = manager.getRepository(DesignSizeFinish);
      const seriesRepo = manager.getRepository(Series);
      const ssfRepo = manager.getRepository(SeriesSizeFinish);

      const series = await seriesRepo.findOne({ where: { id: input.seriesId } });
      if (!series) throw rpcError(ErrorCode.SERIES_NOT_FOUND);

      const validPairs = await ssfRepo.find({
        where: {
          seriesId: input.seriesId,
          sizeFinishId: In(sizeFinishIds),
          deletedAt: IsNull(),
          isActive: true,
        },
        select: ['sizeFinishId'],
      });
      if (validPairs.length !== sizeFinishIds.length) {
        throw rpcError(ErrorCode.SERIES_SIZE_FINISH_NOT_FOUND);
      }

      const dup = await designRepo.findOne({
        where: {
          name: ILike(name),
          seriesId: input.seriesId,
          deletedAt: IsNull(),
        } as FindOptionsWhere<Design>,
      });
      if (dup) throw rpcError(ErrorCode.DUPLICATE_NAME);

      const now = new Date();
      const nowIso = now.toISOString();
      const isAdmin = input.platform === 'admin';
      const actorId = input.userId || null;
      const actorName = input.userName || null;
      const saved = await designRepo.save(
        designRepo.create({
          name,
          thumbnailUrl: input.thumbnailUrl?.trim() || null,
          seriesId: input.seriesId,
          status: isAdmin ? 'approved' : 'pending',
          approvedAt: isAdmin ? now : null,
          statusHistory: isAdmin
            ? [
                { status: 'pending', date: nowIso },
                { status: 'approved', date: nowIso },
              ]
            : [{ status: 'pending', date: nowIso }],
          createdBy: actorId,
          createdByName: actorName,
          updatedBy: actorId,
          updatedByName: actorName,
          approvedBy: isAdmin ? actorId : null,
          approvedByName: isAdmin ? actorName : null,
        }),
      );

      await dsfRepo.save(
        sizeFinishIds.map((sizeFinishId) =>
          dsfRepo.create({ designId: saved.id, sizeFinishId }),
        ),
      );

      return this.loadWithRelations(saved.id, manager);
    });
  }

  async approve(input: {
    id: string;
    userId: string;
    userName: string;
  }): Promise<DesignWithRelations> {
    return this.dataSource.transaction(async (manager) => {
      const designRepo = manager.getRepository(Design);

      const target = await designRepo.findOne({ where: { id: input.id } });
      if (!target) throw rpcError(ErrorCode.DESIGN_NOT_FOUND);

      const now = new Date();
      const history = [
        ...(target.statusHistory ?? []),
        { status: 'approved' as const, date: now.toISOString() },
      ];
      const actorId = input.userId || null;
      const actorName = input.userName || null;

      await designRepo.update(
        { id: target.id },
        {
          status: 'approved',
          approvedAt: now,
          rejectionReason: null,
          statusHistory: history,
          approvedBy: actorId,
          approvedByName: actorName,
          updatedBy: actorId,
          updatedByName: actorName,
        },
      );
      return this.loadWithRelations(target.id, manager);
    });
  }

  async reject(input: {
    id: string;
    reason: string;
    userId: string;
    userName: string;
  }): Promise<DesignWithRelations> {
    const reason = input.reason.trim();
    if (!reason) throw rpcError(ErrorCode.VALIDATION_FAILED);

    return this.dataSource.transaction(async (manager) => {
      const designRepo = manager.getRepository(Design);

      const target = await designRepo.findOne({ where: { id: input.id } });
      if (!target) throw rpcError(ErrorCode.DESIGN_NOT_FOUND);

      const now = new Date().toISOString();
      const history = [
        ...(target.statusHistory ?? []),
        { status: 'rejected' as const, date: now, reason },
      ];
      const actorId = input.userId || null;
      const actorName = input.userName || null;

      await designRepo.update(
        { id: target.id },
        {
          status: 'rejected',
          rejectionReason: reason,
          statusHistory: history,
          updatedBy: actorId,
          updatedByName: actorName,
        },
      );
      return this.loadWithRelations(target.id, manager);
    });
  }

  async update(input: {
    id: string;
    name?: string;
    isActive?: boolean;
    thumbnailUrl?: string;
    seriesId?: string;
    sizeFinishIds?: string[];
    userId: string;
    userName: string;
  }): Promise<DesignWithRelations> {
    return this.dataSource.transaction(async (manager) => {
      const designRepo = manager.getRepository(Design);
      const dsfRepo = manager.getRepository(DesignSizeFinish);
      const seriesRepo = manager.getRepository(Series);
      const ssfRepo = manager.getRepository(SeriesSizeFinish);

      const target = await designRepo.findOne({ where: { id: input.id } });
      if (!target) throw rpcError(ErrorCode.DESIGN_NOT_FOUND);

      const nextSeriesId = input.seriesId ?? target.seriesId;
      if (input.seriesId && input.seriesId !== target.seriesId) {
        const series = await seriesRepo.findOne({ where: { id: input.seriesId } });
        if (!series) throw rpcError(ErrorCode.SERIES_NOT_FOUND);
      }

      const replaceSizeFinishes =
        Array.isArray(input.sizeFinishIds) && input.sizeFinishIds.length > 0;
      const seriesChanged = input.seriesId !== undefined && input.seriesId !== target.seriesId;
      const newSizeFinishIds = replaceSizeFinishes
        ? Array.from(new Set(input.sizeFinishIds!.filter(Boolean)))
        : [];

      if (replaceSizeFinishes || seriesChanged) {
        const idsToValidate = replaceSizeFinishes
          ? newSizeFinishIds
          : (
              await dsfRepo.find({
                where: { designId: target.id, deletedAt: IsNull() },
                select: ['sizeFinishId'],
              })
            ).map((r) => r.sizeFinishId);

        if (idsToValidate.length === 0) throw rpcError(ErrorCode.VALIDATION_FAILED);

        const validPairs = await ssfRepo.find({
          where: {
            seriesId: nextSeriesId,
            sizeFinishId: In(idsToValidate),
            deletedAt: IsNull(),
            isActive: true,
          },
          select: ['sizeFinishId'],
        });
        if (validPairs.length !== idsToValidate.length) {
          throw rpcError(ErrorCode.SERIES_SIZE_FINISH_NOT_FOUND);
        }
      }

      const patch: Partial<Design> = {
        updatedBy: input.userId || null,
        updatedByName: input.userName || null,
      };
      if (input.name !== undefined) {
        const name = input.name.trim();
        const dup = await designRepo.findOne({
          where: {
            name: ILike(name),
            seriesId: nextSeriesId,
            deletedAt: IsNull(),
          } as FindOptionsWhere<Design>,
        });
        if (dup && dup.id !== target.id) throw rpcError(ErrorCode.DUPLICATE_NAME);
        patch.name = name;
      } else if (input.seriesId !== undefined && input.seriesId !== target.seriesId) {
        const dup = await designRepo.findOne({
          where: {
            name: ILike(target.name),
            seriesId: nextSeriesId,
            deletedAt: IsNull(),
          } as FindOptionsWhere<Design>,
        });
        if (dup && dup.id !== target.id) throw rpcError(ErrorCode.DUPLICATE_NAME);
      }
      if (input.isActive !== undefined) patch.isActive = input.isActive;
      if (input.seriesId !== undefined) patch.seriesId = input.seriesId;
      if (input.thumbnailUrl !== undefined) {
        const trimmed = input.thumbnailUrl.trim();
        patch.thumbnailUrl = trimmed.length > 0 ? trimmed : null;
      }

      if (Object.keys(patch).length > 0) {
        await designRepo.update({ id: target.id }, patch);
      }

      if (replaceSizeFinishes) {
        await dsfRepo.softDelete({ designId: target.id });
        await dsfRepo.update({ designId: target.id }, { isActive: false });
        await dsfRepo.save(
          newSizeFinishIds.map((sizeFinishId) =>
            dsfRepo.create({ designId: target.id, sizeFinishId }),
          ),
        );
      }

      return this.loadWithRelations(target.id, manager);
    });
  }

  async delete(input: {
    id: string;
    userId: string;
    userName: string;
  }): Promise<{ success: boolean }> {
    return this.dataSource.transaction(async (manager) => {
      const designRepo = manager.getRepository(Design);
      const dsfRepo = manager.getRepository(DesignSizeFinish);

      const target = await designRepo.findOne({ where: { id: input.id } });
      if (!target) throw rpcError(ErrorCode.DESIGN_NOT_FOUND);

      await dsfRepo.softDelete({ designId: target.id });
      await dsfRepo.update({ designId: target.id }, { isActive: false });
      await designRepo.softDelete({ id: target.id });
      await designRepo.update(
        { id: target.id },
        {
          isActive: false,
          updatedBy: input.userId || null,
          updatedByName: input.userName || null,
        },
      );

      return { success: true };
    });
  }

  async restore(input: {
    id: string;
    userId: string;
    userName: string;
  }): Promise<DesignWithRelations> {
    return this.dataSource.transaction(async (manager) => {
      const designRepo = manager.getRepository(Design);

      const target = await designRepo.findOne({
        where: { id: input.id },
        withDeleted: true,
      });
      if (!target) throw rpcError(ErrorCode.DESIGN_NOT_FOUND);

      const conflict = await designRepo.findOne({
        where: {
          name: ILike(target.name),
          seriesId: target.seriesId,
          deletedAt: IsNull(),
        } as FindOptionsWhere<Design>,
      });
      if (conflict && conflict.id !== target.id) throw rpcError(ErrorCode.DUPLICATE_NAME);

      await designRepo.restore({ id: target.id });
      await designRepo.update(
        { id: target.id },
        {
          isActive: true,
          updatedBy: input.userId || null,
          updatedByName: input.userName || null,
        },
      );

      return this.loadWithRelations(target.id, manager);
    });
  }

  private async loadWithRelations(
    id: string,
    manager: import('typeorm').EntityManager,
  ): Promise<DesignWithRelations> {
    const designRepo = manager.getRepository(Design);
    const dsfRepo = manager.getRepository(DesignSizeFinish);

    const design = await designRepo.findOneOrFail({ where: { id }, relations: ['series'] });
    const rows = await dsfRepo.find({
      where: { designId: design.id, isActive: true },
      relations: ['sizeFinish', 'sizeFinish.size', 'sizeFinish.finish'],
      order: { createdAt: 'ASC' },
    });
    const sizeFinishes: SizeFinish[] = [];
    for (const r of rows) {
      const sf = r.sizeFinish;
      if (!sf || !sf.isActive) continue;
      if (!sf.size || !sf.size.isActive) continue;
      if (!sf.finish || !sf.finish.isActive) continue;
      sizeFinishes.push(sf);
    }
    return Object.assign(design, { sizeFinishes });
  }
}
