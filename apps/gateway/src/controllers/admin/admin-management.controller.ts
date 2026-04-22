import { ErrorCode, GatewayRequest, UserContext, UserCtx } from '@modern_erp/common';
import { AdminProto } from '@modern_erp/grpc-types';
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

import { CreateAdminDto, UpdateAdminDto } from '../../dto/admin.dto';
import { GrpcClientRegistry } from '../../grpc/grpc-client.registry';

@Controller('admin/admins')
export class AdminManagementController {
  constructor(private grpc: GrpcClientRegistry) {}

  private assertSuper(ctx: UserContext): void {
    if (!ctx.isSuperAdmin) {
      throw new ForbiddenException({ errorCode: ErrorCode.SUPER_ADMIN_REQUIRED });
    }
  }

  @Get()
  list(
    @Query('page') page: string | undefined,
    @Query('limit') limit: string | undefined,
    @Query('search') search: string | undefined,
    @Req() req: GatewayRequest,
    @UserCtx() ctx: UserContext,
  ): Promise<AdminProto.ListAdminsResponse> {
    this.assertSuper(ctx);
    const payload: AdminProto.ListAdminsRequest = {
      actorId: ctx.userId,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
      search: search ?? '',
    };
    return this.grpc.call<AdminProto.ListAdminsRequest, AdminProto.ListAdminsResponse>(
      'admin',
      'listAdmins',
      payload,
      ctx,
      req.requestId,
    );
  }

  @Post()
  create(
    @Body() body: CreateAdminDto,
    @Req() req: GatewayRequest,
    @UserCtx() ctx: UserContext,
  ): Promise<AdminProto.AdminResponse> {
    this.assertSuper(ctx);
    const payload: AdminProto.CreateAdminRequest = {
      actorId: ctx.userId,
      name: body.name,
      email: body.email,
      phone: body.phone,
      password: body.password,
      isSuperAdmin: body.isSuperAdmin ?? false,
    };
    return this.grpc.call<AdminProto.CreateAdminRequest, AdminProto.AdminResponse>(
      'admin',
      'createAdmin',
      payload,
      ctx,
      req.requestId,
    );
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() body: UpdateAdminDto,
    @Req() req: GatewayRequest,
    @UserCtx() ctx: UserContext,
  ): Promise<AdminProto.AdminResponse> {
    this.assertSuper(ctx);
    const payload: AdminProto.UpdateAdminRequest = {
      actorId: ctx.userId,
      id,
      name: body.name,
      phone: body.phone,
      isActive: body.isActive,
      isSuperAdmin: body.isSuperAdmin,
    };
    return this.grpc.call<AdminProto.UpdateAdminRequest, AdminProto.AdminResponse>(
      'admin',
      'updateAdmin',
      payload,
      ctx,
      req.requestId,
    );
  }

  @Delete(':id')
  delete(
    @Param('id') id: string,
    @Req() req: GatewayRequest,
    @UserCtx() ctx: UserContext,
  ): Promise<AdminProto.SuccessResponse> {
    this.assertSuper(ctx);
    return this.grpc.call<AdminProto.DeleteAdminRequest, AdminProto.SuccessResponse>(
      'admin',
      'deleteAdmin',
      { actorId: ctx.userId, id },
      ctx,
      req.requestId,
    );
  }
}
