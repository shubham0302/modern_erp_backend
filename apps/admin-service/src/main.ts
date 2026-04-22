import { join } from 'path';

import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';

import { AdminServiceModule } from './admin-service.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AdminServiceModule, { bufferLogs: false });
  const config = app.get(ConfigService);

  const url = config.getOrThrow<string>('ADMIN_SERVICE_URL');

  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.GRPC,
    options: {
      package: ['admin', 'health'],
      protoPath: [
        join(process.cwd(), 'proto/admin.proto'),
        join(process.cwd(), 'proto/health.proto'),
      ],
      url,
    },
  });

  await app.init();
  await app.startAllMicroservices();

  // eslint-disable-next-line no-console
  console.log(`admin-service started on ${url}`);
}

void bootstrap();
