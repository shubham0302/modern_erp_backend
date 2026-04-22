import { Request } from 'express';

import { Platform } from '../enums/platform.enum';

import { JwtPayload } from './platform.interface';
import { CachedUser, UserContext } from './user-context.interface';

/**
 * Extended Express request — typed fields set by guards.
 *
 * requestId        → set by RequestIdInterceptor
 * targetPlatform   → set by PlatformResolverGuard (step 1) from URL prefix
 * jwtPayload       → set by JwtAuthGuard (step 3)
 * cachedUser       → set by UserContextGuard (step 5)
 * userContext      → set by UserContextGuard (step 5)
 */
export interface GatewayRequest extends Request {
  requestId: string;
  targetPlatform?: Platform;
  jwtPayload?: JwtPayload;
  cachedUser?: CachedUser;
  userContext?: UserContext;
}
