import { createHash, randomBytes } from 'crypto';
import { readFileSync } from 'fs';

import { ErrorCode, Platform } from '@modern_erp/common';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { IsNull, Repository } from 'typeorm';

import { AdminRefreshToken } from '../entities/admin-refresh-token.entity';
import { Admin } from '../entities/admin.entity';
import { AdminActionType } from '../enums/admin-action-type.enum';

import { AdminSecurityLogService } from './admin-security-log.service';

// Pre-computed dummy hash for timing-safe login on unknown email.
const TIMING_DUMMY_HASH = '$2b$12$ThisIsADummyHashXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX';

export interface LoginInput {
  email: string;
  password: string;
  ip: string;
  deviceId: string | null;
  appVersion: string;
}

export interface RefreshInput {
  refreshToken: string;
  ip: string;
  deviceId: string | null;
  appVersion: string;
}

export interface AuthResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  admin: Admin;
}

function rpcError(errorCode: ErrorCode): RpcException {
  return new RpcException({ errorCode });
}

@Injectable()
export class AdminAuthService {
  private readonly publicKey: string;
  private readonly privateKey: string;
  private readonly algorithm: jwt.Algorithm;
  private readonly accessTtlSec: number;
  private readonly refreshTtlSec: number;
  private readonly bcryptRounds: number;

  constructor(
    config: ConfigService,
    @InjectRepository(Admin) private adminRepo: Repository<Admin>,
    @InjectRepository(AdminRefreshToken)
    private tokenRepo: Repository<AdminRefreshToken>,
    private log: AdminSecurityLogService,
  ) {
    this.publicKey = readFileSync(config.getOrThrow<string>('JWT_PUBLIC_KEY_PATH'), 'utf8');
    this.privateKey = readFileSync(config.getOrThrow<string>('JWT_PRIVATE_KEY_PATH'), 'utf8');
    this.algorithm = config.getOrThrow<string>('JWT_ALGORITHM') as jwt.Algorithm;
    this.accessTtlSec = parseInt(config.getOrThrow<string>('JWT_ACCESS_TTL_SEC'), 10);
    this.refreshTtlSec = parseInt(config.getOrThrow<string>('JWT_REFRESH_TTL_SEC'), 10);
    this.bcryptRounds = parseInt(config.getOrThrow<string>('BCRYPT_ROUNDS'), 10);
  }

  async login(input: LoginInput): Promise<AuthResult> {
    const admin = await this.adminRepo.findOne({ where: { email: input.email } });

    if (!admin) {
      await bcrypt.compare(input.password, TIMING_DUMMY_HASH);
      throw rpcError(ErrorCode.EMAIL_NOT_FOUND);
    }

    if (!admin.isActive) {
      throw rpcError(ErrorCode.ACCOUNT_DEACTIVATED);
    }

    const ok = await bcrypt.compare(input.password, admin.passwordHash);
    if (!ok) {
      await this.log.write({
        adminId: admin.id,
        adminName: admin.name,
        actionType: AdminActionType.LOGIN_FAILED,
        description: 'wrong password',
        ip: input.ip,
      });
      throw rpcError(ErrorCode.WRONG_PASSWORD);
    }

    const tokens = await this.issueTokens(admin, input.ip, input.deviceId, input.appVersion);

    await this.log.write({
      adminId: admin.id,
      adminName: admin.name,
      actionType: AdminActionType.LOGIN_SUCCESS,
      description: 'login successful',
      ip: input.ip,
    });

    return { ...tokens, admin };
  }

