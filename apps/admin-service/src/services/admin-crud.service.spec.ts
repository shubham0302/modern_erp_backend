import { ErrorCode } from '@modern_erp/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Admin } from '../entities/admin.entity';
import { AdminActionType } from '../enums/admin-action-type.enum';

import { AdminCrudService } from './admin-crud.service';
import { AdminSecurityLogService } from './admin-security-log.service';

function mkAdmin(o: Partial<Admin> = {}): Admin {
  return {
    id: 'a-default',
    name: 'A',
    email: 'a@x.com',
    phone: '+91',
    passwordHash: 'h',
    isSuperAdmin: false,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...o,
  } as Admin;
}

interface Mocks {
  service: AdminCrudService;
  repo: jest.Mocked<Repository<Admin>>;
  log: jest.Mocked<AdminSecurityLogService>;
}

async function setup(): Promise<Mocks> {
  const repo = {
    findOne: jest.fn(),
    findOneOrFail: jest.fn(),
    findAndCount: jest.fn().mockResolvedValue([[], 0]),
    create: jest.fn().mockImplementation((x: Partial<Admin>) => x as Admin),
    save: jest.fn().mockImplementation((x: Admin) => Promise.resolve(x)),
    update: jest.fn(),
    softDelete: jest.fn(),
    count: jest.fn(),
  } as unknown as jest.Mocked<Repository<Admin>>;
  const log = { write: jest.fn() } as unknown as jest.Mocked<AdminSecurityLogService>;
  const moduleRef = await Test.createTestingModule({
    providers: [
      AdminCrudService,
      { provide: getRepositoryToken(Admin), useValue: repo },
      { provide: AdminSecurityLogService, useValue: log },
      {
        provide: ConfigService,
        useValue: {
          getOrThrow: (k: string): string => (k === 'BCRYPT_ROUNDS' ? '4' : ''),
        },
      },
    ],
  }).compile();
  const service = moduleRef.get(AdminCrudService);
  return { service, repo, log };
}

describe('AdminCrudService authorization', () => {
  it('throws SUPER_ADMIN_REQUIRED when actor not super', async () => {
    const { service, repo } = await setup();
    repo.findOne.mockResolvedValue(mkAdmin({ id: 'a1', isSuperAdmin: false }));
    await expect(
      service.create({
        actorId: 'a1',
        name: 'New',
        email: 'n@x.com',
        phone: '+91',
        password: 'Password1',
        isSuperAdmin: false,
      }),
    ).rejects.toMatchObject({ error: { errorCode: ErrorCode.SUPER_ADMIN_REQUIRED } });
  });
});

describe('AdminCrudService.create', () => {
  it('throws EMAIL_ALREADY_EXISTS when email taken', async () => {
    const { service, repo } = await setup();
    repo.findOne
      .mockResolvedValueOnce(mkAdmin({ id: 'actor', isSuperAdmin: true }))
      .mockResolvedValueOnce(mkAdmin({ id: 'existing', email: 'n@x.com' }));
    await expect(
      service.create({
        actorId: 'actor',
        name: 'New',
        email: 'n@x.com',
        phone: '+91',
        password: 'Password1',
        isSuperAdmin: false,
      }),
    ).rejects.toMatchObject({ error: { errorCode: ErrorCode.EMAIL_ALREADY_EXISTS } });
  });

  it('hashes password and saves on success', async () => {
    const { service, repo, log } = await setup();
    repo.findOne
      .mockResolvedValueOnce(mkAdmin({ id: 'actor', isSuperAdmin: true }))
      .mockResolvedValueOnce(null);
    await service.create({
      actorId: 'actor',
      name: 'New',
      email: 'n@x.com',
      phone: '+91',
      password: 'Password1',
      isSuperAdmin: false,
    });
    expect(repo.save).toHaveBeenCalled();
    const saved = repo.save.mock.calls[0][0] as Partial<Admin>;
    expect(saved.passwordHash).not.toBe('Password1');
    expect(log.write).toHaveBeenCalledWith(
      expect.objectContaining({ actionType: AdminActionType.ADMIN_CREATED }),
    );
  });
});

describe('AdminCrudService.delete', () => {
  it('throws when trying to delete self', async () => {
    const { service, repo } = await setup();
    repo.findOne.mockResolvedValue(mkAdmin({ id: 'actor', isSuperAdmin: true }));
    await expect(service.delete({ actorId: 'actor', id: 'actor' })).rejects.toMatchObject({
      error: { errorCode: ErrorCode.SUPER_ADMIN_PROTECTED },
    });
  });

  it('throws when trying to delete last super-admin', async () => {
    const { service, repo } = await setup();
    repo.findOne
      .mockResolvedValueOnce(mkAdmin({ id: 'actor', isSuperAdmin: true }))
      .mockResolvedValueOnce(mkAdmin({ id: 'target', isSuperAdmin: true }));
    repo.count.mockResolvedValue(1);
    await expect(service.delete({ actorId: 'actor', id: 'target' })).rejects.toMatchObject({
      error: { errorCode: ErrorCode.SUPER_ADMIN_PROTECTED },
    });
  });

  it('soft deletes on success', async () => {
    const { service, repo, log } = await setup();
    repo.findOne
      .mockResolvedValueOnce(mkAdmin({ id: 'actor', isSuperAdmin: true }))
      .mockResolvedValueOnce(mkAdmin({ id: 'target', isSuperAdmin: false, name: 'T' }));
    await service.delete({ actorId: 'actor', id: 'target' });
    expect(repo.softDelete).toHaveBeenCalledWith({ id: 'target' });
    expect(log.write).toHaveBeenCalledWith(
      expect.objectContaining({ actionType: AdminActionType.ADMIN_DELETED }),
    );
  });
});

describe('AdminCrudService.getById', () => {
  it('returns the admin when found', async () => {
    const { service, repo } = await setup();
    repo.findOne.mockResolvedValue(mkAdmin({ id: 'x' }));
    const res = await service.getById('x');
    expect(res.id).toBe('x');
  });

  it('throws ADMIN_NOT_FOUND when missing', async () => {
    const { service, repo } = await setup();
    repo.findOne.mockResolvedValue(null);
    await expect(service.getById('nope')).rejects.toMatchObject({
      error: { errorCode: ErrorCode.ADMIN_NOT_FOUND },
    });
  });
});
