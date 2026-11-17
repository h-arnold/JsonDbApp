/**
 * CollectionCoordinator Lock Tests
 *
 * Tests for CollectionCoordinator.acquireOperationLock.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  setupCoordinatorTestEnvironment,
  createTestCollection,
  createTestCoordinator
} from '../../helpers/collection-coordinator-test-helpers.js';
import { createMockClock, sleepDurations } from '../../helpers/mock-time-helpers.js';

describe('CollectionCoordinator Acquire Operation Lock', () => {
  let env;
  let collection;

  beforeEach(() => {
    env = setupCoordinatorTestEnvironment();
    ({ collection } = createTestCollection(env, 'coordinatorTest'));
  });

  /**
   * Creates a CollectionCoordinator for the shared collection.
   * @param {Object} config - Optional coordinator configuration overrides.
   * @returns {CollectionCoordinator} Configured coordinator instance.
   */
  const createCoordinator = (config = {}) =>
    createTestCoordinator(collection, env.masterIndex, config);

  describe('Operation ID Validation', () => {
    it.each([
      { label: 'an empty operationId', operationId: '' },
      { label: 'a null operationId', operationId: null },
      { label: 'an undefined operationId', operationId: undefined }
    ])('should reject $label with InvalidArgumentError', ({ operationId }) => {
      const coordinator = createCoordinator();

      expect(() => {
        coordinator.acquireOperationLock(operationId);
      }).toThrow(ErrorHandler.ErrorTypes.INVALID_ARGUMENT);
    });
  });

  describe('Retry Success', () => {
    it('should successfully acquire lock with default configuration', () => {
      const coordinator = createCoordinator();

      expect(() => {
        coordinator.acquireOperationLock('test-op-id');
      }).not.toThrow();
    });
  });

  describe('Retry Failure', () => {
    it('should throw LOCK_ACQUISITION_FAILURE when lock already held', () => {
      const clock = createMockClock(1000);
      clock.mockUtilitiesSleep();
      try {
        env.masterIndex.acquireCollectionLock('coordinatorTest', 'existing-lock', 30000);

        const coordinator = createCoordinator({
          collectionLockLeaseMs: 500,
          coordinationTimeoutMs: 500,
          retryDelayMs: 50
        });

        expect(() => {
          coordinator.acquireOperationLock('test-op-id-2');
        }).toThrow(ErrorHandler.ErrorTypes.LOCK_ACQUISITION_FAILURE);
      } finally {
        clock.restore();
      }
    });

    it('should truncate the final backoff and fail at the acquisition deadline when the lock stays held', () => {
      const deadline = 1000 + 600;
      const clock = createMockClock(1000);
      const sleepSpy = clock.mockUtilitiesSleep();
      try {
        env.masterIndex.acquireCollectionLock('coordinatorTest', 'existing-lock', 1500);

        const coordinator = createCoordinator({
          collectionLockLeaseMs: 600,
          coordinationTimeoutMs: 600,
          retryDelayMs: 250,
          lockRetryBackoffBase: 2
        });

        expect(() => {
          coordinator.acquireOperationLock('test-op-id-3');
        }).toThrow(ErrorHandler.ErrorTypes.LOCK_ACQUISITION_FAILURE);

        expect(sleepDurations(sleepSpy)).toEqual([500, 100]);
        expect(Date.now()).toBeGreaterThanOrEqual(deadline);
      } finally {
        clock.restore();
      }
    });
  });
});
