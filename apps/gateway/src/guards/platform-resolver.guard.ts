import { ErrorCode, GatewayRequest, Platform } from '@modern_erp/common';
import { CanActivate, ExecutionContext, Injectable, NotFoundException } from '@nestjs/common';

@Injectable()
export class PlatformResolverGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<GatewayRequest>();
    const url = req.url ?? '';

    if (url === '/health' || url.startsWith('/health?')) return true;
    if (url.startsWith('/admin/') || url === '/admin') {
      req.targetPlatform = Platform.ADMIN;
      return true;
    }
    if (url.startsWith('/staff/') || url === '/staff') {
      req.targetPlatform = Platform.STAFF;
      return true;
    }
    throw new NotFoundException({ errorCode: ErrorCode.ROUTE_NOT_FOUND });
  }
}
