import { ConfigService } from '@nestjs/config';

import { ModernERPLogger } from './modern-erp-logger.service';

describe('ModernERPLogger.sanitize', () => {
  let logger: ModernERPLogger;

  beforeEach(() => {
    const config = {
      getOrThrow: (k: string): string => {
        if (k === 'SERVICE_NAME') return 'test';
        if (k === 'GLITCHTIP_DSN') return '';
        if (k === 'NODE_ENV') return 'test';
        return '';
      },
    } as ConfigService;
    logger = new ModernERPLogger(config);
  });

  it('redacts password-family keys', () => {
    const out = (
      logger as unknown as {
        sanitize: (d: Record<string, unknown>) => Record<string, unknown> | null;
      }
    ).sanitize({
      password: 'secret',
      newPassword: 'new',
      currentPassword: 'curr',
      username: 'bob',
    });
    expect(out).toEqual({
      password: '[REDACTED]',
      newPassword: '[REDACTED]',
      currentPassword: '[REDACTED]',
      username: 'bob',
    });
  });

  it('redacts token-family keys', () => {
    const out = (
      logger as unknown as {
        sanitize: (d: Record<string, unknown>) => Record<string, unknown> | null;
      }
    ).sanitize({
      refreshToken: 't',
      refresh_token: 't',
      accessToken: 'a',
      tokenHash: 'h',
      foo: 'bar',
    });
    expect(out).toEqual({
      refreshToken: '[REDACTED]',
      refresh_token: '[REDACTED]',
      accessToken: '[REDACTED]',
      tokenHash: '[REDACTED]',
      foo: 'bar',
    });
  });

  it('does not redact removed OTP key (OTP is gone)', () => {
    const out = (
      logger as unknown as {
        sanitize: (d: Record<string, unknown>) => Record<string, unknown> | null;
      }
    ).sanitize({ otp: '123456' });
    expect(out).toEqual({ otp: '123456' });
  });

  it('returns null for undefined input', () => {
    const out = (
      logger as unknown as {
        sanitize: (d: Record<string, unknown> | undefined) => Record<string, unknown> | null;
      }
    ).sanitize(undefined);
    expect(out).toBeNull();
  });
});
