import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ValidationError } from 'class-validator';

import { AppModule } from './app.module';

interface ValidationDetail {
  field: string;
  message: string;
}

function flattenValidationErrors(
  errors: ValidationError[],
  parentPath = '',
): ValidationDetail[] {
  const out: ValidationDetail[] = [];
  for (const e of errors) {
    const path = parentPath
      ? /^\d+$/.test(e.property)
        ? `${parentPath}[${e.property}]`
        : `${parentPath}.${e.property}`
      : e.property;

    if (e.constraints) {
      for (const message of Object.values(e.constraints)) {
        out.push({ field: path, message });
      }
    }
    if (e.children && e.children.length > 0) {
      out.push(...flattenValidationErrors(e.children, path));
    }
  }
  return out;
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get(ConfigService);

  app.set('trust proxy', true);
  app.setGlobalPrefix('api/v1');

  const corsOrigins = (config.get<string>('CORS_ORIGINS') ?? 'http://localhost:5174')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) => {
        const details = flattenValidationErrors(errors);
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
