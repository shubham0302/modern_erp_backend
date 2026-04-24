import { GatewayRequest, UserContext, UserCtx } from '@modern_erp/common';
import { AdminProto, StaffProto } from '@modern_erp/grpc-types';
import { Controller, Get, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import { GrpcClientRegistry } from '../../grpc/grpc-client.registry';

interface MergedLog {
  id: string;
  source: 'admin' | 'staff';
  userId: string;
  userName: string;
  actionType: string;
  description: string;
  ip: string;
  createdAt: string;
}

@ApiTags('Admin · Security logs')
@ApiBearerAuth('access-token')
@Controller('admin/security-logs')
export class SecurityLogsController {
  constructor(private grpc: GrpcClientRegistry) {}

  @Get()
  @ApiOperation({ summary: 'List merged admin + staff security logs' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'actionType', required: false, type: String })
  @ApiQuery({ name: 'userId', required: false, type: String })
  @ApiQuery({ name: 'from', required: false, type: String, description: 'ISO-8601 timestamp' })
  @ApiQuery({ name: 'to', required: false, type: String, description: 'ISO-8601 timestamp' })
  async list(
    @Query('page') pageStr: string | undefined,
    @Query('limit') limitStr: string | undefined,
    @Query('actionType') actionType: string | undefined,
    @Query('userId') userId: string | undefined,
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @Req() req: GatewayRequest,
    @UserCtx() ctx: UserContext,
  ): Promise<{
    items: MergedLog[];
    total: number;
    page: number;
    limit: number;
  }> {
    const page = pageStr ? Math.max(1, parseInt(pageStr, 10)) : 1;
    const limit = limitStr ? Math.min(200, parseInt(limitStr, 10)) : 50;

    const adminReq: AdminProto.ListSecurityLogsRequest = {
      page: 1,
      limit: 1000,
      adminId: userId ?? '',
      actionType: actionType ?? '',
      from: from ?? '',
      to: to ?? '',
    };
    const staffReq: StaffProto.ListSecurityLogsRequest = {
      page: 1,
      limit: 1000,
      staffId: userId ?? '',
      actionType: actionType ?? '',
      from: from ?? '',
      to: to ?? '',
    };

    const [adminRes, staffRes] = await Promise.all([
      this.grpc.call<AdminProto.ListSecurityLogsRequest, AdminProto.ListSecurityLogsResponse>(
        'admin',
        'listSecurityLogs',
        adminReq,
        ctx,
        req.requestId,
      ),
      this.grpc.call<StaffProto.ListSecurityLogsRequest, StaffProto.ListSecurityLogsResponse>(
        'staff',
        'listSecurityLogs',
        staffReq,
        ctx,
        req.requestId,
      ),
    ]);

    const merged: MergedLog[] = [
      ...adminRes.items.map((i) => ({
        id: i.id,
        source: 'admin' as const,
        userId: i.adminId,
        userName: i.adminName,
        actionType: i.actionType,
        description: i.description,
        ip: i.ip,
        createdAt: i.createdAt,
      })),
      ...staffRes.items.map((i) => ({
        id: i.id,
        source: 'staff' as const,
        userId: i.staffId,
        userName: i.staffName,
        actionType: i.actionType,
        description: i.description,
        ip: i.ip,
        createdAt: i.createdAt,
      })),
    ].sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const total = adminRes.total + staffRes.total;
    const start = (page - 1) * limit;
    const items = merged.slice(start, start + limit);
    return { items, total, page, limit };
  }
}
