import { join } from 'path';

import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

import { AdminModule } from './admin.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AdminModule, { bufferLogs: false });
  const config = app.get(ConfigService);

  const url = config.getOrThrow<string>('ADMIN_URL');

  app.connectMicroservice<MicroserviceOptions>(
    {
      transport: Transport.GRPC,
      options: {
        package: ['admin', 'health'],
        protoPath: [
          join(process.cwd(), 'proto/admin.proto'),
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
