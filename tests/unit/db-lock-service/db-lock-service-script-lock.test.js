/**
 * DbLockService Script Lock Tests
 * 
 * Tests for script-level lock acquire and release operations.
 */

import { describe, it, expect } from 'vitest';
import '../../setup/gas-mocks.setup.js';

const { DbLockService, InvalidArgumentError } = globalThis;

describe('DbLockService Script Lock Operations', () => {
  describe('Acquire and Release', () => {
    it('should acquire and release script lock without error', () => {
      const svc = new DbLockService();
      
      svc.acquireScriptLock(1000);
      expect(svc._scriptLock).toBeDefined();
      
      svc.releaseScriptLock();
      expect(svc._scriptLock).toBeNull();
    });
  });

  describe('Release Without Acquire', () => {
    it('should warn and return when releasing without acquire', () => {
      const svc = new DbLockService();
      expect(() => svc.releaseScriptLock()).not.toThrow();
      expect(svc._scriptLock).toBeNull();
    });
  });

  describe('Invalid Timeout', () => {
    it('should throw for non-number timeout', () => {
      const svc = new DbLockService();
      expect(() => svc.acquireScriptLock('invalid')).toThrow(InvalidArgumentError);
    });

    it('should throw for negative timeout', () => {
      const svc = new DbLockService();
      expect(() => svc.acquireScriptLock(-1)).toThrow(InvalidArgumentError);
    });
  });
});
