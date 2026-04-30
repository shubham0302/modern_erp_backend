import type { ConfigService } from '@nestjs/config';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import type { EntitySchema, MixedList } from 'typeorm';

type EntityList = MixedList<Function | string | EntitySchema>;

export function buildPostgresOptions(
  config: ConfigService,
  entities: EntityList,
): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    host: config.getOrThrow<string>('DB_HOST'),
    port: parseInt(config.getOrThrow<string>('DB_PORT'), 10),
    username: config.getOrThrow<string>('DB_USER'),
    password: config.getOrThrow<string>('DB_PASSWORD'),
    database: config.getOrThrow<string>('DB_NAME'),
    entities,
    synchronize: false,
    logging: config.get<string>('NODE_ENV') === 'development',
    extra: {
      max: 10,
      min: 2,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
      keepAlive: true,
      keepAliveInitialDelayMillis: 10_000,
    },
  };
}
