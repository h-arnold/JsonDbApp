/**
 * DbLockService Script Lock Tests
 * 
 * Tests for script-level lock acquire and release operations.
 */

import { describe, it, expect } from 'vitest';

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
    it('should not throw when releasing without acquire', () => {
      const svc = new DbLockService();
      expect(() => svc.releaseScriptLock()).not.toThrow();
    });
  });

  describe('Invalid Timeout', () => {
    it('should throw for non-number timeout', () => {
      const svc = new DbLockService();
      expect(() => svc.acquireScriptLock('invalid')).toThrow();
    });

    it('should throw for negative timeout', () => {
      const svc = new DbLockService();
      expect(() => svc.acquireScriptLock(-1)).toThrow();
    });
  });
});
