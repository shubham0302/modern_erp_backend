import {
  CachedAdmin,
  CachedStaff,
  CachedUser,
  ErrorCode,
  GatewayRequest,
  IS_PUBLIC_KEY,
  Platform,
} from '@modern_erp/common';
import { AdminProto, StaffProto } from '@modern_erp/grpc-types';
import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import Redis from 'ioredis';

import { GrpcClientRegistry } from '../grpc/grpc-client.registry';
import { REDIS_CLIENT } from '../redis/redis.constants';
import { buildModuleAccess } from '../utils/build-module-access';

@Injectable()
export class UserContextGuard implements CanActivate {
  private readonly cacheTtl: number;

  constructor(
    private reflector: Reflector,
    @Inject(REDIS_CLIENT) private redis: Redis,
    config: ConfigService,
    private grpc: GrpcClientRegistry,
  ) {
    this.cacheTtl = parseInt(config.getOrThrow<string>('USER_CACHE_TTL_SEC'), 10);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<GatewayRequest>();
    const userId = req.jwtPayload?.sub;
    const platform = req.jwtPayload?.platform;
    if (!userId || !platform) {
      throw new UnauthorizedException({ errorCode: ErrorCode.INVALID_TOKEN });
    }

    const user = await this.getOrFetch(platform, userId, req.requestId);
    if (!user.isActive) {
      throw new UnauthorizedException({ errorCode: ErrorCode.ACCOUNT_DEACTIVATED });
    }

    req.cachedUser = user;
    req.userContext = {
      userId: user.id,
      platform,
      isSuperAdmin: user.kind === 'admin' ? user.isSuperAdmin : undefined,
      moduleAccess: user.kind === 'staff' ? user.moduleAccess : undefined,
      ip: req.ip ?? 'unknown',
      deviceId:
        typeof req.headers['x-device-id'] === 'string' ? req.headers['x-device-id'] : undefined,
      appVersion: req.jwtPayload?.version ?? 'unknown',
    };
    return true;
  }

  private async getOrFetch(
    platform: Platform,
    userId: string,
    requestId: string,
  ): Promise<CachedUser> {
    const key = `user:${platform}:${userId}`;
    const cached = await this.redis.get(key);
    if (cached) {
      return JSON.parse(cached) as CachedUser;
    }

    let fresh: CachedUser;
    if (platform === Platform.ADMIN) {
      const res = await this.grpc.call<{ id: string }, AdminProto.GetAdminResponse>(
        'admin',
        'getAdmin',
        { id: userId },
        null,
        requestId,
      );
      if (!res.admin) {
        throw new UnauthorizedException({ errorCode: ErrorCode.USER_NOT_FOUND });
      }
      const a: CachedAdmin = {
        kind: 'admin',
        id: res.admin.id,
        name: res.admin.name,
        email: res.admin.email,
        phone: res.admin.phone,
        isSuperAdmin: res.admin.isSuperAdmin,
        isActive: res.admin.isActive,
        createdAt: res.admin.createdAt,
        updatedAt: res.admin.updatedAt,
      };
      fresh = a;
    } else {
      const res = await this.grpc.call<{ id: string }, StaffProto.GetStaffResponse>(
        'staff',
        'getStaff',
        { id: userId },
        null,
        requestId,
      );
      if (!res.staff || !res.role) {
        throw new UnauthorizedException({ errorCode: ErrorCode.USER_NOT_FOUND });
      }
      const s: CachedStaff = {
        kind: 'staff',
        id: res.staff.id,
        name: res.staff.name,
        email: res.staff.email,
        phone: res.staff.phone,
        isActive: res.staff.isActive,
        role: { id: res.role.id, name: res.role.name },
        moduleAccess: buildModuleAccess(res.permissions ?? []),
        createdAt: res.staff.createdAt,
        updatedAt: res.staff.updatedAt,
      };
      fresh = s;
    }

    await this.redis.set(key, JSON.stringify(fresh), 'EX', this.cacheTtl);
    return fresh;
  }

}
