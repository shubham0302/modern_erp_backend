import { ErrorCode, GatewayRequest, Platform } from '@modern_erp/common';
import { CanActivate, ExecutionContext, HttpException, Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

import { REDIS_CLIENT } from '../redis/redis.constants';

@Injectable()
export class RateLimiterGuard implements CanActivate {
  private readonly limits: Record<Platform, number>;
  private readonly windowSec: number;

  constructor(
    @Inject(REDIS_CLIENT) private redis: Redis,
    config: ConfigService,
  ) {
    this.limits = {
      [Platform.ADMIN]: parseInt(config.getOrThrow<string>('RATE_LIMIT_ADMIN'), 10),
      [Platform.STAFF]: parseInt(config.getOrThrow<string>('RATE_LIMIT_STAFF'), 10),
    };
    this.windowSec = parseInt(config.getOrThrow<string>('RATE_LIMIT_WINDOW_SEC'), 10);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<GatewayRequest>();
    const target = req.targetPlatform;
    if (!target) return true;

    const ip = req.ip ?? 'unknown';
    const key = `rl:${target}:${ip}`;
    const limit = this.limits[target];
    const current = await this.redis.incr(key);
    if (current === 1) await this.redis.expire(key, this.windowSec);
    if (current > limit) {
      const ttl = await this.redis.ttl(key);
      throw new HttpException(
        { errorCode: ErrorCode.RATE_LIMITED, details: { retryAfter: ttl } },
        429,
      );
    }
    return true;
  }
}
