import { GatewayRequest, UserContext, UserCtx } from '@modern_erp/common';
import { StaffProto } from '@modern_erp/grpc-types';
import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import { CreateRoleDto, UpdateRoleDto } from '../../dto/role.dto';
import { GrpcClientRegistry } from '../../grpc/grpc-client.registry';

@ApiTags('Admin · Roles')
@ApiBearerAuth('access-token')
@Controller('admin')
export class RoleManagementController {
  constructor(private grpc: GrpcClientRegistry) {}

  @Get('roles')
  @ApiOperation({ summary: 'List roles' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  list(
    @Query('page') page: string | undefined,
    @Query('limit') limit: string | undefined,
    @Query('search') search: string | undefined,
    @Req() req: GatewayRequest,
    @UserCtx() ctx: UserContext,
  ): Promise<StaffProto.ListRolesResponse> {
    const payload: StaffProto.ListRolesRequest = {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
      search: search ?? '',
    };
    return this.grpc.call<StaffProto.ListRolesRequest, StaffProto.ListRolesResponse>(
      'staff',
      'listRoles',
      payload,
      ctx,
      req.requestId,
    );
  }

  @Get('role/:id')
  @ApiOperation({ summary: 'Get role with permissions' })
  get(
    @Param('id') id: string,
    @Req() req: GatewayRequest,
    @UserCtx() ctx: UserContext,
  ): Promise<StaffProto.RoleDetailResponse> {
    return this.grpc.call<StaffProto.GetRoleRequest, StaffProto.RoleDetailResponse>(
      'staff',
      'getRole',
      { id },
      ctx,
      req.requestId,
    );
  }

  @Post('create/role')
  @ApiOperation({ summary: 'Create a new role with permissions' })
  create(
    @Body() body: CreateRoleDto,
    @Req() req: GatewayRequest,
    @UserCtx() ctx: UserContext,
  ): Promise<StaffProto.RoleDetailResponse> {
    const payload: StaffProto.CreateRoleRequest = {
      name: body.name,
      description: body.description ?? '',
      permissions: body.permissions,
    };
    return this.grpc.call<StaffProto.CreateRoleRequest, StaffProto.RoleDetailResponse>(
      'staff',
      'createRole',
      payload,
      ctx,
      req.requestId,
    );
  }

  @Patch('update/role/:id')
  @ApiOperation({
    summary:
      'Update a role. When `permissions` is provided, replaces the role\'s full permission set.',
  })
  update(
    @Param('id') id: string,
    @Body() body: UpdateRoleDto,
    @Req() req: GatewayRequest,
    @UserCtx() ctx: UserContext,
  ): Promise<StaffProto.RoleDetailResponse> {
    return this.grpc.call<StaffProto.UpdateRoleRequest, StaffProto.RoleDetailResponse>(
      'staff',
      'updateRole',
      {
        id,
        name: body.name,
        description: body.description,
        updatePermissions: body.permissions !== undefined,
        permissions: body.permissions ?? [],
      },
      ctx,
      req.requestId,
    );
  }

  @Delete('delete/role/:id')
  @ApiOperation({ summary: 'Delete a role' })
  delete(
    @Param('id') id: string,
    @Req() req: GatewayRequest,
    @UserCtx() ctx: UserContext,
  ): Promise<StaffProto.SuccessResponse> {
    return this.grpc.call<StaffProto.DeleteRoleRequest, StaffProto.SuccessResponse>(
      'staff',
      'deleteRole',
      { id },
      ctx,
      req.requestId,
    );
  }
}
