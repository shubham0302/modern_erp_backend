import * as grpc from '@grpc/grpc-js';
import { ErrorCode, extractGrpcContext } from '@modern_erp/common';
import { InventoryProto } from '@modern_erp/grpc-types';
import { Controller } from '@nestjs/common';
import { GrpcMethod, RpcException } from '@nestjs/microservices';

import { Size } from '../entities/size.entity';
import { SizeService } from '../services/size.service';

export function sizeToProto(s: Size): InventoryProto.Size {
  return {
    id: s.id,
    name: s.name,
    isActive: s.isActive,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
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
export class SizeGrpcController {
  constructor(private svc: SizeService) {}

  @GrpcMethod('InventoryService', 'ListSizes')
  async list(
    data: InventoryProto.ListSizesRequest,
    metadata: grpc.Metadata,
  ): Promise<InventoryProto.ListSizesResponse> {
    const { platform } = extractGrpcContext(metadata);
    const isStaff = platform === 'staff';
    const res = await this.svc.list({
      page: data.page,
      limit: data.limit,
      search: data.search,
      activeOnly: isStaff || data.activeOnly === true,
      includeDeleted: !isStaff,
      fetchAll: data.fetchAll,
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
  async create(
    data: InventoryProto.CreateSizeRequest,
    metadata: grpc.Metadata,
  ): Promise<InventoryProto.SizeResponse> {
    const actor = requireActor(metadata);
    const item = await this.svc.create({ name: data.name, ...actor });
    return { item: sizeToProto(item) };
  }

  @GrpcMethod('InventoryService', 'UpdateSize')
  async update(
    data: InventoryProto.UpdateSizeRequest,
    metadata: grpc.Metadata,
  ): Promise<InventoryProto.SizeResponse> {
    const actor = requireActor(metadata);
    const item = await this.svc.update({
      id: data.id,
      name: data.name,
      isActive: data.isActive,
      ...actor,
    });
    return { item: sizeToProto(item) };
  }

  @GrpcMethod('InventoryService', 'DeleteSize')
  delete(
    data: InventoryProto.DeleteSizeRequest,
    metadata: grpc.Metadata,
  ): Promise<InventoryProto.SuccessResponse> {
    const actor = requireActor(metadata);
    return this.svc.delete({ id: data.id, ...actor });
  }

  @GrpcMethod('InventoryService', 'RestoreSize')
  async restore(
    data: InventoryProto.RestoreSizeRequest,
    metadata: grpc.Metadata,
  ): Promise<InventoryProto.SizeResponse> {
    const actor = requireActor(metadata);
    const item = await this.svc.restore({ id: data.id, ...actor });
    return { item: sizeToProto(item) };
  }
}
