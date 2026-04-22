import { join } from 'path';

import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';
import { GRPC_SERVICES, GrpcServiceName, UserContext } from '@modern_erp/common';
import { ModernERPLogger } from '@modern_erp/logger';
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

type GrpcClient = Record<
  string,
  (
    data: unknown,
    metadata: grpc.Metadata,
    options: { deadline: Date },
    callback: (err: grpc.ServiceError | null, response: unknown) => void,
  ) => void
>;

const LOADER_OPTIONS: protoLoader.Options = {
  keepCase: false,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true,
};

@Injectable()
export class GrpcClientRegistry implements OnModuleInit {
  private clients = new Map<GrpcServiceName, GrpcClient>();

  constructor(
    private config: ConfigService,
    private logger: ModernERPLogger,
  ) {}

  onModuleInit(): void {
    const entries = Object.entries(GRPC_SERVICES) as [
      GrpcServiceName,
      (typeof GRPC_SERVICES)[GrpcServiceName],
    ][];

    for (const [key, def] of entries) {
      try {
        const protoPath = join(process.cwd(), 'proto', def.protoFile);
        const packageDef = protoLoader.loadSync(protoPath, LOADER_OPTIONS);
        const proto = grpc.loadPackageDefinition(packageDef);

        const url = this.config.getOrThrow<string>(def.configKey);
        const Ctor = (proto[def.packageName] as Record<string, unknown>)?.[def.serviceName] as
          | (new (url: string, creds: grpc.ChannelCredentials) => GrpcClient)
          | undefined;

        if (!Ctor) continue;

        this.clients.set(key, new Ctor(url, grpc.credentials.createInsecure()));
      } catch (error) {
        this.logger.captureSystemError(error instanceof Error ? error : new Error(String(error)), {
          component: 'grpc_client',
          details: `Failed to init ${def.name}`,
        });
      }
    }
  }

  call<TReq, TRes>(
    serviceName: GrpcServiceName,
    method: string,
    data: TReq,
    userContext: UserContext | null,
    requestId: string,
    timeoutMs = 5000,
  ): Promise<TRes> {
    const client = this.clients.get(serviceName);
    const serviceDef = GRPC_SERVICES[serviceName];

    if (!client) throw new Error(`Service [${serviceName}] not available`);

    const methodCfg = (serviceDef.methods as Record<string, { name: string }>)[method];
    if (!methodCfg) throw new Error(`Method [${method}] not found on [${serviceName}]`);

    const grpcMethod = methodCfg.name.charAt(0).toLowerCase() + methodCfg.name.slice(1);
    if (!client[grpcMethod]) {
      throw new Error(`gRPC method [${grpcMethod}] not found on [${serviceName}]`);
    }

    const metadata = new grpc.Metadata();
    metadata.set('x-request-id', requestId);
    if (userContext) {
      metadata.set('x-user-id', userContext.userId);
      metadata.set('x-platform', userContext.platform);
      metadata.set('x-ip', userContext.ip);
      metadata.set('x-device-id', userContext.deviceId ?? '');
      metadata.set('x-app-version', userContext.appVersion);
    }

    const deadline = new Date(Date.now() + timeoutMs);

    return new Promise<TRes>((resolve, reject) => {
      client[grpcMethod](data, metadata, { deadline }, (err, response) => {
        if (err) reject(err);
        else resolve(response as TRes);
      });
    });
  }
}
