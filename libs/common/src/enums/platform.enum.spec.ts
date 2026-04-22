import { Platform } from './platform.enum';

describe('Platform enum', () => {
  it('has only STAFF and ADMIN members', () => {
    expect(Object.keys(Platform)).toEqual(['STAFF', 'ADMIN']);
  });

  it('uses lowercase string values', () => {
    expect(Platform.STAFF).toBe('staff');
    expect(Platform.ADMIN).toBe('admin');
  });
});
