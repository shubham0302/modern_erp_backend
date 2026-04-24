import { GatewayRequest, Public, UserContext, UserCtx } from '@modern_erp/common';
import { AdminProto } from '@modern_erp/grpc-types';
import { Body, Controller, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { ChangePasswordDto } from '../../dto/change-password.dto';
import { LoginDto } from '../../dto/login.dto';
import { RefreshDto } from '../../dto/refresh.dto';
import { GrpcClientRegistry } from '../../grpc/grpc-client.registry';

function appVersion(req: GatewayRequest): string {
  const v = req.headers['x-app-version'];
  return typeof v === 'string' ? v : 'unknown';
}

@ApiTags('Admin · Auth')
@Controller('admin/auth')
export class AdminAuthController {
  constructor(private grpc: GrpcClientRegistry) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Admin login — returns access + refresh tokens' })
  login(@Body() body: LoginDto, @Req() req: GatewayRequest): Promise<AdminProto.AuthTokenResponse> {
    const payload: AdminProto.LoginRequest = {
      email: body.email,
      password: body.password,
      ip: req.ip ?? 'unknown',
      deviceId: body.deviceId ?? '',
      appVersion: appVersion(req),
    };
    return this.grpc.call<AdminProto.LoginRequest, AdminProto.AuthTokenResponse>(
      'admin',
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
  ): Promise<AdminProto.AuthTokenResponse> {
    const payload: AdminProto.RefreshRequest = {
      refreshToken: body.refreshToken,
      ip: req.ip ?? 'unknown',
      deviceId: body.deviceId ?? '',
      appVersion: appVersion(req),
    };
    return this.grpc.call<AdminProto.RefreshRequest, AdminProto.AuthTokenResponse>(
      'admin',
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
  ): Promise<AdminProto.SuccessResponse> {
    return this.grpc.call<AdminProto.LogoutRequest, AdminProto.SuccessResponse>(
      'admin',
      'logout',
      { refreshToken: body.refreshToken },
      ctx,
      req.requestId,
    );
  }

  @Post('change-password')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Change the current admin\'s password' })
  changePassword(
    @Body() body: ChangePasswordDto,
    @Req() req: GatewayRequest,
    @UserCtx() ctx: UserContext,
  ): Promise<AdminProto.SuccessResponse> {
    return this.grpc.call<AdminProto.ChangePasswordRequest, AdminProto.SuccessResponse>(
      'admin',
      'changePassword',
      {
        adminId: ctx.userId,
        currentPassword: body.currentPassword,
        newPassword: body.newPassword,
      },
      ctx,
      req.requestId,
    );
  }
}