  async refresh(input: RefreshInput): Promise<AuthResult> {
    try {
      jwt.verify(input.refreshToken, this.publicKey, { algorithms: [this.algorithm] });
    } catch {
      throw rpcError(ErrorCode.INVALID_TOKEN);
    }

    const tokenHash = createHash('sha256').update(input.refreshToken).digest('hex');
    const row = await this.tokenRepo.findOne({ where: { tokenHash } });

    if (!row) throw rpcError(ErrorCode.INVALID_TOKEN);

    if (row.revokedAt) {
      await this.tokenRepo.update(
        { adminId: row.adminId, revokedAt: IsNull() },
        { revokedAt: new Date() },
      );
      await this.log.write({
        adminId: row.adminId,
        adminName: null,
        actionType: AdminActionType.REFRESH_REUSE_DETECTED,
        description: 'refresh token reuse — mass revoke',
        ip: input.ip,
      });
      throw rpcError(ErrorCode.REFRESH_TOKEN_REUSE_DETECTED);
    }

    if (row.expiresAt.getTime() < Date.now()) {
      throw rpcError(ErrorCode.INVALID_TOKEN);
    }

    const admin = await this.adminRepo.findOne({ where: { id: row.adminId } });
    if (!admin) throw rpcError(ErrorCode.ADMIN_NOT_FOUND);
    if (!admin.isActive) throw rpcError(ErrorCode.ACCOUNT_DEACTIVATED);

    await this.tokenRepo.update({ id: row.id }, { revokedAt: new Date() });

    const tokens = await this.issueTokens(admin, input.ip, input.deviceId, input.appVersion);
    return { ...tokens, admin };
  }

  async logout(input: { refreshToken: string }): Promise<{ success: boolean }> {
    const tokenHash = createHash('sha256').update(input.refreshToken).digest('hex');
    const row = await this.tokenRepo.findOne({ where: { tokenHash } });
    if (row && !row.revokedAt) {
      await this.tokenRepo.update({ id: row.id }, { revokedAt: new Date() });
      await this.log.write({
        adminId: row.adminId,
        adminName: null,
        actionType: AdminActionType.LOGOUT,
        description: 'logout',
        ip: null,
      });
    }
    return { success: true };
  }

  async changePassword(input: {
    adminId: string;
    currentPassword: string;
    newPassword: string;
  }): Promise<{ success: boolean }> {
    const admin = await this.adminRepo.findOne({ where: { id: input.adminId } });
    if (!admin) throw rpcError(ErrorCode.ADMIN_NOT_FOUND);

    const ok = await bcrypt.compare(input.currentPassword, admin.passwordHash);
    if (!ok) throw rpcError(ErrorCode.WRONG_PASSWORD);

    const newHash = await bcrypt.hash(input.newPassword, this.bcryptRounds);
    await this.adminRepo.update({ id: admin.id }, { passwordHash: newHash });

    await this.tokenRepo.update(
      { adminId: admin.id, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );

    await this.log.write({
      adminId: admin.id,
      adminName: admin.name,
      actionType: AdminActionType.PASSWORD_CHANGED,
      description: 'password changed',
      ip: null,
    });

    return { success: true };
  }

  private async issueTokens(
    admin: Admin,
    ip: string,
    deviceId: string | null,
    appVersion: string,
  ): Promise<Omit<AuthResult, 'admin'>> {
    const now = Math.floor(Date.now() / 1000);
    const accessPayload = {
      sub: admin.id,
      platform: Platform.ADMIN,
      version: appVersion,
      iat: now,
      exp: now + this.accessTtlSec,
    };

    const accessToken = jwt.sign(accessPayload, this.privateKey, { algorithm: this.algorithm });

    const refreshRaw = randomBytes(48).toString('hex');
    const refreshJwt = jwt.sign(
      {
        sub: admin.id,
        platform: Platform.ADMIN,
        jti: refreshRaw,
        iat: now,
        exp: now + this.refreshTtlSec,
      },
      this.privateKey,
      { algorithm: this.algorithm },
    );

    const tokenHash = createHash('sha256').update(refreshJwt).digest('hex');
    await this.tokenRepo.save(
      this.tokenRepo.create({
        adminId: admin.id,
        tokenHash,
        deviceId,
        ip,
        expiresAt: new Date((now + this.refreshTtlSec) * 1000),
      }),
    );

    return {
      accessToken,
      refreshToken: refreshJwt,
      expiresIn: this.accessTtlSec,
    };
  }
}
