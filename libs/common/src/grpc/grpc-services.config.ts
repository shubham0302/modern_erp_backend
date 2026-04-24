export interface GrpcMethodDef {
  readonly name: string;
}

export interface GrpcServiceDef {
  readonly name: string;
  readonly protoFile: string;
  readonly packageName: string;
  readonly serviceName: string;
  readonly configKey: string;
  readonly methods: Readonly<Record<string, GrpcMethodDef>>;
}

export type GrpcServiceName = keyof typeof GRPC_SERVICES;
export type GrpcMethodName<S extends GrpcServiceName> = keyof (typeof GRPC_SERVICES)[S]['methods'];

export const GRPC_SERVICES = {
  admin: {
    name: 'admin',
    protoFile: 'admin.proto',
    packageName: 'admin',
    serviceName: 'AdminService',
    configKey: 'ADMIN_SERVICE_URL',
    methods: {
      login: { name: 'Login' },
      refresh: { name: 'Refresh' },
      logout: { name: 'Logout' },
      changePassword: { name: 'ChangePassword' },
      getAdmin: { name: 'GetAdmin' },
      listAdmins: { name: 'ListAdmins' },
      createAdmin: { name: 'CreateAdmin' },
      updateAdmin: { name: 'UpdateAdmin' },
      deleteAdmin: { name: 'DeleteAdmin' },
      restoreAdmin: { name: 'RestoreAdmin' },
      listSecurityLogs: { name: 'ListSecurityLogs' },
      writeSecurityLog: { name: 'WriteSecurityLog' },
    },
  },
  staff: {
    name: 'staff',
    protoFile: 'staff.proto',
    packageName: 'staff',
    serviceName: 'StaffService',
    configKey: 'STAFF_SERVICE_URL',
    methods: {
      login: { name: 'Login' },
      refresh: { name: 'Refresh' },
      logout: { name: 'Logout' },
      changePassword: { name: 'ChangePassword' },
      getStaff: { name: 'GetStaff' },
      listRoles: { name: 'ListRoles' },
      getRole: { name: 'GetRole' },
      createRole: { name: 'CreateRole' },
      updateRole: { name: 'UpdateRole' },
      deleteRole: { name: 'DeleteRole' },
      replaceRolePermissions: { name: 'ReplaceRolePermissions' },
      listStaff: { name: 'ListStaff' },
      getStaffDetail: { name: 'GetStaffDetail' },
      createStaff: { name: 'CreateStaff' },
      updateStaff: { name: 'UpdateStaff' },
      deleteStaff: { name: 'DeleteStaff' },
      setStaffActive: { name: 'SetStaffActive' },
      adminChangeStaffPassword: { name: 'AdminChangeStaffPassword' },
      listSecurityLogs: { name: 'ListSecurityLogs' },
      writeSecurityLog: { name: 'WriteSecurityLog' },
    },
  },
} as const satisfies Record<string, GrpcServiceDef>;
