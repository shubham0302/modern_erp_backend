import { ErrorCode } from '@modern_erp/common';
import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, FindOptionsWhere, ILike, IsNull, Repository } from 'typeorm';

import { SizeFinish } from '../entities/size-finish.entity';
import { Size } from '../entities/size.entity';

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
  }): Promise<{ items: Size[]; total: number; page: number; limit: number }> {
    const page = input.page && input.page > 0 ? input.page : 1;
    const limit = input.limit && input.limit > 0 ? Math.min(input.limit, 200) : 50;
    const search = input.search?.trim();

    const where: FindOptionsWhere<Size> = {};
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

  async getById(id: string, opts?: { activeOnly?: boolean }): Promise<Size> {
    const where: FindOptionsWhere<Size> = { id };
    if (opts?.activeOnly) where.isActive = true;
    const size = await this.repo.findOne({ where });
    if (!size) throw rpcError(ErrorCode.SIZE_NOT_FOUND);
    return size;
  }

  async create(input: { name: string }): Promise<Size> {
    const name = input.name.trim();
    const existing = await this.repo.findOne({ where: { name: ILike(name) } });
    if (existing) throw rpcError(ErrorCode.DUPLICATE_NAME);

    return this.repo.save(this.repo.create({ name }));
  }

  async update(input: { id: string; name?: string; isActive?: boolean }): Promise<Size> {
    const target = await this.repo.findOne({ where: { id: input.id } });
    if (!target) throw rpcError(ErrorCode.SIZE_NOT_FOUND);

    const patch: Partial<Size> = {};
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
      const sizeRepo = manager.getRepository(Size);
      const sizeFinishRepo = manager.getRepository(SizeFinish);

      const target = await sizeRepo.findOne({ where: { id: input.id } });
      if (!target) throw rpcError(ErrorCode.SIZE_NOT_FOUND);

      const inUse = await sizeFinishRepo.count({
        where: { sizeId: target.id, deletedAt: IsNull() },
      });
      if (inUse > 0) throw rpcError(ErrorCode.RESOURCE_IN_USE);

      await sizeRepo.softDelete({ id: target.id });
      await sizeRepo.update({ id: target.id }, { isActive: false });

      return { success: true };
    });
  }

  async restore(input: { id: string }): Promise<Size> {
    return this.dataSource.transaction(async (manager) => {
      const sizeRepo = manager.getRepository(Size);

      const target = await sizeRepo.findOne({ where: { id: input.id }, withDeleted: true });
      if (!target) throw rpcError(ErrorCode.SIZE_NOT_FOUND);

      const conflict = await sizeRepo.findOne({
        where: { name: ILike(target.name), deletedAt: IsNull() },
      });
      if (conflict && conflict.id !== target.id) throw rpcError(ErrorCode.DUPLICATE_NAME);

      await sizeRepo.restore({ id: target.id });
      await sizeRepo.update({ id: target.id }, { isActive: true });

      return sizeRepo.findOneOrFail({ where: { id: target.id } });
    });
  }
}
