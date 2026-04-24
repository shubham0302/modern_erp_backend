import { CachedUser, GatewayRequest } from '@modern_erp/common';
import { Controller, Get, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Admin · Me')
@ApiBearerAuth('access-token')
@Controller('admin/me')
export class AdminMeController {
  @Get()
  @ApiOperation({ summary: 'Get the currently authenticated admin profile' })
  me(@Req() req: GatewayRequest): CachedUser | undefined {
    return req.cachedUser;
  }
}
