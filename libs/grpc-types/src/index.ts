export * as AdminProto from './generated/admin';
export * as StaffProto from './generated/staff';
export * as HealthProto from './generated/health';

// Re-export the shapes callers most frequently need at the top level, disambiguated.
// Prefer the namespaced import (AdminProto.LoginRequest) in most callers.
export type { HealthCheckRequest, HealthCheckResponse } from './generated/health';
