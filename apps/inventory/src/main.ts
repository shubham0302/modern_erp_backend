import { join } from 'path';

import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

import { InventoryModule } from './inventory.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(InventoryModule, { bufferLogs: false });
  const config = app.get(ConfigService);

  const url = config.getOrThrow<string>('INVENTORY_URL');

  app.connectMicroservice<MicroserviceOptions>(
    {
      transport: Transport.GRPC,
      options: {
        package: ['inventory', 'health'],
        protoPath: [
          join(process.cwd(), 'proto/inventory.proto'),
          join(process.cwd(), 'proto/health.proto'),
        ],
        url,
      },
    },
    { inheritAppConfig: true },
  );

  await app.init();
  await app.startAllMicroservices();
}

void bootstrap();
