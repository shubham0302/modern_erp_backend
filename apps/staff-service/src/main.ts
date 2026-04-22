import { join } from 'path';

import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

import { StaffServiceModule } from './staff-service.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(StaffServiceModule, { bufferLogs: false });
  const config = app.get(ConfigService);

  const url = config.getOrThrow<string>('STAFF_SERVICE_URL');

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: ['staff', 'health'],
      protoPath: [
        join(process.cwd(), 'proto/staff.proto'),
        join(process.cwd(), 'proto/health.proto'),
      ],
      url,
    },
  });

  await app.init();
  await app.startAllMicroservices();

  // eslint-disable-next-line no-console
  console.log(`staff-service started on ${url}`);
}

void bootstrap();
