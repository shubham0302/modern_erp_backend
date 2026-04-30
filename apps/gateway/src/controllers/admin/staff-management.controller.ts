import { ErrorCode, GatewayRequest, UserContext, UserCtx } from '@modern_erp/common';
import { StaffProto } from '@modern_erp/grpc-types';
import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import {
  AdminChangeStaffPasswordDto,
  CreateStaffDto,
  UpdateStaffDto,
} from '../../dto/staff.dto';
import { GrpcClientRegistry } from '../../grpc/grpc-client.registry';

@ApiTags('Admin · Staff management')
@ApiBearerAuth('access-token')
@Controller('admin')
export class StaffManagementController {
  constructor(private grpc: GrpcClientRegistry) {}

  @Get('staff')
  @ApiOperation({ summary: 'List staff (filterable)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'roleId', required: false, type: String })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean })
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

  @Get('staff/:id')
  @ApiOperation({ summary: 'Get staff by id (staff fields only)' })
  async getDetail(
    @Param('id') id: string,
    @Req() req: GatewayRequest,
    @UserCtx() ctx: UserContext,
  ): Promise<StaffProto.Staff> {
    const res = await this.grpc.call<
      StaffProto.GetStaffDetailRequest,
      StaffProto.StaffDetailResponse
    >('staff', 'getStaffDetail', { id }, ctx, req.requestId);
    return res.staff!;
  }

  @Post('create/staff')
  @ApiOperation({ summary: 'Create a new staff member' })
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

  @Patch('update/staff/:id')
  @ApiOperation({ summary: 'Update staff name/phone/role (email — super admin only)' })
  update(
    @Param('id') id: string,
    @Body() body: UpdateStaffDto,
    @Req() req: GatewayRequest,
    @UserCtx() ctx: UserContext,
  ): Promise<StaffProto.StaffResponse> {
    if (body.email !== undefined && !ctx.isSuperAdmin) {
      throw new ForbiddenException({ errorCode: ErrorCode.SUPER_ADMIN_REQUIRED });
    }
    return this.grpc.call<StaffProto.UpdateStaffRequest, StaffProto.StaffResponse>(
      'staff',
      'updateStaff',
      { id, name: body.name, phone: body.phone, roleId: body.roleId, email: body.email },
      ctx,
      req.requestId,
    );
  }

  @Delete('delete/staff/:id')
  @ApiOperation({ summary: 'Delete a staff member' })
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

  @Post('recover/staff/:id')
  @ApiOperation({ summary: 'Recover a soft-deleted staff member' })
  recover(
    @Param('id') id: string,
    @Req() req: GatewayRequest,
    @UserCtx() ctx: UserContext,
  ): Promise<StaffProto.StaffResponse> {
    return this.grpc.call<StaffProto.RecoverStaffRequest, StaffProto.StaffResponse>(
      'staff',
      'recoverStaff',
      { id },
      ctx,
      req.requestId,
    );
  }

  @Post('change-password/staff/:id')
  @ApiOperation({ summary: 'Admin-initiated password reset for a staff member' })
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
