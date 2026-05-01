import * as grpc from '@grpc/grpc-js';
import { ErrorCode, extractGrpcContext } from '@modern_erp/common';
import { InventoryProto } from '@modern_erp/grpc-types';
import { Controller } from '@nestjs/common';
import { GrpcMethod, RpcException } from '@nestjs/microservices';

import { Finish } from '../entities/finish.entity';
import { Size } from '../entities/size.entity';
import { FinishService } from '../services/finish.service';

import { sizeToProto } from './size.grpc-controller';

export function finishToProto(f: Finish, sizes?: Size[]): InventoryProto.Finish {
  return {
    id: f.id,
    name: f.name,
    isActive: f.isActive,
    createdAt: f.createdAt.toISOString(),
    updatedAt: f.updatedAt.toISOString(),
    sizes: sizes ? sizes.map(sizeToProto) : [],
    updatedBy: f.updatedBy ?? '',
    updatedByPlatform: f.updatedByPlatform ?? '',
    updatedByName: f.updatedByName ?? '',
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
      includeDeleted: platform !== 'staff',
    });
    return {
      items: res.items.map((f) => finishToProto(f, f.sizes)),
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
    const isStaff = platform === 'staff';
    const item = await this.svc.getById(data.id, {
      activeOnly: isStaff,
      includeDeleted: !isStaff,
    });
    return { item: finishToProto(item, item.sizes) };
  }

  @GrpcMethod('InventoryService', 'CreateFinish')
  async create(
    data: InventoryProto.CreateFinishRequest,
    metadata: grpc.Metadata,
  ): Promise<InventoryProto.FinishResponse> {
    const actor = requireActor(metadata);
    const item = await this.svc.create({ name: data.name, sizeIds: data.sizeIds, ...actor });
    return { item: finishToProto(item) };
  }

  @GrpcMethod('InventoryService', 'UpdateFinish')
  async update(
    data: InventoryProto.UpdateFinishRequest,
    metadata: grpc.Metadata,
  ): Promise<InventoryProto.FinishResponse> {
    const actor = requireActor(metadata);
    const item = await this.svc.update({
      id: data.id,
      name: data.name,
      isActive: data.isActive,
      sizeIds: data.sizeIds,
      deletedSizeIds: data.deletedSizeIds,
      ...actor,
    });
    return { item: finishToProto(item) };
  }

  @GrpcMethod('InventoryService', 'DeleteFinish')
  delete(
    data: InventoryProto.DeleteFinishRequest,
    metadata: grpc.Metadata,
  ): Promise<InventoryProto.SuccessResponse> {
    const actor = requireActor(metadata);
    return this.svc.delete({ id: data.id, ...actor });
  }

  @GrpcMethod('InventoryService', 'RestoreFinish')
  async restore(
    data: InventoryProto.RestoreFinishRequest,
    metadata: grpc.Metadata,
  ): Promise<InventoryProto.FinishResponse> {
    const actor = requireActor(metadata);
    const item = await this.svc.restore({ id: data.id, ...actor });
    return { item: finishToProto(item) };
  }
}
