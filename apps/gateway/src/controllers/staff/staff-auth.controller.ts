import { GatewayRequest, Public, UserContext, UserCtx } from '@modern_erp/common';
import { StaffProto } from '@modern_erp/grpc-types';
import { Body, Controller, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { LoginDto } from '../../dto/login.dto';
import { RefreshDto } from '../../dto/refresh.dto';
import { GrpcClientRegistry } from '../../grpc/grpc-client.registry';

function appVersion(req: GatewayRequest): string {
  const v = req.headers['x-app-version'];
  return typeof v === 'string' ? v : 'unknown';
}

@ApiTags('Staff · Auth')
@Controller('staff/auth')
export class StaffAuthController {
  constructor(private grpc: GrpcClientRegistry) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Staff login — returns access + refresh tokens' })
  login(@Body() body: LoginDto, @Req() req: GatewayRequest): Promise<StaffProto.AuthTokenResponse> {
    const payload: StaffProto.LoginRequest = {
      email: body.email,
      password: body.password,
      ip: req.ip ?? 'unknown',
      deviceId: body.deviceId ?? '',
      appVersion: appVersion(req),
    };
    return this.grpc.call<StaffProto.LoginRequest, StaffProto.AuthTokenResponse>(
      'staff',
      'login',
      payload,
      null,
      req.requestId,
    );
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Rotate refresh token — returns new access + refresh tokens' })
  refresh(
    @Body() body: RefreshDto,
    @Req() req: GatewayRequest,
  ): Promise<StaffProto.AuthTokenResponse> {
    const payload: StaffProto.RefreshRequest = {
      refreshToken: body.refreshToken,
      ip: req.ip ?? 'unknown',
      deviceId: body.deviceId ?? '',
      appVersion: appVersion(req),
    };
    return this.grpc.call<StaffProto.RefreshRequest, StaffProto.AuthTokenResponse>(
      'staff',
      'refresh',
      payload,
      null,
      req.requestId,
    );
  }

  @Post('logout')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Revoke refresh token for current session' })
  logout(
    @Body() body: RefreshDto,
    @Req() req: GatewayRequest,
    @UserCtx() ctx: UserContext,
  ): Promise<StaffProto.SuccessResponse> {
    return this.grpc.call<StaffProto.LogoutRequest, StaffProto.SuccessResponse>(
      'staff',
      'logout',
      { refreshToken: body.refreshToken },
      ctx,
      req.requestId,
    );
  }
}
