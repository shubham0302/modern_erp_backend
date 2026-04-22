import { Module } from '../enums/module.enum';
import { Platform } from '../enums/platform.enum';

export interface ModulePermission {
  canRead: boolean;
  canWrite: boolean;
}

export interface CachedAdmin {
  kind: 'admin';
  id: string;
  name: string;
  email: string;
  phone: string;
  isSuperAdmin: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CachedStaff {
  kind: 'staff';
  id: string;
  name: string;
  email: string;
  phone: string;
  isActive: boolean;
  role: { id: string; name: string };
  moduleAccess: Record<Module, ModulePermission>;
  createdAt: string;
  updatedAt: string;
}

export type CachedUser = CachedAdmin | CachedStaff;

export interface UserContext {
  userId: string;
  platform: Platform;
  isSuperAdmin?: boolean;
  moduleAccess?: Record<Module, ModulePermission>;
  ip: string;
  deviceId: string | undefined;
  appVersion: string;
  language?: string;
}
