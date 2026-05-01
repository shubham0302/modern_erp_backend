import * as grpc from '@grpc/grpc-js';
import { ErrorCode, extractGrpcContext } from '@modern_erp/common';
import { InventoryProto } from '@modern_erp/grpc-types';
import { Controller } from '@nestjs/common';
import { GrpcMethod, RpcException } from '@nestjs/microservices';

import { Series } from '../entities/series.entity';
import { SizeFinish } from '../entities/size-finish.entity';
import { SeriesService } from '../services/series.service';

import { sizeFinishToProto } from './size-finish.grpc-controller';

export function seriesToProto(s: Series, sizeFinishes?: SizeFinish[]): InventoryProto.Series {
  return {
    id: s.id,
    name: s.name,
    isActive: s.isActive,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
    sizeFinishes: sizeFinishes ? sizeFinishes.map(sizeFinishToProto) : [],
    updatedBy: s.updatedBy ?? '',
    updatedByPlatform: s.updatedByPlatform ?? '',
    updatedByName: s.updatedByName ?? '',
  };
}

function requireActor(metadata: grpc.Metadata): {
  userId: string;
  platform: string;
  userName: string;
} {
  const { userId, platform, userName } = extractGrpcContext(metadata);
  if (!userId || !platform) throw new RpcException({ errorCode: ErrorCode.INVALID_TOKEN });
  return { userId, platform, userName: userName ?? '' };
}

@Controller()
export class SeriesGrpcController {
  constructor(private svc: SeriesService) {}

  @GrpcMethod('InventoryService', 'ListSeries')
  async list(
    data: InventoryProto.ListSeriesRequest,
    metadata: grpc.Metadata,
  ): Promise<InventoryProto.ListSeriesResponse> {
    const { platform } = extractGrpcContext(metadata);
    const res = await this.svc.list({
      page: data.page,
      limit: data.limit,
      search: data.search,
      activeOnly: platform === 'staff',
      includeDeleted: platform !== 'staff',
    });
    return {
      items: res.items.map((s) => seriesToProto(s, s.sizeFinishes)),
      total: res.total,
      page: res.page,
      limit: res.limit,
    };
  }

  @GrpcMethod('InventoryService', 'GetSeries')
  async get(
    data: InventoryProto.GetSeriesRequest,
    metadata: grpc.Metadata,
  ): Promise<InventoryProto.SeriesResponse> {
    const { platform } = extractGrpcContext(metadata);
    const item = await this.svc.getById(data.id, { activeOnly: platform === 'staff' });
    return { item: seriesToProto(item, item.sizeFinishes) };
  }

  @GrpcMethod('InventoryService', 'CreateSeries')
  async create(
    data: InventoryProto.CreateSeriesRequest,
    metadata: grpc.Metadata,
  ): Promise<InventoryProto.SeriesResponse> {
    const actor = requireActor(metadata);
    const item = await this.svc.create({
      name: data.name,
      sizeFinishIds: data.sizeFinishIds,
      ...actor,
    });
    return { item: seriesToProto(item) };
  }

  @GrpcMethod('InventoryService', 'UpdateSeries')
  async update(
    data: InventoryProto.UpdateSeriesRequest,
    metadata: grpc.Metadata,
  ): Promise<InventoryProto.SeriesResponse> {
    const actor = requireActor(metadata);
    const item = await this.svc.update({
      id: data.id,
      name: data.name,
      isActive: data.isActive,
      sizeFinishIds: data.sizeFinishIds,
      deletedSizeFinishIds: data.deletedSizeFinishIds,
      ...actor,
    });
    return { item: seriesToProto(item) };
  }

  @GrpcMethod('InventoryService', 'DeleteSeries')
  delete(
    data: InventoryProto.DeleteSeriesRequest,
    metadata: grpc.Metadata,
  ): Promise<InventoryProto.SuccessResponse> {
    const actor = requireActor(metadata);
    return this.svc.delete({ id: data.id, ...actor });
  }

  @GrpcMethod('InventoryService', 'RestoreSeries')
  async restore(
    data: InventoryProto.RestoreSeriesRequest,
    metadata: grpc.Metadata,
  ): Promise<InventoryProto.SeriesResponse> {
    const actor = requireActor(metadata);
    const item = await this.svc.restore({ id: data.id, ...actor });
    return { item: seriesToProto(item) };
  }
}
