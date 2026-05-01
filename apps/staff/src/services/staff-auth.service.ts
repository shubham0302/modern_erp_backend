import { createHash, randomBytes } from 'crypto';
import { readFileSync } from 'fs';

import { ErrorCode, Platform } from '@modern_erp/common';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RpcException } from '@nestjs/microservices';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { IsNull, Repository } from 'typeorm';

import { RolePermission } from '../entities/role-permission.entity';
import { Role } from '../entities/role.entity';
import { StaffRefreshToken } from '../entities/staff-refresh-token.entity';
import { Staff } from '../entities/staff.entity';
import { StaffActionType } from '../enums/staff-action-type.enum';

import { StaffSecurityLogService } from './staff-security-log.service';

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

export interface StaffAuthResult {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  staff: Staff;
  role: Role;
  permissions: RolePermission[];
}

function rpcError(errorCode: ErrorCode): RpcException {
  return new RpcException({ errorCode });
}

@Injectable()
export class StaffAuthService {
  private readonly logger = new Logger(StaffAuthService.name);
  private readonly publicKey: string;
  private readonly privateKey: string;
  private readonly algorithm: jwt.Algorithm;
  private readonly accessTtlSec: number;
  private readonly refreshTtlSec: number;
  private readonly bcryptRounds: number;

  constructor(
    config: ConfigService,
    @InjectRepository(Staff) private staffRepo: Repository<Staff>,
    @InjectRepository(Role) private roleRepo: Repository<Role>,
    @InjectRepository(RolePermission) private permRepo: Repository<RolePermission>,
    @InjectRepository(StaffRefreshToken)
    private tokenRepo: Repository<StaffRefreshToken>,
    private log: StaffSecurityLogService,
  ) {
    this.publicKey = readFileSync(config.getOrThrow<string>('JWT_PUBLIC_KEY_PATH'), 'utf8');
    this.privateKey = readFileSync(config.getOrThrow<string>('JWT_PRIVATE_KEY_PATH'), 'utf8');
    this.algorithm = config.getOrThrow<string>('JWT_ALGORITHM') as jwt.Algorithm;
    this.accessTtlSec = parseInt(config.getOrThrow<string>('JWT_ACCESS_TTL_SEC'), 10);
    this.refreshTtlSec = parseInt(config.getOrThrow<string>('JWT_REFRESH_TTL_SEC'), 10);
    this.bcryptRounds = parseInt(config.getOrThrow<string>('BCRYPT_ROUNDS'), 10);
  }

  async login(input: LoginInput): Promise<StaffAuthResult> {
    const staff = await this.staffRepo.findOne({ where: { email: input.email } });

    if (!staff) {
      await bcrypt.compare(input.password, TIMING_DUMMY_HASH);
      throw rpcError(ErrorCode.EMAIL_NOT_FOUND);
    }

    if (!staff.isActive) {
      throw rpcError(ErrorCode.ACCOUNT_DEACTIVATED);
    }

    const ok = await bcrypt.compare(input.password, staff.passwordHash);
    if (!ok) {
      await this.log.write({
        staffId: staff.id,
        staffName: staff.name,
        actionType: StaffActionType.LOGIN_FAILED,
        description: 'wrong password',
        ip: input.ip,
      });
      throw rpcError(ErrorCode.WRONG_PASSWORD);
    }

    const [tokens, role, permissions] = await Promise.all([
      this.issueTokens(staff, input.ip, input.deviceId, input.appVersion),
      this.roleRepo.findOne({ where: { id: staff.roleId } }),
      this.permRepo.find({ where: { roleId: staff.roleId } }),
    ]);
    if (!role) throw rpcError(ErrorCode.ROLE_NOT_FOUND);

    this.fireAndForgetLog({
      staffId: staff.id,
      staffName: staff.name,
      actionType: StaffActionType.LOGIN_SUCCESS,
      description: 'login successful',
      ip: input.ip,
    });

    return { ...tokens, staff, role, permissions };
  }

