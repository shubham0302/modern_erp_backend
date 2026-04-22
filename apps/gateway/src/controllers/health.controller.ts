import { Public } from '@modern_erp/common';
import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Controller('health')
export class HealthController {
  constructor(private config: ConfigService) {}

  @Public()
  @Get()
  check(): Record<string, unknown> {
    return {
      status: 'healthy',
      service: this.config.getOrThrow<string>('SERVICE_NAME'),
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
