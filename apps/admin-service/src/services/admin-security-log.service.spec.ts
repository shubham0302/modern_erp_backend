import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { AdminSecurityLog } from '../entities/admin-security-log.entity';
import { AdminActionType } from '../enums/admin-action-type.enum';

import { AdminSecurityLogService } from './admin-security-log.service';

describe('AdminSecurityLogService', () => {
  let service: AdminSecurityLogService;
  let repo: jest.Mocked<Repository<AdminSecurityLog>>;

  beforeEach(async () => {
    const mockRepo: Partial<jest.Mocked<Repository<AdminSecurityLog>>> = {
      create: jest.fn().mockImplementation((x: Partial<AdminSecurityLog>) => x as AdminSecurityLog),
      save: jest.fn().mockImplementation((x: AdminSecurityLog) => Promise.resolve(x)),
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
    };

    const moduleRef = await Test.createTestingModule({
      providers: [
        AdminSecurityLogService,
        { provide: getRepositoryToken(AdminSecurityLog), useValue: mockRepo },
      ],
    }).compile();

    service = moduleRef.get(AdminSecurityLogService);
    repo = moduleRef.get(getRepositoryToken(AdminSecurityLog));
  });

  it('write inserts a log row with given fields', async () => {
    await service.write({
      adminId: 'a1',
      adminName: 'A',
      actionType: AdminActionType.LOGIN_SUCCESS,
      description: 'ok',
      ip: '1.2.3.4',
    });
    expect(repo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        adminId: 'a1',
        adminName: 'A',
        actionType: 'LOGIN_SUCCESS',
        description: 'ok',
        ip: '1.2.3.4',
      }),
    );
  });

  it('list returns paginated result', async () => {
    const row = {
      id: 'l1',
      adminId: 'a1',
      adminName: 'A',
      actionType: 'LOGIN_SUCCESS',
      description: null,
      ip: null,
      createdAt: new Date('2026-04-21T00:00:00Z'),
    } as AdminSecurityLog;
    repo.findAndCount.mockResolvedValue([[row], 1]);

    const res = await service.list({ page: 1, limit: 50 });
    expect(res.total).toBe(1);
    expect(res.items).toHaveLength(1);
    expect(res.items[0].id).toBe('l1');
  });
});
