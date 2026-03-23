/**
 * CollectionCoordinator Lock Release and Timeout Tests
 *
 * Tests for CollectionCoordinator lock release and timeout behaviour.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  setupCoordinatorTestEnvironment,
  createTestCollection,
  createTestCoordinator,
  resetCollectionState
} from '../../helpers/collection-coordinator-test-helpers.js';
import { createMockClock } from '../../helpers/mock-time-helpers.js';

describe('CollectionCoordinator Lock Release and Timeout', () => {
  let env;
  let collection;
  let fileId;

  beforeEach(() => {
    env = setupCoordinatorTestEnvironment();
    ({ collection, fileId } = createTestCollection(env, 'coordinatorTest'));
    resetCollectionState(collection, fileId);
  });

  /**
   * Creates a CollectionCoordinator for the shared test collection.
   * @param {Object} config - Optional configuration overrides.
   * @returns {CollectionCoordinator} Coordinator instance ready for tests.
   */
  const createCoordinator = (config = {}) =>
    createTestCoordinator(collection, env.masterIndex, config);

  it('should release lock when exception is thrown during coordination', () => {
    const coordinator = createCoordinator();

    expect(() => {
      coordinator.coordinate('testOperation', () => {
        throw new Error('test exception');
      });
    }).toThrow('test exception');
  });

  it('should throw timeout error for operations exceeding coordinationTimeoutMs', () => {
    const coordinator = createCoordinator({
      collectionLockLeaseMs: 800,
      coordinationTimeoutMs: 500
    });
    const clock = createMockClock(1000);
    try {
      expect(() => {
        coordinator.coordinate('longOperation', () => {
          clock.advanceTime(600);
          return 'should not reach here';
        });
      }).toThrow(ErrorHandler.ErrorTypes.COORDINATION_TIMEOUT);
    } finally {
      clock.restore();
    }
  });

  it('should keep the collection locked for a long-running write that stays within the lease', () => {
    const coordinator = createCoordinator({
      collectionLockLeaseMs: 1200,
      coordinationTimeoutMs: 1000
    });
    const clock = createMockClock(1000);
    try {
      const result = coordinator.coordinate('safeLongOperation', () => {
        clock.advanceTime(700);
        return env.masterIndex.isCollectionLocked('coordinatorTest');
      });

      expect(result).toBe(true);
      expect(env.masterIndex.isCollectionLocked('coordinatorTest')).toBe(false);
    } finally {
      clock.restore();
    }
  });

  it('should renew the lease before finalising a near-expiry write', () => {
    const renewSpy = vi.spyOn(env.masterIndex, 'renewCollectionLock');
    const coordinator = createCoordinator({
      collectionLockLeaseMs: 700,
      coordinationTimeoutMs: 600
    });
    const clock = createMockClock(1000);
    try {
      const result = coordinator.coordinate('renewedLongOperation', () => {
        clock.advanceTime(550);
        return 'renewed-result';
      });

      expect(result).toBe('renewed-result');
      expect(renewSpy).toHaveBeenCalledTimes(1);
      expect(renewSpy).toHaveBeenCalledWith('coordinatorTest', expect.any(String), 700);
      expect(env.masterIndex.isCollectionLocked('coordinatorTest')).toBe(false);
    } finally {
      clock.restore();
      renewSpy.mockRestore();
    }
  });
});
