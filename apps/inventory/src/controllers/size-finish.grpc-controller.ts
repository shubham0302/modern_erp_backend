import * as grpc from '@grpc/grpc-js';
import { extractGrpcContext } from '@modern_erp/common';
import { InventoryProto } from '@modern_erp/grpc-types';
import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';

import { SizeFinish } from '../entities/size-finish.entity';
import { SizeFinishService } from '../services/size-finish.service';

import { finishToProto } from './finish.grpc-controller';
import { sizeToProto } from './size.grpc-controller';

export function sizeFinishToProto(sf: SizeFinish): InventoryProto.SizeFinish {
  return {
    id: sf.id,
    size: sf.size ? sizeToProto(sf.size) : undefined,
    finish: sf.finish ? finishToProto(sf.finish) : undefined,
    isActive: sf.isActive,
    createdAt: sf.createdAt.toISOString(),
    updatedAt: sf.updatedAt.toISOString(),
  };
}

@Controller()
export class SizeFinishGrpcController {
  constructor(private svc: SizeFinishService) {}

  @GrpcMethod('InventoryService', 'AddFinishToSize')
  async add(
    data: InventoryProto.AddFinishToSizeRequest,
  ): Promise<InventoryProto.SizeFinishResponse> {
    const item = await this.svc.addFinishToSize({
      sizeId: data.sizeId,
      finishId: data.finishId,
    });
    return { item: sizeFinishToProto(item) };
  }

  @GrpcMethod('InventoryService', 'RemoveFinishFromSize')
  remove(
    data: InventoryProto.RemoveFinishFromSizeRequest,
  ): Promise<InventoryProto.SuccessResponse> {
    return this.svc.removeFinishFromSize({ sizeFinishId: data.sizeFinishId });
  }

  @GrpcMethod('InventoryService', 'ListSizeFinishesBySize')
  async listBySize(
    data: InventoryProto.ListSizeFinishesBySizeRequest,
    metadata: grpc.Metadata,
  ): Promise<InventoryProto.ListSizeFinishesResponse> {
    const { platform } = extractGrpcContext(metadata);
    const items = await this.svc.listBySize(data.sizeId, { activeOnly: platform === 'staff' });
    return { items: items.map(sizeFinishToProto) };
  }
}
