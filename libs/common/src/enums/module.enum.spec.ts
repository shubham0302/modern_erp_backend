import { Module } from './module.enum';

describe('Module enum', () => {
  it('has 6 business module members', () => {
    expect(Object.keys(Module).sort()).toEqual([
      'DASHBOARD',
      'DESIGNS',
      'FINANCE',
      'INVENTORY',
      'ORDER',
      'PRODUCTION',
    ]);
  });

  it('uses lowercase string values', () => {
    expect(Module.DASHBOARD).toBe('dashboard');
    expect(Module.DESIGNS).toBe('designs');
    expect(Module.INVENTORY).toBe('inventory');
    expect(Module.PRODUCTION).toBe('production');
    expect(Module.ORDER).toBe('order');
    expect(Module.FINANCE).toBe('finance');
  });
});
