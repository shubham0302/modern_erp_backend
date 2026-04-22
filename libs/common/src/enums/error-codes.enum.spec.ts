import { ErrorCode } from './error-codes.enum';

describe('ErrorCode enum', () => {
  it('contains all auth-related codes', () => {
    expect(ErrorCode.MISSING_TOKEN).toBe('MISSING_TOKEN');
    expect(ErrorCode.TOKEN_EXPIRED).toBe('TOKEN_EXPIRED');
    expect(ErrorCode.INVALID_TOKEN).toBe('INVALID_TOKEN');
    expect(ErrorCode.INVALID_CREDENTIALS).toBe('INVALID_CREDENTIALS');
    expect(ErrorCode.REFRESH_TOKEN_REUSE_DETECTED).toBe('REFRESH_TOKEN_REUSE_DETECTED');
  });

  it('contains all CRUD-related codes', () => {
    expect(ErrorCode.ADMIN_NOT_FOUND).toBe('ADMIN_NOT_FOUND');
    expect(ErrorCode.STAFF_NOT_FOUND).toBe('STAFF_NOT_FOUND');
    expect(ErrorCode.ROLE_NOT_FOUND).toBe('ROLE_NOT_FOUND');
    expect(ErrorCode.ROLE_IN_USE).toBe('ROLE_IN_USE');
    expect(ErrorCode.EMAIL_ALREADY_EXISTS).toBe('EMAIL_ALREADY_EXISTS');
    expect(ErrorCode.SUPER_ADMIN_REQUIRED).toBe('SUPER_ADMIN_REQUIRED');
    expect(ErrorCode.SUPER_ADMIN_PROTECTED).toBe('SUPER_ADMIN_PROTECTED');
  });

  it('does NOT contain removed legacy codes', () => {
    const keys = Object.keys(ErrorCode);
    expect(keys).not.toContain('MISSING_PLATFORM_KEY');
    expect(keys).not.toContain('OTP_EXPIRED');
    expect(keys).not.toContain('VENDOR_NOT_APPROVED');
  });
});
