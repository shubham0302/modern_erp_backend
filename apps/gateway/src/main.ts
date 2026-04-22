import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';

import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  app.set('trust proxy', true);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) => {
        const details = errors.map((e) => ({
          field: e.property,
          message: e.constraints ? Object.values(e.constraints)[0] : 'invalid',
        }));
        return new BadRequestException({
          errorCode: 'VALIDATION_FAILED',
          details,
        });
      },
    }),
  );

  const port = parseInt(config.getOrThrow<string>('GATEWAY_PORT'), 10);
  await app.listen(port);

  // eslint-disable-next-line no-console
  console.log(`gateway listening on :${port}`);
}

void bootstrap();
