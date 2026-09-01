/**
 * CollectionCoordinator pre-flight budget check and lock-acquisition reason tests.
 *
 * Asserts the pre-flight coordination budget check (throw site 1) surfaces as a
 * CoordinationTimeoutError carrying the reason 'preflight-budget-exhausted' and never
 * invokes the callback, and that a failed lock acquisition (throw site 0) is mapped to
 * a CoordinationTimeoutError carrying the distinct reason 'lock-acquisition-timeout'.
 * The suite is intentionally separate from the pinned lock-release suite so it cannot
 * disturb those invariants.
 */

/* global ErrorHandler */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  setupCoordinatorTestEnvironment,
  createTestCollection,
  createTestCoordinator,
  resetCollectionState
} from '../../helpers/collection-coordinator-test-helpers.js';
import { createMockClock } from '../../helpers/mock-time-helpers.js';

describe('CollectionCoordinator pre-flight budget check', () => {
  let env;
  let collection;
  let fileId;

  beforeEach(() => {
    env = setupCoordinatorTestEnvironment();
    ({ collection, fileId } = createTestCollection(env, 'coordinatorTest'));
    resetCollectionState(collection, fileId);
  });

  // The coordinator helper already registers cleanupCoordinatorTests via its own afterEach.
  // Restore any spies we add so the Date.now mock and method spies do not leak across suites.
  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Builds a CollectionCoordinator for the shared test collection.
   * @param {Object} config - Optional configuration overrides.
   * @returns {Object} Coordinator instance ready for tests.
   */
  const createCoordinator = (config = {}) =>
    createTestCoordinator(collection, env.masterIndex, config);

  it('throws CoordinationTimeoutError with the pre-flight reason and never invokes the callback when the budget is exhausted before the callback', () => {
    // Arrange — budget is 500 ms; a spied conflict-resolution step burns 501 ms.
    const coordinator = createCoordinator({
      collectionLockLeaseMs: 800,
      coordinationTimeoutMs: 500
    });
    const clock = createMockClock(1000);
    vi.spyOn(coordinator, '_resolveConflictsIfPresent').mockImplementation((collectionName) => {
      clock.advanceTime(501);
    });
    const cb = vi.fn(() => 'should-not-run');

    // Act — capture the thrown error so we can inspect its context.
    let caught;
    try {
      coordinator.coordinate('op', cb);
    } catch (e) {
      caught = e;
    } finally {
      clock.restore();
    }

    // Assert — the pre-flight violation must surface as a CoordinationTimeoutError carrying
    // the exact pre-flight reason, the callback must never have run, and the lock must be freed.
    expect(caught).toBeInstanceOf(ErrorHandler.ErrorTypes.COORDINATION_TIMEOUT);
    expect(caught.context?.reason).toBe('preflight-budget-exhausted');
    expect(cb).toHaveBeenCalledTimes(0);
    expect(env.masterIndex.isCollectionLocked('coordinatorTest')).toBe(false);
  });

  it('invokes the callback and returns its result when the budget is not exhausted before the callback', () => {
    // Arrange — budget is 500 ms; conflict resolution burns only 100 ms (within budget).
    const coordinator = createCoordinator({
      collectionLockLeaseMs: 800,
      coordinationTimeoutMs: 500
    });
    const clock = createMockClock(1000);
    vi.spyOn(coordinator, '_resolveConflictsIfPresent').mockImplementation((collectionName) => {
      clock.advanceTime(100);
    });
    const cb = vi.fn(() => 'ok-result');

    // Act
    let result;
    try {
      result = coordinator.coordinate('op', cb);
    } finally {
      clock.restore();
    }

    // Assert — guards against over-blocking: the callback runs exactly once and its value returns.
    expect(result).toBe('ok-result');
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it('attaches the exact lock-acquisition reason to CoordinationTimeoutError when lock acquisition times out', () => {
    // Arrange — force the master index to reject lock acquisition with a LOCK_TIMEOUT, which
    // bypasses the retry loop and surfaces as a CoordinationTimeoutError in the mapping.
    const coordinator = createCoordinator({
      collectionLockLeaseMs: 800,
      coordinationTimeoutMs: 500
    });
    vi.spyOn(env.masterIndex, 'acquireCollectionLock').mockImplementation(() => {
      throw new ErrorHandler.ErrorTypes.LOCK_TIMEOUT('coordinatorTest', 800);
    });

    // Act
    let caught;
    try {
      coordinator.coordinate('op', () => 'x');
    } catch (e) {
      caught = e;
    }

    // Assert — the lock-acquisition site must carry its distinct reason and the operation name.
    expect(caught).toBeInstanceOf(ErrorHandler.ErrorTypes.COORDINATION_TIMEOUT);
    expect(caught.context?.reason).toBe('lock-acquisition-timeout');
    expect(caught.context?.operation).toBe('op');
  });
});
