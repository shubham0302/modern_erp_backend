import { CachedUser, GatewayRequest, UserContext, UserCtx } from '@modern_erp/common';
import { StaffProto } from '@modern_erp/grpc-types';
import { Body, Controller, Get, Post, Req } from '@nestjs/common';

import { ChangePasswordDto } from '../../dto/change-password.dto';
import { GrpcClientRegistry } from '../../grpc/grpc-client.registry';

@Controller('staff/me')
export class StaffMeController {
  constructor(private grpc: GrpcClientRegistry) {}

  @Get()
  me(@Req() req: GatewayRequest): CachedUser | undefined {
    return req.cachedUser;
  }

  @Post('change-password')
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
