import {
  GrpcErrorMeta,
  KafkaErrorContext,
  RequestErrorContext,
  ServiceErrorContext,
  SystemErrorContext,
} from '@modern_erp/common';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Sentry from '@sentry/node';

const SENSITIVE_KEYS = new Set([
  'password',
  'newPassword',
  'currentPassword',
  'refreshToken',
  'refresh_token',
  'token',
  'accessToken',
  'access_token',
  'tokenHash',
  'token_hash',
  'passwordHash',
  'password_hash',
]);

@Injectable()
export class ModernERPLogger implements OnModuleInit {
  private readonly serviceName: string;

  constructor(private config: ConfigService) {
    this.serviceName = this.config.getOrThrow<string>('SERVICE_NAME');
  }

  onModuleInit(): void {
    const dsn = this.config.getOrThrow<string>('GLITCHTIP_DSN');
    if (!dsn) return;
    Sentry.init({
      dsn,
      environment: this.config.getOrThrow<string>('NODE_ENV'),
      serverName: this.serviceName,
      tracesSampleRate: 1.0,
    });
  }

  captureRequestError(error: Error, ctx: RequestErrorContext, grpc?: GrpcErrorMeta): void {
    const errorType = grpc ? 'grpc_downstream' : 'api_request';

    Sentry.withScope((scope) => {
      scope.setTag('requestId', ctx.requestId);
      scope.setTag('errorType', errorType);
      scope.setTag('service', this.serviceName);
      if (ctx.platform) scope.setTag('platform', ctx.platform);
      if (ctx.appVersion) scope.setTag('appVersion', ctx.appVersion);
      if (ctx.deviceId) scope.setTag('deviceId', ctx.deviceId);
      if (ctx.userId) scope.setUser({ id: ctx.userId, ip_address: ctx.ip });
      scope.setContext('request', {
        requestId: ctx.requestId,
        method: ctx.method,
        path: ctx.path,
        query: ctx.query,
        body: this.sanitize(ctx.body),
        ip: ctx.ip,
        deviceId: ctx.deviceId,
      });
      if (grpc) scope.setContext('grpc', grpc as unknown as Record<string, unknown>);
      scope.setFingerprint([ctx.requestId]);
      Sentry.captureException(error);
    });
  }

  captureServiceError(error: Error, ctx: ServiceErrorContext): void {
    Sentry.withScope((scope) => {
      scope.setTag('errorType', 'service_method');
      scope.setTag('service', ctx.service);
      scope.setTag('method', ctx.method);
      if (ctx.requestId) {
        scope.setTag('requestId', ctx.requestId);
        scope.setFingerprint([ctx.requestId]);
      }
      if (ctx.userId) scope.setUser({ id: ctx.userId });
      scope.setContext('service', {
        service: ctx.service,
        method: ctx.method,
        requestId: ctx.requestId ?? 'none',
        input: this.sanitize(ctx.input),
      });
      Sentry.captureException(error);
    });
  }

  captureKafkaError(error: Error, ctx: KafkaErrorContext): void {
    Sentry.withScope((scope) => {
      scope.setTag('errorType', 'kafka_consumer');
      scope.setTag('service', this.serviceName);
      scope.setTag('topic', ctx.topic);
      if (ctx.requestId) {
        scope.setTag('requestId', ctx.requestId);
        scope.setFingerprint([ctx.requestId]);
      }
      if (ctx.userId) scope.setUser({ id: ctx.userId });
      scope.setContext('kafka', {
        topic: ctx.topic,
        partition: ctx.partition,
        messageKey: ctx.messageKey,
        requestId: ctx.requestId ?? 'none',
        payload: this.sanitize(ctx.payload),
      });
      Sentry.captureException(error);
    });
  }

  captureSystemError(error: Error, ctx: SystemErrorContext): void {
    Sentry.withScope((scope) => {
      scope.setTag('errorType', 'system');
      scope.setTag('service', this.serviceName);
      scope.setTag('component', ctx.component);
      scope.setContext('system', {
        service: this.serviceName,
        component: ctx.component,
        details: ctx.details,
      });
      Sentry.captureException(error);
    });
  }

  private sanitize(data: Record<string, unknown> | undefined): Record<string, unknown> | null {
    if (!data) return null;
    const copy = { ...data };
    for (const key of Object.keys(copy)) {
      if (SENSITIVE_KEYS.has(key)) copy[key] = '[REDACTED]';
    }
    return copy;
  }
}
