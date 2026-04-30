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

import { CreateFinishDto, UpdateFinishDto } from '../../dto/inventory.dto';
import { GrpcClientRegistry } from '../../grpc/grpc-client.registry';

@ApiTags('Inventory · Finishes')
@ApiBearerAuth('access-token')
@Controller('inventory/finishes')
export class FinishController {
  constructor(private grpc: GrpcClientRegistry) {}

  @Get()
  @AnyPlatform()
  @ApiOperation({ summary: 'List finishes' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  list(
    @Query('page') page: string | undefined,
    @Query('limit') limit: string | undefined,
    @Query('search') search: string | undefined,
    @Req() req: GatewayRequest,
    @UserCtx() ctx: UserContext,
  ): Promise<InventoryProto.ListFinishesResponse> {
    const payload: InventoryProto.ListFinishesRequest = {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
      search: search ?? '',
    };
    return this.grpc.call<InventoryProto.ListFinishesRequest, InventoryProto.ListFinishesResponse>(
      'inventory',
      'listFinishes',
      payload,
      ctx,
      req.requestId,
    );
  }

  @Get(':id')
  @AnyPlatform()
  @ApiOperation({ summary: 'Get a finish by id' })
  get(
    @Param('id') id: string,
    @Req() req: GatewayRequest,
    @UserCtx() ctx: UserContext,
  ): Promise<InventoryProto.FinishResponse> {
    return this.grpc.call<InventoryProto.GetFinishRequest, InventoryProto.FinishResponse>(
      'inventory',
      'getFinish',
      { id },
      ctx,
      req.requestId,
    );
  }

  @Post('create')
  @ApiOperation({ summary: 'Create a finish' })
  create(
    @Body() body: CreateFinishDto,
    @Req() req: GatewayRequest,
    @UserCtx() ctx: UserContext,
  ): Promise<InventoryProto.FinishResponse> {
    return this.grpc.call<InventoryProto.CreateFinishRequest, InventoryProto.FinishResponse>(
      'inventory',
      'createFinish',
      { name: body.name },
      ctx,
      req.requestId,
    );
  }

  @Patch('update/:id')
  @ApiOperation({ summary: 'Update a finish' })
  update(
    @Param('id') id: string,
    @Body() body: UpdateFinishDto,
    @Req() req: GatewayRequest,
    @UserCtx() ctx: UserContext,
  ): Promise<InventoryProto.FinishResponse> {
    return this.grpc.call<InventoryProto.UpdateFinishRequest, InventoryProto.FinishResponse>(
      'inventory',
      'updateFinish',
      { id, name: body.name, isActive: body.isActive },
      ctx,
      req.requestId,
    );
  }

  @Delete('delete/:id')
  @ApiOperation({ summary: 'Soft-delete a finish' })
  delete(
    @Param('id') id: string,
    @Req() req: GatewayRequest,
    @UserCtx() ctx: UserContext,
  ): Promise<InventoryProto.SuccessResponse> {
    return this.grpc.call<InventoryProto.DeleteFinishRequest, InventoryProto.SuccessResponse>(
      'inventory',
      'deleteFinish',
      { id },
      ctx,
      req.requestId,
    );
  }

  @Post('restore/:id')
  @ApiOperation({ summary: 'Restore a soft-deleted finish' })
  restore(
    @Param('id') id: string,
    @Req() req: GatewayRequest,
    @UserCtx() ctx: UserContext,
  ): Promise<InventoryProto.FinishResponse> {
    return this.grpc.call<InventoryProto.RestoreFinishRequest, InventoryProto.FinishResponse>(
      'inventory',
      'restoreFinish',
      { id },
      ctx,
      req.requestId,
    );
  }
}
