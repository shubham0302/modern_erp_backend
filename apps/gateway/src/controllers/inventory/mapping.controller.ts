import { AnyPlatform, GatewayRequest, UserContext, UserCtx } from '@modern_erp/common';
import { InventoryProto } from '@modern_erp/grpc-types';
import { Body, Controller, Delete, Get, Param, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';

import { AddFinishToSizeDto, AddSeriesToSizeFinishDto } from '../../dto/inventory.dto';
import { GrpcClientRegistry } from '../../grpc/grpc-client.registry';

@ApiTags('Inventory · Mappings')
@ApiBearerAuth('access-token')
@Controller('inventory')
export class InventoryMappingController {
  constructor(private grpc: GrpcClientRegistry) {}

  // ---------- Size <-> Finish ----------

  @Post('sizes/:sizeId/finishes/create')
  @ApiOperation({ summary: 'Map a finish to a size' })
  addFinishToSize(
    @Param('sizeId') sizeId: string,
    @Body() body: AddFinishToSizeDto,
    @Req() req: GatewayRequest,
    @UserCtx() ctx: UserContext,
  ): Promise<InventoryProto.SizeFinishResponse> {
    return this.grpc.call<
      InventoryProto.AddFinishToSizeRequest,
      InventoryProto.SizeFinishResponse
    >('inventory', 'addFinishToSize', { sizeId, finishId: body.finishId }, ctx, req.requestId);
  }

  @Delete('size-finishes/delete/:sizeFinishId')
  @ApiOperation({ summary: 'Remove a (size, finish) mapping (soft-delete)' })
  removeFinishFromSize(
    @Param('sizeFinishId') sizeFinishId: string,
    @Req() req: GatewayRequest,
    @UserCtx() ctx: UserContext,
  ): Promise<InventoryProto.SuccessResponse> {
    return this.grpc.call<
      InventoryProto.RemoveFinishFromSizeRequest,
      InventoryProto.SuccessResponse
    >('inventory', 'removeFinishFromSize', { sizeFinishId }, ctx, req.requestId);
  }

  @Get('sizes/:sizeId/finishes')
  @AnyPlatform()
  @ApiOperation({ summary: 'List finishes mapped to a size' })
  listFinishesForSize(
    @Param('sizeId') sizeId: string,
    @Req() req: GatewayRequest,
    @UserCtx() ctx: UserContext,
  ): Promise<InventoryProto.ListSizeFinishesResponse> {
    return this.grpc.call<
      InventoryProto.ListSizeFinishesBySizeRequest,
      InventoryProto.ListSizeFinishesResponse
    >('inventory', 'listSizeFinishesBySize', { sizeId }, ctx, req.requestId);
  }

  @Get('finishes/:finishId/sizes')
  @AnyPlatform()
  @ApiOperation({ summary: 'List sizes the given finish is available in' })
  listSizesForFinish(
    @Param('finishId') finishId: string,
    @Req() req: GatewayRequest,
    @UserCtx() ctx: UserContext,
  ): Promise<InventoryProto.ListSizeFinishesResponse> {
    return this.grpc.call<
      InventoryProto.ListSizeFinishesByFinishRequest,
      InventoryProto.ListSizeFinishesResponse
    >('inventory', 'listSizeFinishesByFinish', { finishId }, ctx, req.requestId);
  }

  @Get('size-finishes')
  @AnyPlatform()
  @ApiOperation({ summary: 'List every (size, finish) mapping across the catalog.' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
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
      'Admin override: when true, returns only active mappings. Staff is always active-only.',
  })
  listAllSizeFinishes(
    @Query('page') page: string | undefined,
    @Query('limit') limit: string | undefined,
    @Query('all') all: string | undefined,
    @Query('activeOnly') activeOnly: string | undefined,
    @Req() req: GatewayRequest,
    @UserCtx() ctx: UserContext,
  ): Promise<InventoryProto.ListAllSizeFinishesResponse> {
    const payload: InventoryProto.ListAllSizeFinishesRequest = {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
      fetchAll: all === 'true',
      activeOnly: activeOnly === undefined ? undefined : activeOnly === 'true',
    };
    return this.grpc.call<
      InventoryProto.ListAllSizeFinishesRequest,
      InventoryProto.ListAllSizeFinishesResponse
    >('inventory', 'listAllSizeFinishes', payload, ctx, req.requestId);
  }

  // ---------- Series <-> SizeFinish ----------

  @Post('series/:seriesId/size-finishes/create')
  @ApiOperation({ summary: 'Map a (size, finish) combo to a series' })
  addSeriesToSizeFinish(
    @Param('seriesId') seriesId: string,
    @Body() body: AddSeriesToSizeFinishDto,
    @Req() req: GatewayRequest,
    @UserCtx() ctx: UserContext,
  ): Promise<InventoryProto.SeriesSizeFinishResponse> {
    return this.grpc.call<
      InventoryProto.AddSeriesToSizeFinishRequest,
      InventoryProto.SeriesSizeFinishResponse
    >(
      'inventory',
      'addSeriesToSizeFinish',
      { seriesId, sizeFinishId: body.sizeFinishId },
      ctx,
      req.requestId,
    );
  }

  @Delete('series-size-finishes/delete/:seriesSizeFinishId')
  @ApiOperation({ summary: 'Remove a (series, size, finish) mapping (soft-delete)' })
  removeSeriesFromSizeFinish(
    @Param('seriesSizeFinishId') seriesSizeFinishId: string,
    @Req() req: GatewayRequest,
    @UserCtx() ctx: UserContext,
  ): Promise<InventoryProto.SuccessResponse> {
    return this.grpc.call<
      InventoryProto.RemoveSeriesFromSizeFinishRequest,
      InventoryProto.SuccessResponse
    >(
      'inventory',
      'removeSeriesFromSizeFinish',
      { seriesSizeFinishId },
      ctx,
      req.requestId,
    );
  }

  @Get('series/:seriesId/size-finishes')
  @AnyPlatform()
  @ApiOperation({
    summary:
      'List (size, finish) combos mapped to a series. Used by the design-create UI after picking a series.',
  })
  listSizeFinishesForSeries(
    @Param('seriesId') seriesId: string,
    @Req() req: GatewayRequest,
    @UserCtx() ctx: UserContext,
  ): Promise<InventoryProto.ListSeriesSizeFinishesResponse> {
    return this.grpc.call<
      InventoryProto.ListSeriesSizeFinishesBySeriesRequest,
      InventoryProto.ListSeriesSizeFinishesResponse
    >('inventory', 'listSeriesSizeFinishesBySeries', { seriesId }, ctx, req.requestId);
  }
}
