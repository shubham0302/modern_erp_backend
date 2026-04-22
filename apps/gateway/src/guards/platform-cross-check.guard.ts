import { ErrorCode, GatewayRequest, IS_PUBLIC_KEY } from '@modern_erp/common';
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class PlatformCrossCheckGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<GatewayRequest>();
    if (req.jwtPayload?.platform !== req.targetPlatform) {
      throw new ForbiddenException({ errorCode: ErrorCode.PLATFORM_MISMATCH });
    }
    return true;
  }
}
