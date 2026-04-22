import * as grpc from '@grpc/grpc-js';

export interface GrpcRequestContext {
  requestId: string | undefined;
  userId: string | undefined;
  platform: string | undefined;
  ip: string | undefined;
  deviceId: string | undefined;
  appVersion: string | undefined;
}

export function extractGrpcContext(metadata: grpc.Metadata): GrpcRequestContext {
  const get = (key: string): string | undefined => {
    const values = metadata.get(key);
    return values.length > 0 ? values[0].toString() : undefined;
  };

  return {
    requestId: get('x-request-id'),
    userId: get('x-user-id'),
    platform: get('x-platform'),
    ip: get('x-ip'),
    deviceId: get('x-device-id'),
    appVersion: get('x-app-version'),
  };
}
