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

import {
  CreateDesignDto,
  RejectDesignDto,
  UpdateDesignDto,
} from '../../dto/inventory.dto';
import { GrpcClientRegistry } from '../../grpc/grpc-client.registry';

@ApiTags('Inventory · Designs')
@ApiBearerAuth('access-token')
@Controller('inventory/designs')
export class DesignController {
  constructor(private grpc: GrpcClientRegistry) {}

  @Get()
  @AnyPlatform()
  @ApiOperation({ summary: 'List designs' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'seriesId', required: false, type: String })
  @ApiQuery({ name: 'sizeFinishId', required: false, type: String })
  list(
    @Query('page') page: string | undefined,
    @Query('limit') limit: string | undefined,
    @Query('search') search: string | undefined,
    @Query('seriesId') seriesId: string | undefined,
    @Query('sizeFinishId') sizeFinishId: string | undefined,
    @Req() req: GatewayRequest,
    @UserCtx() ctx: UserContext,
  ): Promise<InventoryProto.ListDesignsResponse> {
    const payload: InventoryProto.ListDesignsRequest = {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
      search: search ?? '',
      seriesId: seriesId ?? '',
      sizeFinishId: sizeFinishId ?? '',
    };
    return this.grpc.call<InventoryProto.ListDesignsRequest, InventoryProto.ListDesignsResponse>(
      'inventory',
      'listDesigns',
      payload,
      ctx,
      req.requestId,
    );
  }

  @Get(':id')
  @AnyPlatform()
  @ApiOperation({ summary: 'Get a design by id' })
  get(
    @Param('id') id: string,
    @Req() req: GatewayRequest,
    @UserCtx() ctx: UserContext,
  ): Promise<InventoryProto.DesignResponse> {
    return this.grpc.call<InventoryProto.GetDesignRequest, InventoryProto.DesignResponse>(
      'inventory',
      'getDesign',
      { id },
      ctx,
      req.requestId,
    );
  }

  @Post('create')
  @AnyPlatform()
  @ApiOperation({
    summary: 'Create a design under a Series with one or more SizeFinish ids',
  })
  create(
    @Body() body: CreateDesignDto,
    @Req() req: GatewayRequest,
    @UserCtx() ctx: UserContext,
  ): Promise<InventoryProto.DesignResponse> {
    return this.grpc.call<InventoryProto.CreateDesignRequest, InventoryProto.DesignResponse>(
      'inventory',
      'createDesign',
      {
        name: body.name,
        thumbnailUrl: body.thumbnailUrl ?? '',
        seriesId: body.seriesId,
        sizeFinishIds: body.sizeFinishIds,
      },
      ctx,
      req.requestId,
    );
  }

  @Patch('update/:id')
  @ApiOperation({ summary: 'Update a design' })
  update(
    @Param('id') id: string,
    @Body() body: UpdateDesignDto,
    @Req() req: GatewayRequest,
    @UserCtx() ctx: UserContext,
  ): Promise<InventoryProto.DesignResponse> {
    return this.grpc.call<InventoryProto.UpdateDesignRequest, InventoryProto.DesignResponse>(
      'inventory',
      'updateDesign',
      {
        id,
        name: body.name,
        isActive: body.isActive,
        thumbnailUrl: body.thumbnailUrl,
        seriesId: body.seriesId,
        sizeFinishIds: body.sizeFinishIds ?? [],
      },
      ctx,
      req.requestId,
    );
  }

  @Delete('delete/:id')
  @ApiOperation({ summary: 'Soft-delete a design' })
  delete(
    @Param('id') id: string,
    @Req() req: GatewayRequest,
    @UserCtx() ctx: UserContext,
  ): Promise<InventoryProto.SuccessResponse> {
    return this.grpc.call<InventoryProto.DeleteDesignRequest, InventoryProto.SuccessResponse>(
      'inventory',
      'deleteDesign',
      { id },
      ctx,
      req.requestId,
    );
  }

  @Post('restore/:id')
  @ApiOperation({ summary: 'Restore a soft-deleted design' })
  restore(
    @Param('id') id: string,
    @Req() req: GatewayRequest,
    @UserCtx() ctx: UserContext,
  ): Promise<InventoryProto.DesignResponse> {
    return this.grpc.call<InventoryProto.RestoreDesignRequest, InventoryProto.DesignResponse>(
      'inventory',
      'restoreDesign',
      { id },
      ctx,
      req.requestId,
    );
  }

  @Post('approve/:id')
  @ApiOperation({
    summary: 'Approve a design',
    description:
      "Sets status to 'approved', stamps approvedAt, clears any rejection reason, and appends to status history.",
  })
  approve(
    @Param('id') id: string,
    @Req() req: GatewayRequest,
    @UserCtx() ctx: UserContext,
  ): Promise<InventoryProto.DesignResponse> {
    return this.grpc.call<InventoryProto.ApproveDesignRequest, InventoryProto.DesignResponse>(
      'inventory',
      'approveDesign',
      { id },
      ctx,
      req.requestId,
    );
  }

  @Post('reject/:id')
  @ApiOperation({
    summary: 'Reject a design with a reason',
    description:
      "Sets status to 'rejected', stores the reason on the design and the latest history entry. The reason is shown to staff.",
  })
  reject(
    @Param('id') id: string,
    @Body() body: RejectDesignDto,
    @Req() req: GatewayRequest,
    @UserCtx() ctx: UserContext,
  ): Promise<InventoryProto.DesignResponse> {
    return this.grpc.call<InventoryProto.RejectDesignRequest, InventoryProto.DesignResponse>(
      'inventory',
      'rejectDesign',
      { id, reason: body.reason },
      ctx,
      req.requestId,
    );
  }
}
