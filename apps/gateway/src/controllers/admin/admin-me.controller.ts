import { CachedUser, GatewayRequest } from '@modern_erp/common';
import { Controller, Get, Req } from '@nestjs/common';

@Controller('admin/me')
export class AdminMeController {
  @Get()
  me(@Req() req: GatewayRequest): CachedUser | undefined {
    return req.cachedUser;
  }
}
