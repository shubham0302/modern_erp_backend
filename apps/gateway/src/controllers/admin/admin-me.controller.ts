import { CachedUser, GatewayRequest } from '@modern_erp/common';
import { Controller, Get, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Admin · Profile')
@ApiBearerAuth('access-token')
@Controller('admin')
export class AdminMeController {
  @Get('profile')
  @ApiOperation({ summary: 'Get the currently authenticated admin profile' })
  profile(@Req() req: GatewayRequest): CachedUser | undefined {
    return req.cachedUser;
  }
}
