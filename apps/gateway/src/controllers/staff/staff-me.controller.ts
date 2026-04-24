import { CachedUser, GatewayRequest, UserContext, UserCtx } from '@modern_erp/common';
import { StaffProto } from '@modern_erp/grpc-types';
import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { ChangePasswordDto } from '../../dto/change-password.dto';
import { GrpcClientRegistry } from '../../grpc/grpc-client.registry';

@ApiTags('Staff · Me')
@ApiBearerAuth('access-token')
@Controller('staff/me')
export class StaffMeController {
  constructor(private grpc: GrpcClientRegistry) {}

  @Get()
  @ApiOperation({ summary: 'Get the currently authenticated staff profile' })
  me(@Req() req: GatewayRequest): CachedUser | undefined {
    return req.cachedUser;
  }

  @Post('change-password')
  @ApiOperation({ summary: 'Change the current staff member\'s password' })
  changePassword(
    @Body() body: ChangePasswordDto,
    @Req() req: GatewayRequest,
    @UserCtx() ctx: UserContext,
  ): Promise<StaffProto.SuccessResponse> {
    return this.grpc.call<StaffProto.ChangePasswordRequest, StaffProto.SuccessResponse>(
      'staff',
      'changePassword',
      {
        staffId: ctx.userId,
        currentPassword: body.currentPassword,
        newPassword: body.newPassword,
      },
      ctx,
      req.requestId,
    );
  }
}
