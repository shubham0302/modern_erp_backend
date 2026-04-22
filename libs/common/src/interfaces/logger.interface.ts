export interface RequestErrorContext {
  requestId: string;
  method: string;
  path: string;
  query?: Record<string, unknown>;
  body?: Record<string, unknown>;
  ip: string;
  deviceId?: string;
  userAgent?: string;
  userId?: string;
  platform?: string;
  appVersion?: string;
}

export interface GrpcErrorMeta {
  code: number;
  details: string;
  service: string;
}

export interface KafkaErrorContext {
  topic: string;
  partition?: number;
  messageKey?: string;
  requestId?: string;
  userId?: string;
  payload?: Record<string, unknown>;
}

export interface ServiceErrorContext {
  service: string;
  method: string;
  requestId?: string;
  userId?: string;
  input?: Record<string, unknown>;
}

export interface SystemErrorContext {
  component: string;
  details?: string;
}
