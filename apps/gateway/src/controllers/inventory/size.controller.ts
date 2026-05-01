import { AnyPlatform, GatewayRequest, UserContext, UserCtx } from '@modern_erp/common';
import { InventoryProto } from '@modern_erp/grpc-types';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import { CreateSizeDto, UpdateSizeDto } from '../../dto/inventory.dto';
import { GrpcClientRegistry } from '../../grpc/grpc-client.registry';

@ApiTags('Inventory · Sizes')
@ApiBearerAuth('access-token')
@Controller('inventory/sizes')
export class SizeController {
  constructor(private grpc: GrpcClientRegistry) {}

  @Get()
  @AnyPlatform()
  @ApiOperation({ summary: 'List sizes' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({
    name: 'all',
    required: false,
    type: Boolean,
    description: 'When true, returns every row in one response and ignores page/limit.',
  })
  @ApiQuery({
    name: 'activeOnly',
    required: false,
    type: Boolean,
    description:
      'Admin override: when true, returns only active sizes. Staff is always active-only.',
  })
  list(
    @Query('page') page: string | undefined,
    @Query('limit') limit: string | undefined,
    @Query('search') search: string | undefined,
    @Query('all') all: string | undefined,
    @Query('activeOnly') activeOnly: string | undefined,
    @Req() req: GatewayRequest,
    @UserCtx() ctx: UserContext,
  ): Promise<InventoryProto.ListSizesResponse> {
    const payload: InventoryProto.ListSizesRequest = {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
      search: search ?? '',
      fetchAll: all === 'true',
      activeOnly: activeOnly === undefined ? undefined : activeOnly === 'true',
    };
    return this.grpc.call<InventoryProto.ListSizesRequest, InventoryProto.ListSizesResponse>(
      'inventory',
      'listSizes',
      payload,
      ctx,
      req.requestId,
    );
  }

  @Get(':id')
  @AnyPlatform()
  @ApiOperation({ summary: 'Get a size by id' })
  get(
    @Param('id') id: string,
    @Req() req: GatewayRequest,
    @UserCtx() ctx: UserContext,
  ): Promise<InventoryProto.SizeResponse> {
    return this.grpc.call<InventoryProto.GetSizeRequest, InventoryProto.SizeResponse>(
      'inventory',
      'getSize',
      { id },
      ctx,
      req.requestId,
    );
  }

  @Post('create')
  @ApiOperation({ summary: 'Create a size' })
  create(
    @Body() body: CreateSizeDto,
    @Req() req: GatewayRequest,
    @UserCtx() ctx: UserContext,
  ): Promise<InventoryProto.SizeResponse> {
    return this.grpc.call<InventoryProto.CreateSizeRequest, InventoryProto.SizeResponse>(
      'inventory',
      'createSize',
      { name: body.name },
      ctx,
      req.requestId,
    );
  }

  @Patch('update/:id')
  @ApiOperation({ summary: 'Update a size' })
  update(
    @Param('id') id: string,
    @Body() body: UpdateSizeDto,
    @Req() req: GatewayRequest,
    @UserCtx() ctx: UserContext,
  ): Promise<InventoryProto.SizeResponse> {
    return this.grpc.call<InventoryProto.UpdateSizeRequest, InventoryProto.SizeResponse>(
      'inventory',
      'updateSize',
      { id, name: body.name, isActive: body.isActive },
      ctx,
      req.requestId,
    );
  }

  @Delete('delete/:id')
  @ApiOperation({ summary: 'Soft-delete a size' })
  delete(
    @Param('id') id: string,
    @Req() req: GatewayRequest,
    @UserCtx() ctx: UserContext,
  ): Promise<InventoryProto.SuccessResponse> {
    return this.grpc.call<InventoryProto.DeleteSizeRequest, InventoryProto.SuccessResponse>(
      'inventory',
      'deleteSize',
      { id },
      ctx,
      req.requestId,
    );
  }

  @Post('restore/:id')
  @ApiOperation({ summary: 'Restore a soft-deleted size' })
  restore(
    @Param('id') id: string,
    @Req() req: GatewayRequest,
    @UserCtx() ctx: UserContext,
  ): Promise<InventoryProto.SizeResponse> {
    return this.grpc.call<InventoryProto.RestoreSizeRequest, InventoryProto.SizeResponse>(
      'inventory',
      'restoreSize',
      { id },
      ctx,
      req.requestId,
    );
  }
}
