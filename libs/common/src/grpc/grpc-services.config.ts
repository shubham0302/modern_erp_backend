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
    configKey: 'ADMIN_URL',
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
    configKey: 'STAFF_URL',
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
      listStaff: { name: 'ListStaff' },
      getStaffDetail: { name: 'GetStaffDetail' },
      createStaff: { name: 'CreateStaff' },
      updateStaff: { name: 'UpdateStaff' },
      deleteStaff: { name: 'DeleteStaff' },
      recoverStaff: { name: 'RecoverStaff' },
      adminChangeStaffPassword: { name: 'AdminChangeStaffPassword' },
      listSecurityLogs: { name: 'ListSecurityLogs' },
      writeSecurityLog: { name: 'WriteSecurityLog' },
    },
  },
  inventory: {
    name: 'inventory',
    protoFile: 'inventory.proto',
    packageName: 'inventory',
    serviceName: 'InventoryService',
    configKey: 'INVENTORY_URL',
    methods: {
      // Size
      listSizes: { name: 'ListSizes' },
      getSize: { name: 'GetSize' },
      createSize: { name: 'CreateSize' },
      updateSize: { name: 'UpdateSize' },
      deleteSize: { name: 'DeleteSize' },
      restoreSize: { name: 'RestoreSize' },
      // Finish
      listFinishes: { name: 'ListFinishes' },
      getFinish: { name: 'GetFinish' },
      createFinish: { name: 'CreateFinish' },
      updateFinish: { name: 'UpdateFinish' },
      deleteFinish: { name: 'DeleteFinish' },
      restoreFinish: { name: 'RestoreFinish' },
      // Size <-> Finish mapping
      addFinishToSize: { name: 'AddFinishToSize' },
      removeFinishFromSize: { name: 'RemoveFinishFromSize' },
      listSizeFinishesBySize: { name: 'ListSizeFinishesBySize' },
      // Series
      listSeries: { name: 'ListSeries' },
      getSeries: { name: 'GetSeries' },
      createSeries: { name: 'CreateSeries' },
      updateSeries: { name: 'UpdateSeries' },
      deleteSeries: { name: 'DeleteSeries' },
      restoreSeries: { name: 'RestoreSeries' },
      // Series <-> SizeFinish mapping
      addSeriesToSizeFinish: { name: 'AddSeriesToSizeFinish' },
      removeSeriesFromSizeFinish: { name: 'RemoveSeriesFromSizeFinish' },
      listSeriesSizeFinishesBySeries: { name: 'ListSeriesSizeFinishesBySeries' },
      // Design
      listDesigns: { name: 'ListDesigns' },
      getDesign: { name: 'GetDesign' },
      createDesign: { name: 'CreateDesign' },
      updateDesign: { name: 'UpdateDesign' },
      deleteDesign: { name: 'DeleteDesign' },
      restoreDesign: { name: 'RestoreDesign' },
    },
  },
} as const satisfies Record<string, GrpcServiceDef>;
