import { GatewayRequest, UserContext, UserCtx } from '@modern_erp/common';
import { StaffProto } from '@modern_erp/grpc-types';
import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';

import {
  AdminChangeStaffPasswordDto,
  CreateStaffDto,
  SetStaffActiveDto,
  UpdateStaffDto,
} from '../../dto/staff.dto';
import { GrpcClientRegistry } from '../../grpc/grpc-client.registry';

@Controller('admin/staff')
export class StaffManagementController {
  constructor(private grpc: GrpcClientRegistry) {}

  @Get()
  list(
    @Query('page') page: string | undefined,
    @Query('limit') limit: string | undefined,
    @Query('search') search: string | undefined,
    @Query('roleId') roleId: string | undefined,
    @Query('isActive') isActiveRaw: string | undefined,
    @Req() req: GatewayRequest,
    @UserCtx() ctx: UserContext,
  ): Promise<StaffProto.ListStaffResponse> {
    const payload: StaffProto.ListStaffRequest = {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
      search: search ?? '',
      roleId: roleId ?? '',
      isActive: isActiveRaw === undefined ? undefined : isActiveRaw === 'true',
    };
    return this.grpc.call<StaffProto.ListStaffRequest, StaffProto.ListStaffResponse>(
      'staff',
      'listStaff',
      payload,
      ctx,
      req.requestId,
    );
  }

  @Get(':id')
  getDetail(
    @Param('id') id: string,
    @Req() req: GatewayRequest,
    @UserCtx() ctx: UserContext,
  ): Promise<StaffProto.StaffDetailResponse> {
    return this.grpc.call<StaffProto.GetStaffDetailRequest, StaffProto.StaffDetailResponse>(
      'staff',
      'getStaffDetail',
      { id },
      ctx,
      req.requestId,
    );
  }

  @Post()
  create(
    @Body() body: CreateStaffDto,
    @Req() req: GatewayRequest,
    @UserCtx() ctx: UserContext,
  ): Promise<StaffProto.StaffResponse> {
    const payload: StaffProto.CreateStaffRequest = {
      name: body.name,
      email: body.email,
      phone: body.phone,
      password: body.password,
      roleId: body.roleId,
    };
    return this.grpc.call<StaffProto.CreateStaffRequest, StaffProto.StaffResponse>(
      'staff',
      'createStaff',
      payload,
      ctx,
      req.requestId,
    );
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: UpdateStaffDto,
    @Req() req: GatewayRequest,
    @UserCtx() ctx: UserContext,
  ): Promise<StaffProto.StaffResponse> {
    return this.grpc.call<StaffProto.UpdateStaffRequest, StaffProto.StaffResponse>(
      'staff',
      'updateStaff',
      { id, name: body.name, phone: body.phone, roleId: body.roleId },
      ctx,
      req.requestId,
    );
  }

  @Delete(':id')
  delete(
    @Param('id') id: string,
    @Req() req: GatewayRequest,
    @UserCtx() ctx: UserContext,
  ): Promise<StaffProto.SuccessResponse> {
    return this.grpc.call<StaffProto.DeleteStaffRequest, StaffProto.SuccessResponse>(
      'staff',
      'deleteStaff',
      { id },
      ctx,
      req.requestId,
    );
  }

  @Patch(':id/active')
  setActive(
    @Param('id') id: string,
    @Body() body: SetStaffActiveDto,
    @Req() req: GatewayRequest,
    @UserCtx() ctx: UserContext,
  ): Promise<StaffProto.StaffResponse> {
    return this.grpc.call<StaffProto.SetStaffActiveRequest, StaffProto.StaffResponse>(
      'staff',
      'setStaffActive',
      { id, isActive: body.isActive },
      ctx,
      req.requestId,
    );
  }

  @Post(':id/change-password')
  adminChangePassword(
    @Param('id') id: string,
    @Body() body: AdminChangeStaffPasswordDto,
    @Req() req: GatewayRequest,
    @UserCtx() ctx: UserContext,
  ): Promise<StaffProto.SuccessResponse> {
    return this.grpc.call<StaffProto.AdminChangeStaffPasswordRequest, StaffProto.SuccessResponse>(
      'staff',
      'adminChangeStaffPassword',
      { id, newPassword: body.newPassword },
      ctx,
      req.requestId,
    );
  }
}
