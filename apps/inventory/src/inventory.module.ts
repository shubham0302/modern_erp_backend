import { buildPostgresOptions, GrpcExceptionFilter } from '@modern_erp/common';
import { ModernERPLoggerModule } from '@modern_erp/logger';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DesignGrpcController } from './controllers/design.grpc-controller';
import { FinishGrpcController } from './controllers/finish.grpc-controller';
import { HealthGrpcController } from './controllers/health.grpc-controller';
import { SeriesGrpcController } from './controllers/series.grpc-controller';
import { SeriesSizeFinishGrpcController } from './controllers/series-size-finish.grpc-controller';
import { SizeGrpcController } from './controllers/size.grpc-controller';
import { SizeFinishGrpcController } from './controllers/size-finish.grpc-controller';
import { Design } from './entities/design.entity';
import { Finish } from './entities/finish.entity';
import { Series } from './entities/series.entity';
import { SeriesSizeFinish } from './entities/series-size-finish.entity';
import { Size } from './entities/size.entity';
import { SizeFinish } from './entities/size-finish.entity';
import { DesignService } from './services/design.service';
import { FinishService } from './services/finish.service';
import { SeriesService } from './services/series.service';
import { SeriesSizeFinishService } from './services/series-size-finish.service';
import { SizeService } from './services/size.service';
import { SizeFinishService } from './services/size-finish.service';

const ENTITIES = [Size, Finish, SizeFinish, Series, SeriesSizeFinish, Design];

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ModernERPLoggerModule,
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => buildPostgresOptions(config, ENTITIES),
    }),
    TypeOrmModule.forFeature(ENTITIES),
  ],
  providers: [
    { provide: APP_FILTER, useClass: GrpcExceptionFilter },
    SizeService,
    FinishService,
    SizeFinishService,
    SeriesService,
    SeriesSizeFinishService,
    DesignService,
  ],
  controllers: [
    HealthGrpcController,
    SizeGrpcController,
    FinishGrpcController,
    SizeFinishGrpcController,
    SeriesGrpcController,
    SeriesSizeFinishGrpcController,
    DesignGrpcController,
  ],
})
export class InventoryModule {}
