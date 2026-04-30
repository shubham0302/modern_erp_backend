import { AdminProto } from '@modern_erp/grpc-types';
import { Controller } from '@nestjs/common';
import { GrpcMethod } from '@nestjs/microservices';

import { AdminSecurityLog } from '../entities/admin-security-log.entity';
import { AdminActionType } from '../enums/admin-action-type.enum';
import { AdminSecurityLogService } from '../services/admin-security-log.service';

function toProto(l: AdminSecurityLog): AdminProto.SecurityLog {
  return {
    id: l.id,
    adminId: l.adminId ?? '',
    adminName: l.adminName ?? '',
    actionType: l.actionType,
    description: l.description ?? '',
    ip: l.ip ?? '',
    createdAt: l.createdAt.toISOString(),
  };
}

@Controller()
export class AdminSecurityLogGrpcController {
  constructor(private svc: AdminSecurityLogService) {}

  @GrpcMethod('AdminService', 'ListSecurityLogs')
  async list(
    data: AdminProto.ListSecurityLogsRequest,
  ): Promise<AdminProto.ListSecurityLogsResponse> {
    const res = await this.svc.list({
      page: data.page,
      limit: data.limit,
      adminId: data.adminId,
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

  @GrpcMethod('AdminService', 'WriteSecurityLog')
  async write(data: AdminProto.WriteSecurityLogRequest): Promise<AdminProto.SuccessResponse> {
    await this.svc.write({
      adminId: data.adminId,
      adminName: data.adminName,
      actionType: data.actionType as AdminActionType,
      description: data.description,
      ip: data.ip,
    });
    return { success: true };
  }
}
