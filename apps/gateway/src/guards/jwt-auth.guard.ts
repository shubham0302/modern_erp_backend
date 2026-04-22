import { readFileSync } from 'fs';

import { ErrorCode, GatewayRequest, IS_PUBLIC_KEY, JwtPayload } from '@modern_erp/common';
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  private readonly publicKey: string;
  private readonly algorithm: jwt.Algorithm;

  constructor(
    private reflector: Reflector,
    config: ConfigService,
  ) {
    this.publicKey = readFileSync(config.getOrThrow<string>('JWT_PUBLIC_KEY_PATH'), 'utf8');
    this.algorithm = config.getOrThrow<string>('JWT_ALGORITHM') as jwt.Algorithm;
  }

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<GatewayRequest>();
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException({ errorCode: ErrorCode.MISSING_TOKEN });
    }

    const token = authHeader.substring(7);
    try {
      req.jwtPayload = jwt.verify(token, this.publicKey, {
        algorithms: [this.algorithm],
      }) as JwtPayload;
      return true;
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedException({ errorCode: ErrorCode.TOKEN_EXPIRED });
      }
      throw new UnauthorizedException({ errorCode: ErrorCode.INVALID_TOKEN });
    }
  }
}
