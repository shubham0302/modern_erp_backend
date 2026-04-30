import { AnyPlatform, GatewayRequest, UserContext, UserCtx } from '@modern_erp/common';
import { InventoryProto } from '@modern_erp/grpc-types';
import { Body, Controller, Delete, Get, Param, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

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
