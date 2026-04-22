import { Module } from './module.enum';

describe('Module enum', () => {
  it('has 5 business module members', () => {
    expect(Object.keys(Module).sort()).toEqual([
      'DEPOT',
      'INVENTORY',
      'ORDER',
      'PRODUCTION',
      'RAW_MATERIAL',
    ]);
  });

  it('uses snake_case string values', () => {
    expect(Module.RAW_MATERIAL).toBe('raw_material');
    expect(Module.PRODUCTION).toBe('production');
    expect(Module.INVENTORY).toBe('inventory');
    expect(Module.ORDER).toBe('order');
    expect(Module.DEPOT).toBe('depot');
  });
});
