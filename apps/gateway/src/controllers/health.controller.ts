import { Public } from '@modern_erp/common';
import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private config: ConfigService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Liveness probe' })
  check(): Record<string, unknown> {
    return {
      status: 'healthy',
      service: this.config.getOrThrow<string>('SERVICE_NAME'),
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    };
  }
}
