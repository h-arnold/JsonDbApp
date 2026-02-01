/**
 * DbLockService Timeout Tests
 * 
 * Tests for script-level lock timeout error handling.
 */

import { describe, it, expect } from 'vitest';
import '../../setup/gas-mocks.setup.js';

const { DbLockService, LockTimeoutError } = globalThis;

describe('DbLockService Script Lock Timeout', () => {
  describe('Timeout Error', () => {
    it('should throw LOCK_TIMEOUT when waitLock fails', () => {
      const svc = new DbLockService();
      
      /** Stub to simulate lock timeout */
      svc._acquireScriptLockInstance = function() {
        this._scriptLock = {
          /** Simulates timeout error */
          waitLock: function() { throw new Error('simulated timeout'); },
          /** Mock release function */
          releaseLock: function() {}
        };
      };

      expect(() => svc.acquireScriptLock(10)).toThrow(LockTimeoutError);
    });
  });
});
