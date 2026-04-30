import * as grpc from '@grpc/grpc-js';
import { GatewayRequest, Public, UserContext, UserCtx } from '@modern_erp/common';
import { AdminProto } from '@modern_erp/grpc-types';
import { Body, Controller, Logger, Post, Req } from '@nestjs/common';
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
@Controller('admin')
export class AdminAuthController {
  private readonly perfLogger = new Logger('LoginPerf');

  constructor(private grpc: GrpcClientRegistry) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Admin login — returns access + refresh tokens' })
  async login(
    @Body() body: LoginDto,
    @Req() req: GatewayRequest,
  ): Promise<AdminProto.AuthTokenResponse> {
    const p1 = Date.now();
    const payload: AdminProto.LoginRequest = {
      email: body.email,
      password: body.password,
      ip: req.ip ?? 'unknown',
      deviceId: body.deviceId ?? '',
      appVersion: appVersion(req),
    };
    let p2: number | undefined;
    let p3: number | undefined;
    try {
      return await this.grpc.call<AdminProto.LoginRequest, AdminProto.AuthTokenResponse>(
        'admin',
        'login',
        payload,
        null,
        req.requestId,
        undefined,
        (md: grpc.Metadata) => {
          const start = md.get('x-perf-db-start')[0];
          const end = md.get('x-perf-db-end')[0];
          if (typeof start === 'string') p2 = Number(start);
          if (typeof end === 'string') p3 = Number(end);
        },
      );
    } finally {
      const p4 = Date.now();
      if (p2 !== undefined && p3 !== undefined) {
        const t1 = p2 - p1;
        const t2 = p3 - p2;
        const t3 = p4 - p3;
        this.perfLogger.log(
          `reqId=${req.requestId} gateway→db=${t1}ms db=${t2}ms db→response=${t3}ms total=${t1 + t2 + t3}ms`,
        );
      } else {
        this.perfLogger.log(
          `reqId=${req.requestId} total=${p4 - p1}ms (partial: no db timestamps)`,
        );
      }
    }
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
  @ApiOperation({ summary: "Change the current admin's password" })
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
