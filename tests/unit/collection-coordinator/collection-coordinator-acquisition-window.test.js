/**
 * CollectionCoordinator Acquisition Window Tests
 *
 * Tests for the deadline-based lock acquisition contract of
 * CollectionCoordinator.acquireOperationLock.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  setupCoordinatorTestEnvironment,
  createTestCollection,
  createTestCoordinator
} from '../../helpers/collection-coordinator-test-helpers.js';
import { createMockClock, sleepDurations } from '../../helpers/mock-time-helpers.js';

describe('CollectionCoordinator Acquisition Window', () => {
  let env;
  let collection;
  const collectionName = 'coordinatorTest';

  beforeEach(() => {
    env = setupCoordinatorTestEnvironment();
    ({ collection } = createTestCollection(env, collectionName));
  });

  /**
   * Creates a CollectionCoordinator for the shared collection.
   * @param {Object} config - Optional coordinator configuration overrides.
   * @returns {CollectionCoordinator} Configured coordinator instance.
   */
  const createCoordinator = (config = {}) =>
    createTestCoordinator(collection, env.masterIndex, config);

  it('should acquire a lock that is released just inside the acquisition window', () => {
    const clock = createMockClock(1000);
    clock.mockUtilitiesSleep();
    try {
      env.masterIndex.acquireCollectionLock(collectionName, 'holder', 3000);

      const coordinator = createCoordinator({
        collectionLockLeaseMs: 5000,
        coordinationTimeoutMs: 5000,
        retryDelayMs: 1000,
        lockRetryBackoffBase: 2
      });

      let acquiredAt = null;
      expect(() => {
        acquiredAt = coordinator.acquireOperationLock('test-op-id-released-inside');
      }).not.toThrow();
      expect(acquiredAt).toBe(4000);
    } finally {
      clock.restore();
    }
  });

  it('should fail once at the deadline when the lock is held for the whole window', () => {
    const deadline = 1000 + 5000;
    const clock = createMockClock(1000);
    const sleepSpy = clock.mockUtilitiesSleep();
    try {
      env.masterIndex.acquireCollectionLock(collectionName, 'holder', 10000);

      const coordinator = createCoordinator({
        collectionLockLeaseMs: 5000,
        coordinationTimeoutMs: 5000,
        retryDelayMs: 1000,
        lockRetryBackoffBase: 2
      });
      const warnSpy = vi.spyOn(coordinator._logger, 'warn');

      let thrown = null;
      try {
        coordinator.acquireOperationLock('test-op-id-held-whole-window');
      } catch (error) {
        thrown = error;
      }

      expect(thrown).toBeInstanceOf(ErrorHandler.ErrorTypes.LOCK_ACQUISITION_FAILURE);
      expect(Date.now()).toBeGreaterThanOrEqual(deadline);
      expect(sleepDurations(sleepSpy)).toEqual([1000, 2000, 2000]);

      const contentionWarnings = warnSpy.mock.calls.filter(
        ([message]) =>
          typeof message === 'string' && message.includes('Could not acquire lock after retries')
      );
      expect(contentionWarnings).toHaveLength(1);
      expect(contentionWarnings[0][1]).toMatchObject({
        collection: collectionName,
        operationId: 'test-op-id-held-whole-window'
      });
    } finally {
      clock.restore();
    }
  });

  it('should acquire a stale lock on the first attempt without sleeping', () => {
    const clock = createMockClock(1000);
    const sleepSpy = clock.mockUtilitiesSleep();
    try {
      env.masterIndex.acquireCollectionLock(collectionName, 'holder', 100);
      clock.advanceTime(200);

      const coordinator = createCoordinator({
        collectionLockLeaseMs: 2000,
        coordinationTimeoutMs: 2000,
        retryDelayMs: 1000
      });

      expect(() => {
        coordinator.acquireOperationLock('test-op-id-stale');
      }).not.toThrow();
      expect(sleepSpy).not.toHaveBeenCalled();
    } finally {
      clock.restore();
    }
  });

  it('should use retryDelayMs as the first backoff when it is above the floor', () => {
    const clock = createMockClock(1000);
    const sleepSpy = clock.mockUtilitiesSleep();
    try {
      env.masterIndex.acquireCollectionLock(collectionName, 'holder', 10000);

      const coordinator = createCoordinator({
        collectionLockLeaseMs: 5000,
        coordinationTimeoutMs: 5000,
        retryDelayMs: 1000,
        lockRetryBackoffBase: 2
      });

      expect(() => {
        coordinator.acquireOperationLock('test-op-id-first-backoff');
      }).toThrow(ErrorHandler.ErrorTypes.LOCK_ACQUISITION_FAILURE);

      expect(sleepSpy).toHaveBeenCalled();
      expect(sleepSpy.mock.calls[0][0]).toBe(1000);
    } finally {
      clock.restore();
    }
  });

  it('should apply the minimum backoff floor when retryDelayMs is zero', () => {
    const clock = createMockClock(1000);
    const sleepSpy = clock.mockUtilitiesSleep();
    try {
      env.masterIndex.acquireCollectionLock(collectionName, 'holder', 5000);

      const coordinator = createCoordinator({
        collectionLockLeaseMs: 2000,
        coordinationTimeoutMs: 2000,
        retryDelayMs: 0,
        lockRetryBackoffBase: 2
      });

      expect(() => {
        coordinator.acquireOperationLock('test-op-id-floor');
      }).toThrow(ErrorHandler.ErrorTypes.LOCK_ACQUISITION_FAILURE);

      const durations = sleepDurations(sleepSpy);
      expect(durations.length).toBeGreaterThan(0);
      expect(durations.length).toBeLessThanOrEqual(5);
      expect(durations.every((milliseconds) => milliseconds === 500)).toBe(true);
    } finally {
      clock.restore();
    }
  });

  it('should cap the backoff at 5000 ms and never sleep beyond the cap', () => {
    const clock = createMockClock(1000);
    const sleepSpy = clock.mockUtilitiesSleep();
    try {
      env.masterIndex.acquireCollectionLock(collectionName, 'holder', 60000);

      const coordinator = createCoordinator({
        collectionLockLeaseMs: 30000,
        coordinationTimeoutMs: 30000,
        retryDelayMs: 4000,
        lockRetryBackoffBase: 2
      });

      expect(() => {
        coordinator.acquireOperationLock('test-op-id-cap');
      }).toThrow(ErrorHandler.ErrorTypes.LOCK_ACQUISITION_FAILURE);

      const durations = sleepDurations(sleepSpy);
      expect(durations.every((milliseconds) => milliseconds <= 5000)).toBe(true);
      expect(durations).toContain(5000);
    } finally {
      clock.restore();
    }
  });

  it('should succeed on the final attempt when the held lock expires during the last truncated sleep', () => {
    const clock = createMockClock(1000);
    clock.mockUtilitiesSleep();
    try {
      env.masterIndex.acquireCollectionLock(collectionName, 'holder', 900);

      const coordinator = createCoordinator({
        collectionLockLeaseMs: 1000,
        coordinationTimeoutMs: 1000,
        retryDelayMs: 700,
        lockRetryBackoffBase: 2
      });

      let acquiredAt = null;
      expect(() => {
        acquiredAt = coordinator.acquireOperationLock('test-op-id-final-attempt');
      }).not.toThrow();
      expect(acquiredAt).toBe(2000);
    } finally {
      clock.restore();
    }
  });

  it('should ignore retryAttempts and keep retrying until the acquisition deadline', () => {
    const deadline = 1000 + 1000;
    const clock = createMockClock(1000);
    const sleepSpy = clock.mockUtilitiesSleep();
    try {
      env.masterIndex.acquireCollectionLock(collectionName, 'holder', 5000);

      const coordinator = createCoordinator({
        collectionLockLeaseMs: 1000,
        coordinationTimeoutMs: 1000,
        retryAttempts: 1,
        retryDelayMs: 250,
        lockRetryBackoffBase: 2
      });

      expect(() => {
        coordinator.acquireOperationLock('test-op-id-retry-attempts-ignored');
      }).toThrow(ErrorHandler.ErrorTypes.LOCK_ACQUISITION_FAILURE);

      expect(sleepDurations(sleepSpy)).toEqual([500, 500]);
      expect(Date.now()).toBeGreaterThanOrEqual(deadline);
    } finally {
      clock.restore();
    }
  });

  it('should rethrow unexpected acquisition errors unchanged without sleeping', () => {
    const clock = createMockClock(1000);
    const sleepSpy = clock.mockUtilitiesSleep();
    try {
      const coordinator = createCoordinator({
        collectionLockLeaseMs: 2000,
        coordinationTimeoutMs: 2000,
        retryDelayMs: 1000
      });
      const unexpectedError = new Error('unexpected lock backend failure');
      vi.spyOn(env.masterIndex, 'acquireCollectionLock').mockImplementation(() => {
        throw unexpectedError;
      });
      const errorSpy = vi.spyOn(coordinator._logger, 'error');

      let thrown = null;
      try {
        coordinator.acquireOperationLock('test-op-id-unexpected-error');
      } catch (error) {
        thrown = error;
      }

      expect(thrown).toBe(unexpectedError);
      expect(sleepSpy).not.toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalledTimes(0);
    } finally {
      clock.restore();
    }
  });
});
