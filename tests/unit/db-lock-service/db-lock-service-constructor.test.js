/**
 * DbLockService Constructor Tests
 * 
 * Tests for DbLockService constructor validation and initialization.
 */

import { describe, it, expect } from 'vitest';
import '../../setup/gas-mocks.setup.js';

const { DbLockService, InvalidArgumentError } = globalThis;

describe('DbLockService Constructor', () => {
  describe('Default Configuration', () => {
    it('should create service with default timeout', () => {
      // Act
      const svc = new DbLockService();
      // Assert
      expect(svc._defaultTimeout).toBe(10000);
    });
  });

  describe('Custom Configuration', () => {
    it('should create service with custom timeout', () => {
      // Act
      const svc = new DbLockService({ defaultTimeout: 15000 });
      // Assert
      expect(svc._defaultTimeout).toBe(15000);
    });
  });

  describe('Invalid Configuration', () => {
    it('should throw for non-object config', () => {
      // Assert
      expect(() => new DbLockService('invalid')).toThrow(InvalidArgumentError);
    });

    it('should throw for non-number defaultTimeout', () => {
      // Assert
      expect(() => new DbLockService({ defaultTimeout: 'invalid' })).toThrow(InvalidArgumentError);
    });
  });
});
