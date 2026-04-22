import { Module } from '../enums/module.enum';
import { Platform } from '../enums/platform.enum';

import { CachedAdmin, CachedStaff, CachedUser, UserContext } from './user-context.interface';

describe('CachedUser discriminated union', () => {
  it('narrows CachedAdmin by kind', () => {
    const admin: CachedUser = {
      kind: 'admin',
      id: 'a1',
      name: 'Admin One',
      email: 'a@x.com',
      phone: '+910000000000',
      isSuperAdmin: true,
      isActive: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };

    if (admin.kind === 'admin') {
      const narrowed: CachedAdmin = admin;
      expect(narrowed.isSuperAdmin).toBe(true);
    } else {
      fail('should be admin');
    }
  });

  it('narrows CachedStaff by kind and exposes moduleAccess', () => {
    const staff: CachedUser = {
      kind: 'staff',
      id: 's1',
      name: 'Staff One',
      email: 's@x.com',
      phone: '+910000000001',
      isActive: true,
      role: { id: 'r1', name: 'Sales' },
      moduleAccess: {
        [Module.RAW_MATERIAL]: { canRead: true, canWrite: false },
        [Module.PRODUCTION]: { canRead: false, canWrite: false },
        [Module.INVENTORY]: { canRead: true, canWrite: true },
        [Module.ORDER]: { canRead: true, canWrite: true },
        [Module.DEPOT]: { canRead: false, canWrite: false },
      },
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };

    if (staff.kind === 'staff') {
      const narrowed: CachedStaff = staff;
      expect(narrowed.moduleAccess[Module.INVENTORY].canWrite).toBe(true);
    } else {
      fail('should be staff');
    }
  });
});

describe('UserContext', () => {
  it('holds platform + optional isSuperAdmin and moduleAccess', () => {
    const ctx: UserContext = {
      userId: 'u1',
      platform: Platform.ADMIN,
      isSuperAdmin: false,
      ip: '127.0.0.1',
      deviceId: undefined,
      appVersion: '1.0.0',
    };
    expect(ctx.platform).toBe('admin');
  });
});