  async refresh(input: RefreshInput): Promise<StaffAuthResult> {
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
        { staffId: row.staffId, revokedAt: IsNull() },
        { revokedAt: new Date() },
      );
      await this.log.write({
        staffId: row.staffId,
        staffName: null,
        actionType: StaffActionType.REFRESH_REUSE_DETECTED,
        description: 'refresh token reuse — mass revoke',
        ip: input.ip,
      });
      throw rpcError(ErrorCode.REFRESH_TOKEN_REUSE_DETECTED);
    }

    if (row.expiresAt.getTime() < Date.now()) {
      throw rpcError(ErrorCode.INVALID_TOKEN);
    }

    const staff = await this.staffRepo.findOne({ where: { id: row.staffId } });
    if (!staff) throw rpcError(ErrorCode.STAFF_NOT_FOUND);
    if (!staff.isActive) throw rpcError(ErrorCode.ACCOUNT_DEACTIVATED);

    await this.tokenRepo.update({ id: row.id }, { revokedAt: new Date() });

    const [tokens, role, permissions] = await Promise.all([
      this.issueTokens(staff, input.ip, input.deviceId, input.appVersion),
      this.roleRepo.findOneOrFail({ where: { id: staff.roleId } }),
      this.permRepo.find({ where: { roleId: staff.roleId } }),
    ]);

    return { ...tokens, staff, role, permissions };
  }

  async logout(input: { refreshToken: string }): Promise<{ success: boolean }> {
    const tokenHash = createHash('sha256').update(input.refreshToken).digest('hex');
    const row = await this.tokenRepo.findOne({ where: { tokenHash } });
    if (row && !row.revokedAt) {
      await this.tokenRepo.update({ id: row.id }, { revokedAt: new Date() });
      this.fireAndForgetLog({
        staffId: row.staffId,
        staffName: null,
        actionType: StaffActionType.LOGOUT,
        description: 'logout',
        ip: null,
      });
    }
    return { success: true };
  }

  async changePassword(input: {
    staffId: string;
    currentPassword: string;
    newPassword: string;
  }): Promise<{ success: boolean }> {
    const staff = await this.staffRepo.findOne({ where: { id: input.staffId } });
    if (!staff) throw rpcError(ErrorCode.STAFF_NOT_FOUND);

    const ok = await bcrypt.compare(input.currentPassword, staff.passwordHash);
    if (!ok) throw rpcError(ErrorCode.WRONG_PASSWORD);

    const newHash = await bcrypt.hash(input.newPassword, this.bcryptRounds);
    await this.staffRepo.update({ id: staff.id }, { passwordHash: newHash });

    await this.tokenRepo.update(
      { staffId: staff.id, revokedAt: IsNull() },
      { revokedAt: new Date() },
    );

    this.fireAndForgetLog({
      staffId: staff.id,
      staffName: staff.name,
      actionType: StaffActionType.PASSWORD_CHANGED,
      description: 'password changed',
      ip: null,
    });

    return { success: true };
  }

  private fireAndForgetLog(input: Parameters<StaffSecurityLogService['write']>[0]): void {
    this.log.write(input).catch((err: unknown) => {
      this.logger.error(`security log write failed: ${err instanceof Error ? err.message : String(err)}`);
    });
  }

  private async issueTokens(
    staff: Staff,
    ip: string,
    deviceId: string | null,
    appVersion: string,
  ): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    const now = Math.floor(Date.now() / 1000);
    const accessPayload = {
      sub: staff.id,
      platform: Platform.STAFF,
      version: appVersion,
      iat: now,
      exp: now + this.accessTtlSec,
    };

    const accessToken = jwt.sign(accessPayload, this.privateKey, { algorithm: this.algorithm });

    const refreshRaw = randomBytes(48).toString('hex');
    const refreshJwt = jwt.sign(
      {
        sub: staff.id,
        platform: Platform.STAFF,
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
        staffId: staff.id,
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
