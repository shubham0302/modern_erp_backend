import * as grpc from '@grpc/grpc-js';
import { extractGrpcContext } from '@modern_erp/common';
import { InventoryProto } from '@modern_erp/grpc-types';
import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';

import { SeriesSizeFinish } from '../entities/series-size-finish.entity';
import { SeriesSizeFinishService } from '../services/series-size-finish.service';

import { seriesToProto } from './series.grpc-controller';
import { sizeFinishToProto } from './size-finish.grpc-controller';

export function seriesSizeFinishToProto(
  ssf: SeriesSizeFinish,
): InventoryProto.SeriesSizeFinish {
  return {
    id: ssf.id,
    series: ssf.series ? seriesToProto(ssf.series) : undefined,
    sizeFinish: ssf.sizeFinish ? sizeFinishToProto(ssf.sizeFinish) : undefined,
    isActive: ssf.isActive,
    createdAt: ssf.createdAt.toISOString(),
    updatedAt: ssf.updatedAt.toISOString(),
  };
}

@Controller()
export class SeriesSizeFinishGrpcController {
  constructor(private svc: SeriesSizeFinishService) {}

  @GrpcMethod('InventoryService', 'AddSeriesToSizeFinish')
  async add(
    data: InventoryProto.AddSeriesToSizeFinishRequest,
  ): Promise<InventoryProto.SeriesSizeFinishResponse> {
    const item = await this.svc.addSeriesToSizeFinish({
      seriesId: data.seriesId,
      sizeFinishId: data.sizeFinishId,
    });
    return { item: seriesSizeFinishToProto(item) };
  }

  @GrpcMethod('InventoryService', 'RemoveSeriesFromSizeFinish')
  remove(
    data: InventoryProto.RemoveSeriesFromSizeFinishRequest,
  ): Promise<InventoryProto.SuccessResponse> {
    return this.svc.removeSeriesFromSizeFinish({
      seriesSizeFinishId: data.seriesSizeFinishId,
    });
  }

  @GrpcMethod('InventoryService', 'ListSeriesSizeFinishesBySeries')
  async listBySeries(
    data: InventoryProto.ListSeriesSizeFinishesBySeriesRequest,
    metadata: grpc.Metadata,
  ): Promise<InventoryProto.ListSeriesSizeFinishesResponse> {
    const { platform } = extractGrpcContext(metadata);
    const items = await this.svc.listBySeries(data.seriesId, {
      activeOnly: platform === 'staff',
    });
    return { items: items.map(seriesSizeFinishToProto) };
  }
}
