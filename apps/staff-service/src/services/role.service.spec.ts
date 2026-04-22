import { ErrorCode, Module as BusinessModule } from '@modern_erp/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { RolePermission } from '../entities/role-permission.entity';
import { Role } from '../entities/role.entity';
import { Staff } from '../entities/staff.entity';
import { StaffActionType } from '../enums/staff-action-type.enum';

import { RoleService } from './role.service';
import { StaffSecurityLogService } from './staff-security-log.service';

interface Mocks {
  service: RoleService;
  roleRepo: jest.Mocked<Repository<Role>>;
  permRepo: jest.Mocked<Repository<RolePermission>>;
  staffRepo: jest.Mocked<Repository<Staff>>;
  log: jest.Mocked<StaffSecurityLogService>;
}

async function setup(): Promise<Mocks> {
  const roleRepo = {
    findOne: jest.fn(),
    findAndCount: jest.fn().mockResolvedValue([[], 0]),
    findOneOrFail: jest.fn(),
    create: jest.fn().mockImplementation((x: Partial<Role>) => x as Role),
    save: jest.fn().mockImplementation((x) => Promise.resolve(x)),
    update: jest.fn(),
    softDelete: jest.fn(),
  } as unknown as jest.Mocked<Repository<Role>>;
  const permRepo = {
    find: jest.fn().mockResolvedValue([]),
    delete: jest.fn(),
    create: jest.fn().mockImplementation((x: Partial<RolePermission>) => x as RolePermission),
    save: jest.fn().mockImplementation((x) => Promise.resolve(x)),
  } as unknown as jest.Mocked<Repository<RolePermission>>;
  const staffRepo = {
    count: jest.fn().mockResolvedValue(0),
  } as unknown as jest.Mocked<Repository<Staff>>;
  const log = { write: jest.fn() } as unknown as jest.Mocked<StaffSecurityLogService>;

  const moduleRef = await Test.createTestingModule({
    providers: [
      RoleService,
      { provide: getRepositoryToken(Role), useValue: roleRepo },
      { provide: getRepositoryToken(RolePermission), useValue: permRepo },
      { provide: getRepositoryToken(Staff), useValue: staffRepo },
      { provide: StaffSecurityLogService, useValue: log },
    ],
  }).compile();

  const service = moduleRef.get(RoleService);
  return { service, roleRepo, permRepo, staffRepo, log };
}

describe('RoleService.create', () => {
  it('saves role and all provided permissions', async () => {
    const { service, roleRepo, permRepo, log } = await setup();
    roleRepo.findOne.mockResolvedValue(null);
    roleRepo.save.mockResolvedValue({
      id: 'r1',
      name: 'Sales',
      description: '',
      permissions: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
    } as Role);

    const res = await service.create({
      name: 'Sales',
      description: '',
      permissions: [
        { module: BusinessModule.RAW_MATERIAL, canRead: true, canWrite: false },
        { module: BusinessModule.ORDER, canRead: true, canWrite: true },
      ],
    });

    expect(res.role.id).toBe('r1');
    expect(permRepo.save).toHaveBeenCalled();
    expect(log.write).toHaveBeenCalledWith(
      expect.objectContaining({ actionType: StaffActionType.ROLE_CREATED }),
    );
  });

  it('throws ROLE_NAME_ALREADY_EXISTS when name taken', async () => {
    const { service, roleRepo } = await setup();
    roleRepo.findOne.mockResolvedValue({ id: 'existing', name: 'Sales' } as Role);
    await expect(service.create({ name: 'Sales', permissions: [] })).rejects.toMatchObject({
      error: { errorCode: ErrorCode.ROLE_NAME_ALREADY_EXISTS },
    });
  });

  it('rejects invalid module', async () => {
    const { service } = await setup();
    await expect(
      service.create({
        name: 'X',
        permissions: [{ module: 'bogus_module', canRead: true, canWrite: false }],
      }),
    ).rejects.toMatchObject({ error: { errorCode: ErrorCode.VALIDATION_FAILED } });
  });
});

describe('RoleService.delete', () => {
  it('throws ROLE_IN_USE if any staff is assigned', async () => {
    const { service, roleRepo, staffRepo } = await setup();
    roleRepo.findOne.mockResolvedValue({ id: 'r1', name: 'X' } as Role);
    staffRepo.count.mockResolvedValue(3);
    await expect(service.delete({ id: 'r1' })).rejects.toMatchObject({
      error: { errorCode: ErrorCode.ROLE_IN_USE },
    });
  });

  it('soft deletes when no staff assigned', async () => {
    const { service, roleRepo } = await setup();
    roleRepo.findOne.mockResolvedValue({ id: 'r1', name: 'X' } as Role);
    await service.delete({ id: 'r1' });
    expect(roleRepo.softDelete).toHaveBeenCalledWith({ id: 'r1' });
  });
});

describe('RoleService.replacePermissions', () => {
  it('deletes existing and inserts new', async () => {
    const { service, roleRepo, permRepo, log } = await setup();
    roleRepo.findOne.mockResolvedValue({ id: 'r1', name: 'X' } as Role);

    await service.replacePermissions({
      roleId: 'r1',
      permissions: [{ module: BusinessModule.INVENTORY, canRead: true, canWrite: true }],
    });

    expect(permRepo.delete).toHaveBeenCalledWith({ roleId: 'r1' });
    expect(permRepo.save).toHaveBeenCalled();
    expect(log.write).toHaveBeenCalledWith(
      expect.objectContaining({ actionType: StaffActionType.ROLE_PERMISSIONS_REPLACED }),
    );
  });
});
