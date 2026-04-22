import { createParamDecorator, ExecutionContext } from '@nestjs/common';

import { GatewayRequest } from '../interfaces/gateway-request.interface';
import { UserContext } from '../interfaces/user-context.interface';

export const UserCtx = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): UserContext | undefined => {
    return ctx.switchToHttp().getRequest<GatewayRequest>().userContext;
  },
);
