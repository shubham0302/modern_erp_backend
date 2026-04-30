import { HealthProto } from '@modern_erp/grpc-types';
import { Controller } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GrpcMethod } from '@nestjs/microservices';

@Controller()
export class HealthGrpcController {
  constructor(private config: ConfigService) {}

  @GrpcMethod('HealthService', 'Check')
  check(): HealthProto.HealthCheckResponse {
    return {
      status: 'healthy',
      service: this.config.getOrThrow<string>('SERVICE_NAME'),
      version: '1.0.0',
      uptime: process.uptime(),
      checks: {},
      timestamp: new Date().toISOString(),
    };
  }
}
