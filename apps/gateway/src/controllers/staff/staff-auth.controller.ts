import { CachedStaff, GatewayRequest, Public, UserContext, UserCtx } from '@modern_erp/common';
import { StaffProto } from '@modern_erp/grpc-types';
import { Body, Controller, Post, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { LoginDto } from '../../dto/login.dto';
import { RefreshDto } from '../../dto/refresh.dto';
import { GrpcClientRegistry } from '../../grpc/grpc-client.registry';
import { buildModuleAccess } from '../../utils/build-module-access';

function appVersion(req: GatewayRequest): string {
  const v = req.headers['x-app-version'];
  return typeof v === 'string' ? v : 'unknown';
}

interface StaffAuthResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  staff: CachedStaff;
}

function toStaffAuthResponse(res: StaffProto.AuthTokenResponse): StaffAuthResponse {
  const wrap = res.staff!;
  const s = wrap.staff!;
  const r = wrap.role!;
  return {
    accessToken: res.accessToken,
    refreshToken: res.refreshToken,
    expiresIn: res.expiresIn,
    staff: {
      kind: 'staff',
      id: s.id,
      name: s.name,
      email: s.email,
      phone: s.phone,
      isActive: s.isActive,
      role: { id: r.id, name: r.name },
      moduleAccess: buildModuleAccess(wrap.permissions ?? []),
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    },
  };
}

@ApiTags('Staff · Auth')
@Controller('staff')
export class StaffAuthController {
  constructor(private grpc: GrpcClientRegistry) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Staff login — returns access + refresh tokens' })
  async login(@Body() body: LoginDto, @Req() req: GatewayRequest): Promise<StaffAuthResponse> {
    const payload: StaffProto.LoginRequest = {
      email: body.email,
      password: body.password,
      ip: req.ip ?? 'unknown',
      deviceId: body.deviceId ?? '',
      appVersion: appVersion(req),
    };
    const res = await this.grpc.call<StaffProto.LoginRequest, StaffProto.AuthTokenResponse>(
      'staff',
      'login',
      payload,
      null,
      req.requestId,
    );
    return toStaffAuthResponse(res);
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Rotate refresh token — returns new access + refresh tokens' })
  async refresh(@Body() body: RefreshDto, @Req() req: GatewayRequest): Promise<StaffAuthResponse> {
    const payload: StaffProto.RefreshRequest = {
      refreshToken: body.refreshToken,
      ip: req.ip ?? 'unknown',
      deviceId: body.deviceId ?? '',
      appVersion: appVersion(req),
    };
    const res = await this.grpc.call<StaffProto.RefreshRequest, StaffProto.AuthTokenResponse>(
      'staff',
      'refresh',
      payload,
      null,
      req.requestId,
    );
    return toStaffAuthResponse(res);
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
