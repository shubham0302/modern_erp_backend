import * as grpc from '@grpc/grpc-js';
import { extractGrpcContext } from '@modern_erp/common';
import { InventoryProto } from '@modern_erp/grpc-types';
import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';

import { DesignService, DesignWithRelations } from '../services/design.service';

import { seriesToProto } from './series.grpc-controller';
import { sizeFinishToProto } from './size-finish.grpc-controller';

export function designToProto(d: DesignWithRelations): InventoryProto.Design {
  return {
    id: d.id,
    name: d.name,
    thumbnailUrl: d.thumbnailUrl ?? '',
    series: d.series ? seriesToProto(d.series) : undefined,
    sizeFinishes: (d.sizeFinishes ?? []).map(sizeFinishToProto),
    isActive: d.isActive,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
    status: d.status,
    approvedAt: d.approvedAt ? d.approvedAt.toISOString() : '',
    statusHistory: (d.statusHistory ?? []).map((e) => ({
      status: e.status,
      date: e.date,
      reason: e.reason ?? '',
    })),
    rejectionReason: d.rejectionReason ?? '',
    createdBy: d.createdBy ?? '',
    createdByName: d.createdByName ?? '',
    approvedBy: d.approvedBy ?? '',
    approvedByName: d.approvedByName ?? '',
    updatedBy: d.updatedBy ?? '',
    updatedByName: d.updatedByName ?? '',
  };
}

function actor(metadata: grpc.Metadata): { userId: string; userName: string; platform: string } {
  const { userId, userName, platform } = extractGrpcContext(metadata);
  return { userId: userId ?? '', userName: userName ?? '', platform: platform ?? '' };
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
  async create(
    data: InventoryProto.CreateDesignRequest,
    metadata: grpc.Metadata,
  ): Promise<InventoryProto.DesignResponse> {
    const { userId, userName, platform } = actor(metadata);
    const item = await this.svc.create({
      name: data.name,
      thumbnailUrl: data.thumbnailUrl || null,
      seriesId: data.seriesId,
      sizeFinishIds: data.sizeFinishIds ?? [],
      platform,
      userId,
      userName,
    });
    return { item: designToProto(item) };
  }

  @GrpcMethod('InventoryService', 'UpdateDesign')
  async update(
    data: InventoryProto.UpdateDesignRequest,
    metadata: grpc.Metadata,
  ): Promise<InventoryProto.DesignResponse> {
    const { userId, userName } = actor(metadata);
    const item = await this.svc.update({
      id: data.id,
      name: data.name,
      isActive: data.isActive,
      thumbnailUrl: data.thumbnailUrl,
      seriesId: data.seriesId,
      sizeFinishIds: data.sizeFinishIds,
      userId,
      userName,
    });
    return { item: designToProto(item) };
  }

  @GrpcMethod('InventoryService', 'DeleteDesign')
  delete(
    data: InventoryProto.DeleteDesignRequest,
    metadata: grpc.Metadata,
  ): Promise<InventoryProto.SuccessResponse> {
    const { userId, userName } = actor(metadata);
    return this.svc.delete({ id: data.id, userId, userName });
  }

  @GrpcMethod('InventoryService', 'RestoreDesign')
  async restore(
    data: InventoryProto.RestoreDesignRequest,
    metadata: grpc.Metadata,
  ): Promise<InventoryProto.DesignResponse> {
    const { userId, userName } = actor(metadata);
    const item = await this.svc.restore({ id: data.id, userId, userName });
    return { item: designToProto(item) };
  }

  @GrpcMethod('InventoryService', 'ApproveDesign')
  async approve(
    data: InventoryProto.ApproveDesignRequest,
    metadata: grpc.Metadata,
  ): Promise<InventoryProto.DesignResponse> {
    const { userId, userName } = actor(metadata);
    const item = await this.svc.approve({ id: data.id, userId, userName });
    return { item: designToProto(item) };
  }

  @GrpcMethod('InventoryService', 'RejectDesign')
  async reject(
    data: InventoryProto.RejectDesignRequest,
    metadata: grpc.Metadata,
  ): Promise<InventoryProto.DesignResponse> {
    const { userId, userName } = actor(metadata);
    const item = await this.svc.reject({ id: data.id, reason: data.reason, userId, userName });
    return { item: designToProto(item) };
  }
}
