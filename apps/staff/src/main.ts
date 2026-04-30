import { join } from 'path';

import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

import { StaffModule } from './staff.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(StaffModule, { bufferLogs: false });
  const config = app.get(ConfigService);

  const url = config.getOrThrow<string>('STAFF_URL');

  app.connectMicroservice<MicroserviceOptions>(
    {
      transport: Transport.GRPC,
      options: {
        package: ['staff', 'health'],
        protoPath: [
          join(process.cwd(), 'proto/staff.proto'),
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
