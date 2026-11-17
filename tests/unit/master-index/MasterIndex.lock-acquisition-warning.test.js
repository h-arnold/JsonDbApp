/**
 * MasterIndex lock-acquisition contention warning tests.
 *
 * Pins the diagnostic context of the per-attempt warning emitted by the MasterIndex lock manager
 * when a collection lock is held by another operation, and keeps that warning distinct from the
 * coordinator's own end-of-window contention warning.
 */

/* global ErrorHandler */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  setupCoordinatorTestEnvironment,
  createTestCollection,
  createTestCoordinator
} from '../../helpers/collection-coordinator-test-helpers.js';
import { createMockClock } from '../../helpers/mock-time-helpers.js';

const COLLECTION_NAME = 'coordinatorTest';
const CONTENTION_WARNING = 'Failed to acquire lock; collection is already locked.';
const COORDINATOR_WARNING = 'Could not acquire lock after retries';

describe('MasterIndex lock acquisition warning', () => {
  let env;
  let collection;

  beforeEach(() => {
    env = setupCoordinatorTestEnvironment();
    ({ collection } = createTestCollection(env, COLLECTION_NAME));
  });

  it('should include lock holder and expiry detail in the per-attempt contention warning', () => {
    // Arrange — the held lock records lockedAt 1000, lockTimeout 5000 and expiry 6000.
    const clock = createMockClock(1000);
    clock.mockUtilitiesSleep();
    const masterWarnSpy = vi.spyOn(env.masterIndex._logger, 'warn');
    const coordinator = createTestCoordinator(collection, env.masterIndex, {
      collectionLockLeaseMs: 500,
      coordinationTimeoutMs: 500
    });
    const coordinatorWarnSpy = vi.spyOn(coordinator._logger, 'warn');

    try {
      env.masterIndex.acquireCollectionLock(COLLECTION_NAME, 'holder-op', 5000);

      // Act — the holder outlives the 500 ms acquisition window.
      expect(() => coordinator.acquireOperationLock('new-op')).toThrow(
        ErrorHandler.ErrorTypes.LOCK_ACQUISITION_FAILURE
      );

      // Assert — the warning fires once per attempt, so collect by message rather than position.
      const contentionWarnings = masterWarnSpy.mock.calls.filter(
        ([message]) => typeof message === 'string' && message.includes(CONTENTION_WARNING)
      );
      expect(contentionWarnings).toHaveLength(2);
      expect(contentionWarnings[0]).toBeDefined();
      expect(contentionWarnings[0][1]).toMatchObject({
        collection: COLLECTION_NAME,
        operationId: 'new-op',
        lockedBy: 'holder-op',
        lockedAt: 1000,
        lockTimeout: 5000,
        expiry: 6000,
        remainingMs: 5000
      });

      // The final attempt runs at t=1500, leaving 4500 ms on the held lock.
      expect(contentionWarnings[1]).toBeDefined();
      expect(contentionWarnings[1][1]).toMatchObject({
        collection: COLLECTION_NAME,
        operationId: 'new-op',
        remainingMs: 4500
      });

      // The coordinator's own end-of-window WARN is a separate record with a different shape.
      const coordinatorWarning = coordinatorWarnSpy.mock.calls.find(
        ([message]) => typeof message === 'string' && message.includes(COORDINATOR_WARNING)
      );
      expect(coordinatorWarning).toBeDefined();
      expect(coordinatorWarning[1]).toMatchObject({
        collection: COLLECTION_NAME,
        operationId: 'new-op'
      });
      expect(coordinatorWarning[1]).not.toHaveProperty('collectionName');
    } finally {
      masterWarnSpy.mockRestore();
      coordinatorWarnSpy.mockRestore();
      clock.restore();
    }
  });
});
