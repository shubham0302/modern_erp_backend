import { Module, ModulePermission } from '@modern_erp/common';
import { StaffProto } from '@modern_erp/grpc-types';

export function buildModuleAccess(
  perms: StaffProto.Permission[],
): Record<Module, ModulePermission> {
  const access: Record<Module, ModulePermission> = {
    [Module.DASHBOARD]: { canRead: false, canWrite: false },
    [Module.CATALOGUE]: { canRead: false, canWrite: false },
    [Module.INVENTORY]: { canRead: false, canWrite: false },
    [Module.PRODUCTION]: { canRead: false, canWrite: false },
    [Module.ORDER]: { canRead: false, canWrite: false },
    [Module.FINANCE]: { canRead: false, canWrite: false },
  };
  for (const p of perms) {
    if ((access as Record<string, ModulePermission>)[p.module] !== undefined) {
      access[p.module as Module] = { canRead: p.canRead, canWrite: p.canWrite };
    }
  }
  return access;
}
