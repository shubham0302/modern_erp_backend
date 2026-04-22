import { generateKeyPairSync, createHash } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

import { ErrorCode } from '@modern_erp/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { IsNull, Repository } from 'typeorm';

import { AdminRefreshToken } from '../entities/admin-refresh-token.entity';
import { Admin } from '../entities/admin.entity';
import { AdminActionType } from '../enums/admin-action-type.enum';

import { AdminAuthService } from './admin-auth.service';
import { AdminSecurityLogService } from './admin-security-log.service';

const KEYS_DIR = './test-keys';
const PUBLIC_KEY_PATH = join(KEYS_DIR, 'public.pem');
const PRIVATE_KEY_PATH = join(KEYS_DIR, 'private.pem');

function ensureKeys(): void {
  if (existsSync(PUBLIC_KEY_PATH) && existsSync(PRIVATE_KEY_PATH)) return;
  mkdirSync(KEYS_DIR, { recursive: true });
  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
  writeFileSync(PUBLIC_KEY_PATH, publicKey);
  writeFileSync(PRIVATE_KEY_PATH, privateKey);
}

const CONFIG = {
  getOrThrow: (k: string): string => {
    const map: Record<string, string> = {
      JWT_PUBLIC_KEY_PATH: PUBLIC_KEY_PATH,
      JWT_PRIVATE_KEY_PATH: PRIVATE_KEY_PATH,
      JWT_ALGORITHM: 'RS256',
      JWT_ACCESS_TTL_SEC: '900',
      JWT_REFRESH_TTL_SEC: '2592000',
      BCRYPT_ROUNDS: '4',
    };
    return map[k] ?? '';
  },
} as unknown as ConfigService;

interface Mocks {
  service: AdminAuthService;
  adminRepo: jest.Mocked<Repository<Admin>>;
  tokenRepo: jest.Mocked<Repository<AdminRefreshToken>>;
  log: jest.Mocked<AdminSecurityLogService>;
}

async function setup(): Promise<Mocks> {
  const adminRepo = {
    findOne: jest.fn(),
    update: jest.fn(),
  } as unknown as jest.Mocked<Repository<Admin>>;
  const tokenRepo = {
    create: jest.fn().mockImplementation((x: Partial<AdminRefreshToken>) => x as AdminRefreshToken),
    save: jest.fn().mockImplementation((x: AdminRefreshToken) => Promise.resolve(x)),
    findOne: jest.fn(),
    update: jest.fn(),
  } as unknown as jest.Mocked<Repository<AdminRefreshToken>>;
  const log = { write: jest.fn() } as unknown as jest.Mocked<AdminSecurityLogService>;

  const moduleRef = await Test.createTestingModule({
    providers: [
      AdminAuthService,
      { provide: ConfigService, useValue: CONFIG },
      { provide: getRepositoryToken(Admin), useValue: adminRepo },
      { provide: getRepositoryToken(AdminRefreshToken), useValue: tokenRepo },
      { provide: AdminSecurityLogService, useValue: log },
    ],
  }).compile();

  const service = moduleRef.get(AdminAuthService);
  return { service, adminRepo, tokenRepo, log };
}

function makeAdmin(overrides: Partial<Admin> = {}): Admin {
  return {
    id: 'a1',
    name: 'A',
    email: 'a@x.com',
    phone: '+910000000000',
    passwordHash: '',
    isSuperAdmin: false,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  } as Admin;
}

beforeAll(() => {
  ensureKeys();
});

