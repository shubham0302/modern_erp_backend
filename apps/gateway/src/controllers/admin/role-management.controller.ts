import { GatewayRequest, UserContext, UserCtx } from '@modern_erp/common';
import { StaffProto } from '@modern_erp/grpc-types';
import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import { CreateRoleDto, ReplacePermissionsDto, UpdateRoleDto } from '../../dto/role.dto';
import { GrpcClientRegistry } from '../../grpc/grpc-client.registry';

@ApiTags('Admin · Roles')
@ApiBearerAuth('access-token')
@Controller('admin/roles')
export class RoleManagementController {
  constructor(private grpc: GrpcClientRegistry) {}

  @Get()
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

  @Get(':id')
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

  @Post()
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

  @Patch(':id')
  @ApiOperation({ summary: 'Update role name/description' })
  update(
    @Param('id') id: string,
    @Body() body: UpdateRoleDto,
    @Req() req: GatewayRequest,
    @UserCtx() ctx: UserContext,
  ): Promise<StaffProto.RoleResponse> {
    return this.grpc.call<StaffProto.UpdateRoleRequest, StaffProto.RoleResponse>(
      'staff',
      'updateRole',
      { id, name: body.name, description: body.description },
      ctx,
      req.requestId,
    );
  }

  @Delete(':id')
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

  @Put(':id/permissions')
  @ApiOperation({ summary: 'Replace the full permission set for a role' })
  replacePermissions(
    @Param('id') id: string,
    @Body() body: ReplacePermissionsDto,
    @Req() req: GatewayRequest,
    @UserCtx() ctx: UserContext,
  ): Promise<StaffProto.RolePermissionsResponse> {
    return this.grpc.call<
      StaffProto.ReplaceRolePermissionsRequest,
      StaffProto.RolePermissionsResponse
    >(
      'staff',
      'replaceRolePermissions',
      { roleId: id, permissions: body.permissions },
      ctx,
      req.requestId,
    );
  }
}
