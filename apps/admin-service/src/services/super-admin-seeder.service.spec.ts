import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Admin } from '../entities/admin.entity';

import { SuperAdminSeederService } from './super-admin-seeder.service';

const CONFIG = {
  getOrThrow: (k: string): string => {
    const m: Record<string, string> = {
      SEED_SUPER_ADMIN_EMAIL: 'super@x.com',
      SEED_SUPER_ADMIN_PASSWORD: 'Super123!',
      SEED_SUPER_ADMIN_NAME: 'Super',
      SEED_SUPER_ADMIN_PHONE: '+91',
      BCRYPT_ROUNDS: '4',
    };
    return m[k] ?? '';
  },
} as unknown as ConfigService;

describe('SuperAdminSeederService', () => {
  it('creates super-admin on first boot (none existing)', async () => {
    const repo = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockImplementation((x: Partial<Admin>) => x as Admin),
      save: jest.fn().mockResolvedValue({ id: 'seeded' }),
    } as unknown as jest.Mocked<Repository<Admin>>;

    const moduleRef = await Test.createTestingModule({
      providers: [
        SuperAdminSeederService,
        { provide: ConfigService, useValue: CONFIG },
        { provide: getRepositoryToken(Admin), useValue: repo },
      ],
    }).compile();

    const svc = moduleRef.get(SuperAdminSeederService);
    await svc.onModuleInit();

    expect(repo.save).toHaveBeenCalled();
    const row = repo.save.mock.calls[0][0] as Partial<Admin>;
    expect(row.email).toBe('super@x.com');
    expect(row.isSuperAdmin).toBe(true);
    expect(row.passwordHash).not.toBe('Super123!');
  });

  it('is idempotent (existing super-admin → no-op)', async () => {
    const repo = {
      findOne: jest.fn().mockResolvedValue({ id: 'existing', email: 'super@x.com' }),
      create: jest.fn(),
      save: jest.fn(),
    } as unknown as jest.Mocked<Repository<Admin>>;

    const moduleRef = await Test.createTestingModule({
      providers: [
        SuperAdminSeederService,
        { provide: ConfigService, useValue: CONFIG },
        { provide: getRepositoryToken(Admin), useValue: repo },
      ],
    }).compile();

    const svc = moduleRef.get(SuperAdminSeederService);
    await svc.onModuleInit();
    expect(repo.save).not.toHaveBeenCalled();
  });
});