describe('AdminAuthService.login', () => {
  it('returns tokens when credentials are valid', async () => {
    const { service, adminRepo, tokenRepo, log } = await setup();
    const passwordHash = await bcrypt.hash('correct-horse', 4);
    adminRepo.findOne.mockResolvedValue(makeAdmin({ passwordHash }));

    const res = await service.login({
      email: 'a@x.com',
      password: 'correct-horse',
      ip: '1.1.1.1',
      deviceId: 'd1',
      appVersion: '1.0.0',
    });

    expect(res.accessToken).toEqual(expect.any(String));
    expect(res.refreshToken).toEqual(expect.any(String));
    expect(res.admin.id).toBe('a1');
    expect(tokenRepo.save).toHaveBeenCalled();
    expect(log.write).toHaveBeenCalledWith(
      expect.objectContaining({ actionType: AdminActionType.LOGIN_SUCCESS }),
    );
  });

  it('throws INVALID_CREDENTIALS when email not found', async () => {
    const { service, adminRepo } = await setup();
    adminRepo.findOne.mockResolvedValue(null);

    await expect(
      service.login({
        email: 'none@x.com',
        password: 'whatever',
        ip: '1.1.1.1',
        deviceId: null,
        appVersion: '1.0.0',
      }),
    ).rejects.toMatchObject({
      error: { errorCode: ErrorCode.INVALID_CREDENTIALS },
    });
  });

  it('throws ACCOUNT_DEACTIVATED when admin is inactive', async () => {
    const { service, adminRepo } = await setup();
    const passwordHash = await bcrypt.hash('pw', 4);
    adminRepo.findOne.mockResolvedValue(makeAdmin({ passwordHash, isActive: false }));

    await expect(
      service.login({
        email: 'a@x.com',
        password: 'pw',
        ip: '',
        deviceId: null,
        appVersion: '1.0.0',
      }),
    ).rejects.toMatchObject({
      error: { errorCode: ErrorCode.ACCOUNT_DEACTIVATED },
    });
  });

  it('logs LOGIN_FAILED and throws on wrong password', async () => {
    const { service, adminRepo, log } = await setup();
    const passwordHash = await bcrypt.hash('right', 4);
    adminRepo.findOne.mockResolvedValue(makeAdmin({ passwordHash }));

    await expect(
      service.login({
        email: 'a@x.com',
        password: 'wrong',
        ip: '',
        deviceId: null,
        appVersion: '1.0.0',
      }),
    ).rejects.toMatchObject({
      error: { errorCode: ErrorCode.INVALID_CREDENTIALS },
    });
    expect(log.write).toHaveBeenCalledWith(
      expect.objectContaining({ actionType: AdminActionType.LOGIN_FAILED }),
    );
  });
});

describe('AdminAuthService.refresh', () => {
  it('rotates: old token revoked, new pair returned', async () => {
    const { service, adminRepo, tokenRepo } = await setup();
    const passwordHash = await bcrypt.hash('pw', 4);
    const admin = makeAdmin({ passwordHash });
    adminRepo.findOne.mockResolvedValue(admin);
    tokenRepo.findOne.mockResolvedValue(null);

    const login = await service.login({
      email: 'a@x.com',
      password: 'pw',
      ip: '1.1.1.1',
      deviceId: 'd1',
      appVersion: '1.0.0',
    });
    const oldRefresh = login.refreshToken;
    const oldHash = createHash('sha256').update(oldRefresh).digest('hex');

    // On refresh: repo returns the row for the old token (unrevoked, not expired).
    const oldRow: AdminRefreshToken = {
      id: 't1',
      adminId: admin.id,
      admin,
      tokenHash: oldHash,
      deviceId: 'd1',
      ip: '1.1.1.1',
      expiresAt: new Date(Date.now() + 86_400_000),
      revokedAt: null,
      createdAt: new Date(),
    };
    tokenRepo.findOne.mockResolvedValue(oldRow);

    const res = await service.refresh({
      refreshToken: oldRefresh,
      ip: '1.1.1.1',
      deviceId: 'd1',
      appVersion: '1.0.0',
    });

    expect(res.refreshToken).not.toBe(oldRefresh);
    expect(tokenRepo.update).toHaveBeenCalledWith(
      { id: 't1' },
      expect.objectContaining({ revokedAt: expect.any(Date) }),
    );
  });

  it('detects reuse and mass-revokes', async () => {
    const { service, adminRepo, tokenRepo, log } = await setup();
    const passwordHash = await bcrypt.hash('pw', 4);
    const admin = makeAdmin({ passwordHash });
    adminRepo.findOne.mockResolvedValue(admin);

    // Simulate that the refresh we're verifying signatures for is valid (sign it)
    const now = Math.floor(Date.now() / 1000);
    const refreshToken = jwt.sign(
      { sub: admin.id, platform: 'admin', iat: now, exp: now + 3600 },
      readFileSync(PRIVATE_KEY_PATH, 'utf8'),
      { algorithm: 'RS256' },
    );
    const hash = createHash('sha256').update(refreshToken).digest('hex');

    tokenRepo.findOne.mockResolvedValue({
      id: 't1',
      adminId: admin.id,
      admin,
      tokenHash: hash,
      deviceId: null,
      ip: null,
      expiresAt: new Date(Date.now() + 3600_000),
      revokedAt: new Date(), // already revoked!
      createdAt: new Date(),
    } as AdminRefreshToken);

    await expect(
      service.refresh({ refreshToken, ip: '', deviceId: null, appVersion: '1.0.0' }),
    ).rejects.toMatchObject({
      error: { errorCode: ErrorCode.REFRESH_TOKEN_REUSE_DETECTED },
    });

    // Mass revoke: update called with { adminId, revokedAt: IsNull() } -> { revokedAt: now }
    expect(tokenRepo.update).toHaveBeenCalledWith(
      { adminId: admin.id, revokedAt: IsNull() },
      expect.objectContaining({ revokedAt: expect.any(Date) }),
    );
    expect(log.write).toHaveBeenCalledWith(
      expect.objectContaining({ actionType: AdminActionType.REFRESH_REUSE_DETECTED }),
    );
  });

  it('rejects when token not in DB', async () => {
    const { service, tokenRepo } = await setup();
    const now = Math.floor(Date.now() / 1000);
    const refreshToken = jwt.sign(
      { sub: 'a1', platform: 'admin', iat: now, exp: now + 3600 },
      readFileSync(PRIVATE_KEY_PATH, 'utf8'),
      { algorithm: 'RS256' },
    );
    tokenRepo.findOne.mockResolvedValue(null);

    await expect(
      service.refresh({ refreshToken, ip: '', deviceId: null, appVersion: '1.0.0' }),
    ).rejects.toMatchObject({
      error: { errorCode: ErrorCode.INVALID_TOKEN },
    });
  });
});

