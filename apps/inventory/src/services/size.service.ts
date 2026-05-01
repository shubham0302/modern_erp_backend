import { ErrorCode } from '@modern_erp/common';
import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, FindOptionsWhere, ILike, In, IsNull, Repository } from 'typeorm';

import { SeriesSizeFinish } from '../entities/series-size-finish.entity';
import { SizeFinish } from '../entities/size-finish.entity';
import { Size } from '../entities/size.entity';

import { cascadeDesignsForRemovedSsfIds } from './design.service';

function rpcError(errorCode: ErrorCode): RpcException {
  return new RpcException({ errorCode });
}

@Injectable()
export class SizeService {
  constructor(
    @InjectRepository(Size) private repo: Repository<Size>,
    @InjectRepository(SizeFinish) private sizeFinishRepo: Repository<SizeFinish>,
    private dataSource: DataSource,
  ) {}

  async list(input: {
    page?: number;
    limit?: number;
    search?: string;
    activeOnly?: boolean;
    includeDeleted?: boolean;
    fetchAll?: boolean;
  }): Promise<{ items: Size[]; total: number; page: number; limit: number }> {
    const search = input.search?.trim();

    const where: FindOptionsWhere<Size> = {};
    if (search) where.name = ILike(`%${search}%`);
    if (input.activeOnly) where.isActive = true;

    if (input.fetchAll) {
      const items = await this.repo.find({
        where,
        withDeleted: input.includeDeleted ?? false,
        order: { createdAt: 'DESC' },
      });
      return { items, total: items.length, page: 1, limit: items.length };
    }

    const page = input.page && input.page > 0 ? input.page : 1;
    const limit = input.limit && input.limit > 0 ? Math.min(input.limit, 200) : 50;

    const [items, total] = await this.repo.findAndCount({
      where,
      withDeleted: input.includeDeleted ?? false,
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return { items, total, page, limit };
  }

  async getById(id: string, opts?: { activeOnly?: boolean }): Promise<Size> {
    const where: FindOptionsWhere<Size> = { id };
    if (opts?.activeOnly) where.isActive = true;
    const size = await this.repo.findOne({ where });
    if (!size) throw rpcError(ErrorCode.SIZE_NOT_FOUND);
    return size;
  }

  async create(input: {
    name: string;
    userId: string;
    platform: string;
    userName: string;
  }): Promise<Size> {
    const name = input.name.trim();
    const existing = await this.repo.findOne({ where: { name: ILike(name) } });
    if (existing) throw rpcError(ErrorCode.DUPLICATE_NAME);

    return this.repo.save(
      this.repo.create({
        name,
        updatedBy: input.userId,
        updatedByPlatform: input.platform,
        updatedByName: input.userName,
      }),
    );
  }

  async update(input: {
    id: string;
    name?: string;
    isActive?: boolean;
    userId: string;
    platform: string;
    userName: string;
  }): Promise<Size> {
    return this.dataSource.transaction(async (manager) => {
      const sizeRepo = manager.getRepository(Size);
      const sizeFinishRepo = manager.getRepository(SizeFinish);

      const target = await sizeRepo.findOne({ where: { id: input.id } });
      if (!target) throw rpcError(ErrorCode.SIZE_NOT_FOUND);

      const patch: Partial<Size> = {
        updatedBy: input.userId,
        updatedByPlatform: input.platform,
        updatedByName: input.userName,
      };
      if (input.name !== undefined) {
        const name = input.name.trim();
        const dup = await sizeRepo.findOne({ where: { name: ILike(name) } });
        if (dup && dup.id !== target.id) throw rpcError(ErrorCode.DUPLICATE_NAME);
        patch.name = name;
      }
      if (input.isActive !== undefined) patch.isActive = input.isActive;

      await sizeRepo.update({ id: target.id }, patch);

      if (input.isActive === false) {
        await sizeFinishRepo.update(
          { sizeId: target.id, deletedAt: IsNull(), isActive: true },
          { isActive: false },
        );
      }

      return sizeRepo.findOneOrFail({ where: { id: target.id } });
    });
  }

  async delete(input: {
    id: string;
    userId: string;
    platform: string;
    userName: string;
  }): Promise<{ success: boolean }> {
    return this.dataSource.transaction(async (manager) => {
      const sizeRepo = manager.getRepository(Size);
      const sizeFinishRepo = manager.getRepository(SizeFinish);
      const ssfRepo = manager.getRepository(SeriesSizeFinish);

      const target = await sizeRepo.findOne({ where: { id: input.id } });
      if (!target) throw rpcError(ErrorCode.SIZE_NOT_FOUND);

      const liveMappings = await sizeFinishRepo.find({
        where: { sizeId: target.id, deletedAt: IsNull() },
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

      await sizeRepo.softDelete({ id: target.id });
      await sizeRepo.update(
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
  }): Promise<Size> {
    return this.dataSource.transaction(async (manager) => {
      const sizeRepo = manager.getRepository(Size);

      const target = await sizeRepo.findOne({ where: { id: input.id }, withDeleted: true });
      if (!target) throw rpcError(ErrorCode.SIZE_NOT_FOUND);

      const conflict = await sizeRepo.findOne({
        where: { name: ILike(target.name), deletedAt: IsNull() },
      });
      if (conflict && conflict.id !== target.id) throw rpcError(ErrorCode.DUPLICATE_NAME);

      await sizeRepo.restore({ id: target.id });
      await sizeRepo.update(
        { id: target.id },
        {
          isActive: true,
          updatedBy: input.userId,
          updatedByPlatform: input.platform,
          updatedByName: input.userName,
        },
      );

      return sizeRepo.findOneOrFail({ where: { id: target.id } });
    });
  }
}
