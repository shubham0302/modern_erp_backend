import * as grpc from '@grpc/grpc-js';
import { extractGrpcContext } from '@modern_erp/common';
import { InventoryProto } from '@modern_erp/grpc-types';
import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';

import { Size } from '../entities/size.entity';
import { SizeService } from '../services/size.service';

export function sizeToProto(s: Size): InventoryProto.Size {
  return {
    id: s.id,
    name: s.name,
    isActive: s.isActive,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  };
}

@Controller()
export class SizeGrpcController {
  constructor(private svc: SizeService) {}

  @GrpcMethod('InventoryService', 'ListSizes')
  async list(
    data: InventoryProto.ListSizesRequest,
    metadata: grpc.Metadata,
  ): Promise<InventoryProto.ListSizesResponse> {
    const { platform } = extractGrpcContext(metadata);
    const res = await this.svc.list({
      page: data.page,
      limit: data.limit,
      search: data.search,
      activeOnly: platform === 'staff',
    });
    return {
      items: res.items.map(sizeToProto),
      total: res.total,
      page: res.page,
      limit: res.limit,
    };
  }

  @GrpcMethod('InventoryService', 'GetSize')
  async get(
    data: InventoryProto.GetSizeRequest,
    metadata: grpc.Metadata,
  ): Promise<InventoryProto.SizeResponse> {
    const { platform } = extractGrpcContext(metadata);
    const item = await this.svc.getById(data.id, { activeOnly: platform === 'staff' });
    return { item: sizeToProto(item) };
  }

  @GrpcMethod('InventoryService', 'CreateSize')
  async create(data: InventoryProto.CreateSizeRequest): Promise<InventoryProto.SizeResponse> {
    const item = await this.svc.create({ name: data.name });
    return { item: sizeToProto(item) };
  }

  @GrpcMethod('InventoryService', 'UpdateSize')
  async update(data: InventoryProto.UpdateSizeRequest): Promise<InventoryProto.SizeResponse> {
    const item = await this.svc.update({ id: data.id, name: data.name, isActive: data.isActive });
    return { item: sizeToProto(item) };
  }

  @GrpcMethod('InventoryService', 'DeleteSize')
  delete(data: InventoryProto.DeleteSizeRequest): Promise<InventoryProto.SuccessResponse> {
    return this.svc.delete({ id: data.id });
  }

  @GrpcMethod('InventoryService', 'RestoreSize')
  async restore(data: InventoryProto.RestoreSizeRequest): Promise<InventoryProto.SizeResponse> {
    const item = await this.svc.restore({ id: data.id });
    return { item: sizeToProto(item) };
  }
}
