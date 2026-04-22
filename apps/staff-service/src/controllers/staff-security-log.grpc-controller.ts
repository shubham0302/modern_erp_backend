import { StaffProto } from '@modern_erp/grpc-types';
import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';

import { StaffSecurityLog } from '../entities/staff-security-log.entity';
import { StaffActionType } from '../enums/staff-action-type.enum';
import { StaffSecurityLogService } from '../services/staff-security-log.service';

function toProto(l: StaffSecurityLog): StaffProto.SecurityLog {
  return {
    id: l.id,
    staffId: l.staffId ?? '',
    staffName: l.staffName ?? '',
    actionType: l.actionType,
    description: l.description ?? '',
    ip: l.ip ?? '',
    createdAt: l.createdAt.toISOString(),
  };
}

@Controller()
export class StaffSecurityLogGrpcController {
  constructor(private svc: StaffSecurityLogService) {}

  @GrpcMethod('StaffService', 'ListSecurityLogs')
  async list(
    data: StaffProto.ListSecurityLogsRequest,
  ): Promise<StaffProto.ListSecurityLogsResponse> {
    const res = await this.svc.list({
      page: data.page,
      limit: data.limit,
      staffId: data.staffId,
      actionType: data.actionType,
      from: data.from,
      to: data.to,
    });
    return {
      items: res.items.map(toProto),
      total: res.total,
      page: res.page,
      limit: res.limit,
    };
  }

  @GrpcMethod('StaffService', 'WriteSecurityLog')
  async write(data: StaffProto.WriteSecurityLogRequest): Promise<StaffProto.SuccessResponse> {
    await this.svc.write({
      staffId: data.staffId,
      staffName: data.staffName,
      actionType: data.actionType as StaffActionType,
      description: data.description,
      ip: data.ip,
    });
    return { success: true };
  }
}
