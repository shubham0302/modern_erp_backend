import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

import { REDIS_CLIENT } from './redis.constants';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService): Redis => {
        const password = config.get<string>('REDIS_PASSWORD');
        return new Redis({
          host: config.getOrThrow<string>('REDIS_HOST'),
          port: parseInt(config.getOrThrow<string>('REDIS_PORT'), 10),
          password: password && password.length > 0 ? password : undefined,
          maxRetriesPerRequest: 3,
        });
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
