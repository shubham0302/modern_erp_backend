import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

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

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Modern ERP Gateway')
    .setDescription('HTTP API for the Modern ERP platform gateway service.')
    .setVersion('0.1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  const port = parseInt(config.getOrThrow<string>('GATEWAY_PORT'), 10);
  await app.listen(port);
}

void bootstrap();
