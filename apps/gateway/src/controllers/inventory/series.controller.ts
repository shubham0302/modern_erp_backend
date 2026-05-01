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

import { CreateSeriesDto, UpdateSeriesDto } from '../../dto/inventory.dto';
import { GrpcClientRegistry } from '../../grpc/grpc-client.registry';

@ApiTags('Inventory · Series')
@ApiBearerAuth('access-token')
@Controller('inventory/series')
export class SeriesController {
  constructor(private grpc: GrpcClientRegistry) {}

  @Get()
  @AnyPlatform()
  @ApiOperation({ summary: 'List series' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  list(
    @Query('page') page: string | undefined,
    @Query('limit') limit: string | undefined,
    @Query('search') search: string | undefined,
    @Req() req: GatewayRequest,
    @UserCtx() ctx: UserContext,
  ): Promise<InventoryProto.ListSeriesResponse> {
    const payload: InventoryProto.ListSeriesRequest = {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 50,
      search: search ?? '',
    };
    return this.grpc.call<InventoryProto.ListSeriesRequest, InventoryProto.ListSeriesResponse>(
      'inventory',
      'listSeries',
      payload,
      ctx,
      req.requestId,
    );
  }

  @Get(':id')
  @AnyPlatform()
  @ApiOperation({ summary: 'Get a series by id' })
  get(
    @Param('id') id: string,
    @Req() req: GatewayRequest,
    @UserCtx() ctx: UserContext,
  ): Promise<InventoryProto.SeriesResponse> {
    return this.grpc.call<InventoryProto.GetSeriesRequest, InventoryProto.SeriesResponse>(
      'inventory',
      'getSeries',
      { id },
      ctx,
      req.requestId,
    );
  }

  @Post('create')
  @ApiOperation({
    summary: 'Create a series',
    description:
      'Optionally include sizeFinishIds to bind (size, finish) mappings to the series atomically.',
  })
  create(
    @Body() body: CreateSeriesDto,
    @Req() req: GatewayRequest,
    @UserCtx() ctx: UserContext,
  ): Promise<InventoryProto.SeriesResponse> {
    return this.grpc.call<InventoryProto.CreateSeriesRequest, InventoryProto.SeriesResponse>(
      'inventory',
      'createSeries',
      { name: body.name, sizeFinishIds: body.sizeFinishIds ?? [] },
      ctx,
      req.requestId,
    );
  }

  @Patch('update/:id')
  @ApiOperation({
    summary: 'Update a series',
    description:
      'Optional sizeFinishIds adds new (series, size, finish) combinations; optional deletedSizeFinishIds soft-deletes mappings (cascades through Design).',
  })
  update(
    @Param('id') id: string,
    @Body() body: UpdateSeriesDto,
    @Req() req: GatewayRequest,
    @UserCtx() ctx: UserContext,
  ): Promise<InventoryProto.SeriesResponse> {
    return this.grpc.call<InventoryProto.UpdateSeriesRequest, InventoryProto.SeriesResponse>(
      'inventory',
      'updateSeries',
      {
        id,
        name: body.name,
        isActive: body.isActive,
        sizeFinishIds: body.sizeFinishIds ?? [],
        deletedSizeFinishIds: body.deletedSizeFinishIds ?? [],
      },
      ctx,
      req.requestId,
    );
  }

  @Delete('delete/:id')
  @ApiOperation({ summary: 'Soft-delete a series' })
  delete(
    @Param('id') id: string,
    @Req() req: GatewayRequest,
    @UserCtx() ctx: UserContext,
  ): Promise<InventoryProto.SuccessResponse> {
    return this.grpc.call<InventoryProto.DeleteSeriesRequest, InventoryProto.SuccessResponse>(
      'inventory',
      'deleteSeries',
      { id },
      ctx,
      req.requestId,
    );
  }

  @Post('restore/:id')
  @ApiOperation({ summary: 'Restore a soft-deleted series' })
  restore(
    @Param('id') id: string,
    @Req() req: GatewayRequest,
    @UserCtx() ctx: UserContext,
  ): Promise<InventoryProto.SeriesResponse> {
    return this.grpc.call<InventoryProto.RestoreSeriesRequest, InventoryProto.SeriesResponse>(
      'inventory',
      'restoreSeries',
      { id },
      ctx,
      req.requestId,
    );
  }
}
