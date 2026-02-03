/**
 * DbLockService Constructor Tests
 * 
 * Tests for DbLockService constructor validation and initialization.
 */

import { describe, it, expect } from 'vitest';

describe('DbLockService Constructor', () => {
  describe('Default Configuration', () => {
    it('should create service with default timeout', () => {
      const svc = new DbLockService();
      expect(svc._defaultTimeout).toBe(10000);
    });
  });

  describe('Custom Configuration', () => {
    it('should create service with custom timeout', () => {
      const svc = new DbLockService({ defaultTimeout: 15000 });
      expect(svc._defaultTimeout).toBe(15000);
    });
  });

  describe('Invalid Configuration', () => {
    it('should throw for non-object config', () => {
      expect(() => new DbLockService('invalid')).toThrow();
    });

    it('should throw for non-number defaultTimeout', () => {
      expect(() => new DbLockService({ defaultTimeout: 'invalid' })).toThrow();
    });
  });
});
