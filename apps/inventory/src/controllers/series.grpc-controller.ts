import * as grpc from '@grpc/grpc-js';
import { extractGrpcContext } from '@modern_erp/common';
import { InventoryProto } from '@modern_erp/grpc-types';
import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';

import { Series } from '../entities/series.entity';
import { SeriesService } from '../services/series.service';

export function seriesToProto(s: Series): InventoryProto.Series {
  return {
    id: s.id,
    name: s.name,
    isActive: s.isActive,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
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
    });
    return {
      items: res.items.map(seriesToProto),
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
    return { item: seriesToProto(item) };
  }

  @GrpcMethod('InventoryService', 'CreateSeries')
  async create(data: InventoryProto.CreateSeriesRequest): Promise<InventoryProto.SeriesResponse> {
    const item = await this.svc.create({ name: data.name });
    return { item: seriesToProto(item) };
  }

  @GrpcMethod('InventoryService', 'UpdateSeries')
  async update(data: InventoryProto.UpdateSeriesRequest): Promise<InventoryProto.SeriesResponse> {
    const item = await this.svc.update({ id: data.id, name: data.name, isActive: data.isActive });
    return { item: seriesToProto(item) };
  }

  @GrpcMethod('InventoryService', 'DeleteSeries')
  delete(data: InventoryProto.DeleteSeriesRequest): Promise<InventoryProto.SuccessResponse> {
    return this.svc.delete({ id: data.id });
  }

  @GrpcMethod('InventoryService', 'RestoreSeries')
  async restore(
    data: InventoryProto.RestoreSeriesRequest,
  ): Promise<InventoryProto.SeriesResponse> {
    const item = await this.svc.restore({ id: data.id });
    return { item: seriesToProto(item) };
  }
}
