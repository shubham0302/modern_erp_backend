import { ErrorCode } from '@modern_erp/common';
import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, FindOptionsWhere, ILike, In, IsNull, Repository } from 'typeorm';

import { Finish } from '../entities/finish.entity';
import { SeriesSizeFinish } from '../entities/series-size-finish.entity';
import { SizeFinish } from '../entities/size-finish.entity';
import { Size } from '../entities/size.entity';

import { cascadeDesignsForRemovedSsfIds } from './design.service';

export type FinishWithSizes = Finish & { sizes: Size[] };

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
    includeDeleted?: boolean;
  }): Promise<{ items: FinishWithSizes[]; total: number; page: number; limit: number }> {
    const page = input.page && input.page > 0 ? input.page : 1;
    const limit = input.limit && input.limit > 0 ? Math.min(input.limit, 200) : 50;
    const search = input.search?.trim();

    const where: FindOptionsWhere<Finish> = {};
    if (search) where.name = ILike(`%${search}%`);
    if (input.activeOnly) where.isActive = true;

    const [finishes, total] = await this.repo.findAndCount({
      where,
      withDeleted: input.includeDeleted ?? false,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const sizesByFinishId = await this.fetchSizesByFinishIds(finishes.map((f) => f.id));
    const items: FinishWithSizes[] = finishes.map((f) =>
      Object.assign(f, { sizes: sizesByFinishId.get(f.id) ?? [] }),
    );

    return { items, total, page, limit };
  }

  private async fetchSizesByFinishIds(finishIds: string[]): Promise<Map<string, Size[]>> {
    const map = new Map<string, Size[]>();
    if (finishIds.length === 0) return map;

    const mappings = await this.sizeFinishRepo.find({
      where: { finishId: In(finishIds), isActive: true },
      relations: ['size'],
      order: { createdAt: 'DESC' },
    });

    for (const m of mappings) {
      if (!m.size) continue;
      if (!m.size.isActive) continue;
      const arr = map.get(m.finishId) ?? [];
      arr.push(m.size);
      map.set(m.finishId, arr);
    }
    return map;
  }

  async getById(
    id: string,
    opts?: { activeOnly?: boolean; includeDeleted?: boolean },
  ): Promise<FinishWithSizes> {
    const where: FindOptionsWhere<Finish> = { id };
    if (opts?.activeOnly) where.isActive = true;
    const finish = await this.repo.findOne({ where });
    if (!finish) throw rpcError(ErrorCode.FINISH_NOT_FOUND);

    const sizesByFinishId = await this.fetchSizesByFinishIds([finish.id]);
    return Object.assign(finish, { sizes: sizesByFinishId.get(finish.id) ?? [] });
  }

  async create(input: {
    name: string;
    sizeIds?: string[];
    userId: string;
    platform: string;
    userName: string;
  }): Promise<Finish> {
    const name = input.name.trim();
    const sizeIds = Array.from(new Set((input.sizeIds ?? []).filter(Boolean)));

    return this.dataSource.transaction(async (manager) => {
      const finishRepo = manager.getRepository(Finish);
      const sizeFinishRepo = manager.getRepository(SizeFinish);
      const sizeRepo = manager.getRepository(Size);

      const existing = await finishRepo.findOne({ where: { name: ILike(name) } });
      if (existing) throw rpcError(ErrorCode.DUPLICATE_NAME);

      if (sizeIds.length > 0) {
        const sizes = await sizeRepo.find({
          where: { id: In(sizeIds), deletedAt: IsNull() },
          select: ['id'],
        });
        if (sizes.length !== sizeIds.length) throw rpcError(ErrorCode.SIZE_NOT_FOUND);
      }

      const finish = await finishRepo.save(
        finishRepo.create({
          name,
          updatedBy: input.userId,
          updatedByPlatform: input.platform,
          updatedByName: input.userName,
        }),
      );

      if (sizeIds.length > 0) {
        await sizeFinishRepo.save(
          sizeIds.map((sizeId) => sizeFinishRepo.create({ sizeId, finishId: finish.id })),
        );
      }

      return finish;
    });
  }

  async update(input: {
    id: string;
    name?: string;
    isActive?: boolean;
    sizeIds?: string[];
    deletedSizeIds?: string[];
    userId: string;
    platform: string;
    userName: string;
  }): Promise<Finish> {
    const sizeIdsToAdd = Array.from(new Set((input.sizeIds ?? []).filter(Boolean)));
    const sizeIdsToRemove = Array.from(new Set((input.deletedSizeIds ?? []).filter(Boolean)));
    const overlap = sizeIdsToAdd.filter((id) => sizeIdsToRemove.includes(id));
    if (overlap.length > 0) throw rpcError(ErrorCode.VALIDATION_FAILED);

    return this.dataSource.transaction(async (manager) => {
      const finishRepo = manager.getRepository(Finish);
      const sizeFinishRepo = manager.getRepository(SizeFinish);
      const sizeRepo = manager.getRepository(Size);
      const ssfRepo = manager.getRepository(SeriesSizeFinish);

      const target = await finishRepo.findOne({ where: { id: input.id } });
      if (!target) throw rpcError(ErrorCode.FINISH_NOT_FOUND);

      const patch: Partial<Finish> = {
        updatedBy: input.userId,
        updatedByPlatform: input.platform,
        updatedByName: input.userName,
      };
      if (input.name !== undefined) {
        const name = input.name.trim();
        const dup = await finishRepo.findOne({ where: { name: ILike(name) } });
        if (dup && dup.id !== target.id) throw rpcError(ErrorCode.DUPLICATE_NAME);
        patch.name = name;
      }
      if (input.isActive !== undefined) patch.isActive = input.isActive;

      await finishRepo.update({ id: target.id }, patch);

      if (sizeIdsToAdd.length > 0) {
        const sizes = await sizeRepo.find({
          where: { id: In(sizeIdsToAdd), deletedAt: IsNull() },
          select: ['id'],
        });
        if (sizes.length !== sizeIdsToAdd.length) throw rpcError(ErrorCode.SIZE_NOT_FOUND);

        const existing = await sizeFinishRepo.find({
          where: { finishId: target.id, sizeId: In(sizeIdsToAdd) },
          withDeleted: true,
        });
        const existingBySizeId = new Map(existing.map((e) => [e.sizeId, e]));

        const reviveIds: string[] = [];
        const toCreate: string[] = [];
        for (const sizeId of sizeIdsToAdd) {
          const m = existingBySizeId.get(sizeId);
          if (!m) toCreate.push(sizeId);
          else if (m.deletedAt) reviveIds.push(m.id);
        }

        if (reviveIds.length > 0) {
          await sizeFinishRepo.restore({ id: In(reviveIds) });
          await sizeFinishRepo.update({ id: In(reviveIds) }, { isActive: true });
        }
        if (toCreate.length > 0) {
          await sizeFinishRepo.save(
            toCreate.map((sizeId) => sizeFinishRepo.create({ sizeId, finishId: target.id })),
          );
        }
      }

      if (sizeIdsToRemove.length > 0) {
        const liveMappings = await sizeFinishRepo.find({
          where: { finishId: target.id, sizeId: In(sizeIdsToRemove), deletedAt: IsNull() },
          select: ['id'],
        });

        if (liveMappings.length > 0) {
          const mappingIds = liveMappings.map((m) => m.id);
          const liveSsf = await ssfRepo.find({
            where: { sizeFinishId: In(mappingIds), deletedAt: IsNull() },
            select: ['id'],
          });

          if (liveSsf.length > 0) {
            const ssfIds = liveSsf.map((s) => s.id);
            await cascadeDesignsForRemovedSsfIds(manager, ssfIds);
            await ssfRepo.softDelete({ id: In(ssfIds) });
            await ssfRepo.update({ id: In(ssfIds) }, { isActive: false });
          }

          await sizeFinishRepo.softDelete({ id: In(mappingIds) });
          await sizeFinishRepo.update({ id: In(mappingIds) }, { isActive: false });
        }
      }

      return finishRepo.findOneOrFail({ where: { id: target.id } });
    });
  }

  async delete(input: {
    id: string;
    userId: string;
    platform: string;
    userName: string;
  }): Promise<{ success: boolean }> {
    return this.dataSource.transaction(async (manager) => {
      const finishRepo = manager.getRepository(Finish);
      const sizeFinishRepo = manager.getRepository(SizeFinish);
      const ssfRepo = manager.getRepository(SeriesSizeFinish);

      const target = await finishRepo.findOne({ where: { id: input.id } });
      if (!target) throw rpcError(ErrorCode.FINISH_NOT_FOUND);

      const liveMappings = await sizeFinishRepo.find({
        where: { finishId: target.id, deletedAt: IsNull() },
        select: ['id'],
      });

      if (liveMappings.length > 0) {
        const mappingIds = liveMappings.map((m) => m.id);
        const liveSsf = await ssfRepo.find({
          where: { sizeFinishId: In(mappingIds), deletedAt: IsNull() },
          select: ['id'],
        });

        if (liveSsf.length > 0) {
          const ssfIds = liveSsf.map((s) => s.id);
          await cascadeDesignsForRemovedSsfIds(manager, ssfIds);
          await ssfRepo.softDelete({ id: In(ssfIds) });
          await ssfRepo.update({ id: In(ssfIds) }, { isActive: false });
        }

        await sizeFinishRepo.softDelete({ id: In(mappingIds) });
        await sizeFinishRepo.update({ id: In(mappingIds) }, { isActive: false });
      }

      await finishRepo.softDelete({ id: target.id });
      await finishRepo.update(
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
  }): Promise<Finish> {
    return this.dataSource.transaction(async (manager) => {
      const finishRepo = manager.getRepository(Finish);

      const target = await finishRepo.findOne({ where: { id: input.id }, withDeleted: true });
      if (!target) throw rpcError(ErrorCode.FINISH_NOT_FOUND);

      const conflict = await finishRepo.findOne({
        where: { name: ILike(target.name), deletedAt: IsNull() },
      });
      if (conflict && conflict.id !== target.id) throw rpcError(ErrorCode.DUPLICATE_NAME);

      await finishRepo.restore({ id: target.id });
      await finishRepo.update(
        { id: target.id },
        {
          isActive: true,
          updatedBy: input.userId,
          updatedByPlatform: input.platform,
          updatedByName: input.userName,
        },
      );

      return finishRepo.findOneOrFail({ where: { id: target.id } });
    });
  }
}
