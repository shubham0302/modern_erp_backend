import { GRPC_SERVICES } from './grpc-services.config';

describe('GRPC_SERVICES', () => {
  it('contains admin, staff and inventory services', () => {
    expect(Object.keys(GRPC_SERVICES).sort()).toEqual(['admin', 'inventory', 'staff']);
  });

  it('exposes admin auth and CRUD methods', () => {
    expect(GRPC_SERVICES.admin.methods.login.name).toBe('Login');
    expect(GRPC_SERVICES.admin.methods.refresh.name).toBe('Refresh');
    expect(GRPC_SERVICES.admin.methods.logout.name).toBe('Logout');
    expect(GRPC_SERVICES.admin.methods.getAdmin.name).toBe('GetAdmin');
    expect(GRPC_SERVICES.admin.methods.listAdmins.name).toBe('ListAdmins');
  });

  it('exposes staff auth, role and staff CRUD methods', () => {
    expect(GRPC_SERVICES.staff.methods.login.name).toBe('Login');
    expect(GRPC_SERVICES.staff.methods.getStaff.name).toBe('GetStaff');
    expect(GRPC_SERVICES.staff.methods.createRole.name).toBe('CreateRole');
    expect(GRPC_SERVICES.staff.methods.updateRole.name).toBe('UpdateRole');
  });

  it('exposes inventory CRUD and mapping methods', () => {
    expect(GRPC_SERVICES.inventory.methods.createSize.name).toBe('CreateSize');
    expect(GRPC_SERVICES.inventory.methods.createFinish.name).toBe('CreateFinish');
    expect(GRPC_SERVICES.inventory.methods.addFinishToSize.name).toBe('AddFinishToSize');
    expect(GRPC_SERVICES.inventory.methods.addSeriesToSizeFinish.name).toBe('AddSeriesToSizeFinish');
    expect(GRPC_SERVICES.inventory.methods.createDesign.name).toBe('CreateDesign');
  });

  it('does not reference removed services', () => {
    const keys = Object.keys(GRPC_SERVICES);
    expect(keys).not.toContain('auth');
    expect(keys).not.toContain('user');
    expect(keys).not.toContain('product');
    expect(keys).not.toContain('order');
    expect(keys).not.toContain('vendor');
  });
});
