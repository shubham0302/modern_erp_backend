import * as grpc from '@grpc/grpc-js';
import { extractGrpcContext } from '@modern_erp/common';
import { InventoryProto } from '@modern_erp/grpc-types';
import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';

import { Finish } from '../entities/finish.entity';
import { FinishService } from '../services/finish.service';

export function finishToProto(f: Finish): InventoryProto.Finish {
  return {
    id: f.id,
    name: f.name,
    isActive: f.isActive,
    createdAt: f.createdAt.toISOString(),
    updatedAt: f.updatedAt.toISOString(),
  };
}

@Controller()
export class FinishGrpcController {
  constructor(private svc: FinishService) {}

  @GrpcMethod('InventoryService', 'ListFinishes')
  async list(
    data: InventoryProto.ListFinishesRequest,
    metadata: grpc.Metadata,
  ): Promise<InventoryProto.ListFinishesResponse> {
    const { platform } = extractGrpcContext(metadata);
    const res = await this.svc.list({
      page: data.page,
      limit: data.limit,
      search: data.search,
      activeOnly: platform === 'staff',
    });
    return {
      items: res.items.map(finishToProto),
      total: res.total,
      page: res.page,
      limit: res.limit,
    };
  }

  @GrpcMethod('InventoryService', 'GetFinish')
  async get(
    data: InventoryProto.GetFinishRequest,
    metadata: grpc.Metadata,
  ): Promise<InventoryProto.FinishResponse> {
    const { platform } = extractGrpcContext(metadata);
    const item = await this.svc.getById(data.id, { activeOnly: platform === 'staff' });
    return { item: finishToProto(item) };
  }

  @GrpcMethod('InventoryService', 'CreateFinish')
  async create(data: InventoryProto.CreateFinishRequest): Promise<InventoryProto.FinishResponse> {
    const item = await this.svc.create({ name: data.name });
    return { item: finishToProto(item) };
  }

  @GrpcMethod('InventoryService', 'UpdateFinish')
  async update(data: InventoryProto.UpdateFinishRequest): Promise<InventoryProto.FinishResponse> {
    const item = await this.svc.update({ id: data.id, name: data.name, isActive: data.isActive });
    return { item: finishToProto(item) };
  }

  @GrpcMethod('InventoryService', 'DeleteFinish')
  delete(data: InventoryProto.DeleteFinishRequest): Promise<InventoryProto.SuccessResponse> {
    return this.svc.delete({ id: data.id });
  }

  @GrpcMethod('InventoryService', 'RestoreFinish')
  async restore(
    data: InventoryProto.RestoreFinishRequest,
  ): Promise<InventoryProto.FinishResponse> {
    const item = await this.svc.restore({ id: data.id });
    return { item: finishToProto(item) };
  }
}
