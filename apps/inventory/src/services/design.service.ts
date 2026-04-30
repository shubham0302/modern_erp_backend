import { ErrorCode } from '@modern_erp/common';
import { Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, FindOptionsWhere, ILike, IsNull, Repository } from 'typeorm';

import { Design } from '../entities/design.entity';
import { SeriesSizeFinish } from '../entities/series-size-finish.entity';

function rpcError(errorCode: ErrorCode): RpcException {
  return new RpcException({ errorCode });
}

const DESIGN_RELATIONS = [
  'seriesSizeFinish',
  'seriesSizeFinish.series',
  'seriesSizeFinish.sizeFinish',
  'seriesSizeFinish.sizeFinish.size',
  'seriesSizeFinish.sizeFinish.finish',
];

@Injectable()
export class DesignService {
  constructor(
    @InjectRepository(Design) private repo: Repository<Design>,
    @InjectRepository(SeriesSizeFinish) private ssfRepo: Repository<SeriesSizeFinish>,
    private dataSource: DataSource,
  ) {}

  async list(input: {
    page?: number;
    limit?: number;
    search?: string;
    seriesId?: string;
    sizeFinishId?: string;
    seriesSizeFinishId?: string;
    activeOnly?: boolean;
  }): Promise<{ items: Design[]; total: number; page: number; limit: number }> {
    const page = input.page && input.page > 0 ? input.page : 1;
    const limit = input.limit && input.limit > 0 ? Math.min(input.limit, 200) : 50;
    const search = input.search?.trim();

    const qb = this.repo
      .createQueryBuilder('design')
      .leftJoinAndSelect('design.seriesSizeFinish', 'ssf')
      .leftJoinAndSelect('ssf.series', 'series')
      .leftJoinAndSelect('ssf.sizeFinish', 'sf')
      .leftJoinAndSelect('sf.size', 'size')
      .leftJoinAndSelect('sf.finish', 'finish')
      .orderBy('design.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    if (search) qb.andWhere('design.name ILIKE :search', { search: `%${search}%` });
    if (input.seriesSizeFinishId)
      qb.andWhere('design.seriesSizeFinishId = :ssfId', { ssfId: input.seriesSizeFinishId });
    if (input.seriesId) qb.andWhere('ssf.seriesId = :seriesId', { seriesId: input.seriesId });
    if (input.sizeFinishId)
      qb.andWhere('ssf.sizeFinishId = :sizeFinishId', { sizeFinishId: input.sizeFinishId });
    if (input.activeOnly) qb.andWhere('design.isActive = :active', { active: true });

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit };
  }

  async getById(id: string, opts?: { activeOnly?: boolean }): Promise<Design> {
    const where: FindOptionsWhere<Design> = { id };
    if (opts?.activeOnly) where.isActive = true;
    const design = await this.repo.findOne({ where, relations: DESIGN_RELATIONS });
    if (!design) throw rpcError(ErrorCode.DESIGN_NOT_FOUND);
    return design;
  }

  async create(input: { name: string; seriesSizeFinishId: string }): Promise<Design> {
    const ssf = await this.ssfRepo.findOne({ where: { id: input.seriesSizeFinishId } });
    if (!ssf) throw rpcError(ErrorCode.SERIES_SIZE_FINISH_NOT_FOUND);

    const name = input.name.trim();
    const existing = await this.repo.findOne({
      where: {
        name: ILike(name),
        seriesSizeFinishId: input.seriesSizeFinishId,
        deletedAt: IsNull(),
      } as FindOptionsWhere<Design>,
    });
    if (existing) throw rpcError(ErrorCode.DUPLICATE_NAME);

    const saved = await this.repo.save(
      this.repo.create({ name, seriesSizeFinishId: input.seriesSizeFinishId }),
    );
    return this.repo.findOneOrFail({ where: { id: saved.id }, relations: DESIGN_RELATIONS });
  }

  async update(input: { id: string; name?: string; isActive?: boolean }): Promise<Design> {
    const target = await this.repo.findOne({ where: { id: input.id } });
    if (!target) throw rpcError(ErrorCode.DESIGN_NOT_FOUND);

    const patch: Partial<Design> = {};
    if (input.name !== undefined) {
      const name = input.name.trim();
      const dup = await this.repo.findOne({
        where: {
          name: ILike(name),
          seriesSizeFinishId: target.seriesSizeFinishId,
          deletedAt: IsNull(),
        } as FindOptionsWhere<Design>,
      });
      if (dup && dup.id !== target.id) throw rpcError(ErrorCode.DUPLICATE_NAME);
      patch.name = name;
    }
    if (input.isActive !== undefined) patch.isActive = input.isActive;

    await this.repo.update({ id: target.id }, patch);
    return this.repo.findOneOrFail({ where: { id: target.id }, relations: DESIGN_RELATIONS });
  }

  async delete(input: { id: string }): Promise<{ success: boolean }> {
    return this.dataSource.transaction(async (manager) => {
      const designRepo = manager.getRepository(Design);

      const target = await designRepo.findOne({ where: { id: input.id } });
      if (!target) throw rpcError(ErrorCode.DESIGN_NOT_FOUND);

      await designRepo.softDelete({ id: target.id });
      await designRepo.update({ id: target.id }, { isActive: false });

      return { success: true };
    });
  }

  async restore(input: { id: string }): Promise<Design> {
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
          seriesSizeFinishId: target.seriesSizeFinishId,
          deletedAt: IsNull(),
        } as FindOptionsWhere<Design>,
      });
      if (conflict && conflict.id !== target.id) throw rpcError(ErrorCode.DUPLICATE_NAME);

      await designRepo.restore({ id: target.id });
      await designRepo.update({ id: target.id }, { isActive: true });

      return designRepo.findOneOrFail({ where: { id: target.id }, relations: DESIGN_RELATIONS });
    });
  }
}