describe('AdminAuthService.logout', () => {
  it('revokes the token row and writes LOGOUT log', async () => {
    const { service, tokenRepo, log } = await setup();
    const refreshToken = 'fake.refresh.token';
    tokenRepo.findOne.mockResolvedValue({
      id: 't1',
      adminId: 'a1',
      tokenHash: createHash('sha256').update(refreshToken).digest('hex'),
      revokedAt: null,
    } as AdminRefreshToken);

    await service.logout({ refreshToken });

    expect(tokenRepo.update).toHaveBeenCalledWith(
      { id: 't1' },
      expect.objectContaining({ revokedAt: expect.any(Date) }),
    );
    expect(log.write).toHaveBeenCalledWith(
      expect.objectContaining({ actionType: AdminActionType.LOGOUT }),
    );
  });

  it('is idempotent when token not found', async () => {
    const { service, tokenRepo } = await setup();
    tokenRepo.findOne.mockResolvedValue(null);
    await expect(service.logout({ refreshToken: 'x' })).resolves.toEqual({ success: true });
    expect(tokenRepo.update).not.toHaveBeenCalled();
  });
});

describe('AdminAuthService.changePassword', () => {
  it('updates hash and revokes all tokens on success', async () => {
    const { service, adminRepo, tokenRepo, log } = await setup();
    const passwordHash = await bcrypt.hash('old-pw', 4);
    adminRepo.findOne.mockResolvedValue(makeAdmin({ passwordHash }));

    await service.changePassword({
      adminId: 'a1',
      currentPassword: 'old-pw',
      newPassword: 'New-pw-12',
    });

    expect(adminRepo.update).toHaveBeenCalledWith(
      { id: 'a1' },
      expect.objectContaining({ passwordHash: expect.any(String) }),
    );
    expect(tokenRepo.update).toHaveBeenCalledWith(
      { adminId: 'a1', revokedAt: IsNull() },
      expect.objectContaining({ revokedAt: expect.any(Date) }),
    );
    expect(log.write).toHaveBeenCalledWith(
      expect.objectContaining({ actionType: AdminActionType.PASSWORD_CHANGED }),
    );
  });

  it('throws INVALID_CREDENTIALS on wrong current password', async () => {
    const { service, adminRepo } = await setup();
    const passwordHash = await bcrypt.hash('old-pw', 4);
    adminRepo.findOne.mockResolvedValue(makeAdmin({ passwordHash }));

    await expect(
      service.changePassword({
        adminId: 'a1',
        currentPassword: 'wrong',
        newPassword: 'New-pw-12',
      }),
    ).rejects.toMatchObject({
      error: { errorCode: ErrorCode.INVALID_CREDENTIALS },
    });
  });

  it('throws ADMIN_NOT_FOUND if admin missing', async () => {
    const { service, adminRepo } = await setup();
    adminRepo.findOne.mockResolvedValue(null);

    await expect(
      service.changePassword({
        adminId: 'nope',
        currentPassword: 'x',
        newPassword: 'New-pw-12',
      }),
    ).rejects.toMatchObject({
      error: { errorCode: ErrorCode.ADMIN_NOT_FOUND },
    });
  });
});
