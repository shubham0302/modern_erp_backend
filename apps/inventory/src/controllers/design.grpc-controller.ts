import * as grpc from '@grpc/grpc-js';
import { extractGrpcContext } from '@modern_erp/common';
import { InventoryProto } from '@modern_erp/grpc-types';
import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';

import { Design } from '../entities/design.entity';
import { DesignService } from '../services/design.service';

import { seriesSizeFinishToProto } from './series-size-finish.grpc-controller';

export function designToProto(d: Design): InventoryProto.Design {
  return {
    id: d.id,
    name: d.name,
    mapping: d.seriesSizeFinish ? seriesSizeFinishToProto(d.seriesSizeFinish) : undefined,
    isActive: d.isActive,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  };
}

@Controller()
export class DesignGrpcController {
  constructor(private svc: DesignService) {}

  @GrpcMethod('InventoryService', 'ListDesigns')
  async list(
    data: InventoryProto.ListDesignsRequest,
    metadata: grpc.Metadata,
  ): Promise<InventoryProto.ListDesignsResponse> {
    const { platform } = extractGrpcContext(metadata);
    const res = await this.svc.list({
      page: data.page,
      limit: data.limit,
      search: data.search,
      seriesId: data.seriesId || undefined,
      sizeFinishId: data.sizeFinishId || undefined,
      seriesSizeFinishId: data.seriesSizeFinishId || undefined,
      activeOnly: platform === 'staff',
    });
    return {
      items: res.items.map(designToProto),
      total: res.total,
      page: res.page,
      limit: res.limit,
    };
  }

  @GrpcMethod('InventoryService', 'GetDesign')
  async get(
    data: InventoryProto.GetDesignRequest,
    metadata: grpc.Metadata,
  ): Promise<InventoryProto.DesignResponse> {
    const { platform } = extractGrpcContext(metadata);
    const item = await this.svc.getById(data.id, { activeOnly: platform === 'staff' });
    return { item: designToProto(item) };
  }

  @GrpcMethod('InventoryService', 'CreateDesign')
  async create(data: InventoryProto.CreateDesignRequest): Promise<InventoryProto.DesignResponse> {
    const item = await this.svc.create({
      name: data.name,
      seriesSizeFinishId: data.seriesSizeFinishId,
    });
    return { item: designToProto(item) };
  }

  @GrpcMethod('InventoryService', 'UpdateDesign')
  async update(data: InventoryProto.UpdateDesignRequest): Promise<InventoryProto.DesignResponse> {
    const item = await this.svc.update({ id: data.id, name: data.name, isActive: data.isActive });
    return { item: designToProto(item) };
  }

  @GrpcMethod('InventoryService', 'DeleteDesign')
  delete(data: InventoryProto.DeleteDesignRequest): Promise<InventoryProto.SuccessResponse> {
    return this.svc.delete({ id: data.id });
  }

  @GrpcMethod('InventoryService', 'RestoreDesign')
  async restore(
    data: InventoryProto.RestoreDesignRequest,
  ): Promise<InventoryProto.DesignResponse> {
    const item = await this.svc.restore({ id: data.id });
    return { item: designToProto(item) };
  }
}
