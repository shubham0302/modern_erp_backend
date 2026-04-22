import * as grpc from '@grpc/grpc-js';

import { extractGrpcContext } from './grpc-context.util';

describe('extractGrpcContext', () => {
  it('returns undefined for unset keys', () => {
    const md = new grpc.Metadata();
    const ctx = extractGrpcContext(md);
    expect(ctx.requestId).toBeUndefined();
    expect(ctx.userId).toBeUndefined();
    expect(ctx.platform).toBeUndefined();
    expect(ctx.ip).toBeUndefined();
    expect(ctx.deviceId).toBeUndefined();
    expect(ctx.appVersion).toBeUndefined();
  });

  it('extracts all set fields', () => {
    const md = new grpc.Metadata();
    md.set('x-request-id', 'req-1');
    md.set('x-user-id', 'u-1');
    md.set('x-platform', 'admin');
    md.set('x-ip', '1.2.3.4');
    md.set('x-device-id', 'dev-1');
    md.set('x-app-version', '1.0.0');

    const ctx = extractGrpcContext(md);

    expect(ctx.requestId).toBe('req-1');
    expect(ctx.userId).toBe('u-1');
    expect(ctx.platform).toBe('admin');
    expect(ctx.ip).toBe('1.2.3.4');
    expect(ctx.deviceId).toBe('dev-1');
    expect(ctx.appVersion).toBe('1.0.0');
  });
});
