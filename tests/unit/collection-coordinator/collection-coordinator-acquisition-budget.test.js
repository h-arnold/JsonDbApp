/**
 * CollectionCoordinator coordination-budget ownership tests.
 *
 * Pins the contract that lock-acquisition wait sits outside the coordination budget: the budget
 * clock starts after acquisition, while the pre-flight verdict, post-callback overrun verdict,
 * reason codes, overrun logging and acquisition-failure routing stay unchanged.
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

const COLLECTION_NAME = 'coordinatorTest';
const CALLBACK_RESULT = 'callback-result';
const PREFLIGHT_BUDGET_EXHAUSTED_REASON = 'preflight-budget-exhausted';
const POST_OPERATION_OVERRUN_REASON = 'post-operation-overrun';
const LOCK_ACQUISITION_TIMEOUT_REASON = 'lock-acquisition-timeout';
const OVERRUN_LOG_FRAGMENT = 'exceeded the coordination budget';

describe('CollectionCoordinator acquisition budget', () => {
  let env;
  let collection;
  let fileId;

  beforeEach(() => {
    env = setupCoordinatorTestEnvironment();
    ({ collection, fileId } = createTestCollection(env, COLLECTION_NAME));
    resetCollectionState(collection, fileId);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Builds a CollectionCoordinator for the shared test collection.
   * @param {Object} config - Configuration overrides.
   * @returns {Object} Coordinator instance ready for tests.
   */
  const createCoordinator = (config = {}) =>
    createTestCoordinator(collection, env.masterIndex, config);

  /**
   * Runs a coordinated operation whose callback consumes mocked time.
   * @param {Object} coordinator - Coordinator under test.
   * @param {string} operationName - Operation name passed to coordinate().
   * @param {Object} clock - Mock clock supplied by createMockClock().
   * @param {number} advanceMs - Milliseconds consumed by the callback.
   * @returns {{result: *, caught: *, callback: Object}} Outcome plus the callback spy.
   */
  const runCoordinated = (coordinator, operationName, clock, advanceMs) => {
    const callback = vi.fn(() => {
      clock.advanceTime(advanceMs);
      return CALLBACK_RESULT;
    });
    const outcome = { result: undefined, caught: undefined, callback };
    try {
      outcome.result = coordinator.coordinate(operationName, callback);
    } catch (error) {
      outcome.caught = error;
    }
    return outcome;
  };

  it('returns the callback result when a slow acquisition waits outside the coordination budget', () => {
    // Arrange — clock 1000; a holder lock with a 600 ms timeout expires at 1600. Two 500 ms
    // backoffs (retryDelayMs is floored) carry acquisition to 2000, past the 500 ms budget.
    const clock = createMockClock(1000);
    clock.mockUtilitiesSleep();
    const coordinator = createCoordinator({
      collectionLockLeaseMs: 1200,
      coordinationTimeoutMs: 500,
      retryDelayMs: 100,
      lockRetryBackoffBase: 2
    });
    let outcome;
    try {
      env.masterIndex.acquireCollectionLock(COLLECTION_NAME, 'holder', 600);
      outcome = runCoordinated(coordinator, 'slowAcquisition', clock, 100);
    } finally {
      clock.restore();
    }

    // Assert — only the 100 ms spent inside the callback may count against the budget.
    expect(outcome.caught).toBeUndefined();
    expect(outcome.result).toBe(CALLBACK_RESULT);
    expect(outcome.callback).toHaveBeenCalledTimes(1);
  });

  it('throws the pre-flight CoordinationTimeoutError when conflict resolution exhausts the post-acquisition budget', () => {
    // Arrange — acquisition succeeds instantly; the conflict-resolution step burns 501 ms.
    const coordinator = createCoordinator({
      collectionLockLeaseMs: 1200,
      coordinationTimeoutMs: 500,
      retryDelayMs: 100
    });
    const clock = createMockClock(1000);
    vi.spyOn(env.masterIndex, 'acquireCollectionLock').mockReturnValue(true);
    vi.spyOn(coordinator, '_resolveConflictsIfPresent').mockImplementation(() => {
      clock.advanceTime(501);
    });
    let outcome;
    try {
      outcome = runCoordinated(coordinator, 'preflightExhausted', clock, 0);
    } finally {
      clock.restore();
    }

    // Assert — the pre-flight site must still throw before any operation effects occur.
    expect(outcome.caught).toBeInstanceOf(ErrorHandler.ErrorTypes.COORDINATION_TIMEOUT);
    expect(outcome.caught.context.reason).toBe(PREFLIGHT_BUDGET_EXHAUSTED_REASON);
    expect(outcome.callback).toHaveBeenCalledTimes(0);
  });

  it('throws the post-operation-overrun CoordinationTimeoutError after finalising metadata when the callback exceeds the budget', () => {
    // Arrange — acquisition is instant; the callback alone burns 501 ms of a 500 ms budget.
    const coordinator = createCoordinator({
      collectionLockLeaseMs: 1200,
      coordinationTimeoutMs: 500,
      retryDelayMs: 100
    });
    const clock = createMockClock(1000);
    vi.spyOn(env.masterIndex, 'acquireCollectionLock').mockReturnValue(true);
    const metadataSpy = vi.spyOn(env.masterIndex, 'updateCollectionMetadata');
    let outcome;
    try {
      outcome = runCoordinated(coordinator, 'postOperationOverrun', clock, 501);
    } finally {
      clock.restore();
    }

    // Assert — the effects were applied and finalised before the primary timeout propagates.
    expect(outcome.caught).toBeInstanceOf(ErrorHandler.ErrorTypes.COORDINATION_TIMEOUT);
    expect(outcome.caught.context.reason).toBe(POST_OPERATION_OVERRUN_REASON);
    expect(metadataSpy).toHaveBeenCalled();
    expect(outcome.callback).toHaveBeenCalledTimes(1);
  });

  it('maps a LOCK_TIMEOUT thrown during acquisition to the lock-acquisition-timeout CoordinationTimeoutError', () => {
    // Arrange — the backend rejects the first acquisition attempt with a lock timeout.
    const leaseMs = 1200;
    const coordinator = createCoordinator({
      collectionLockLeaseMs: leaseMs,
      coordinationTimeoutMs: 500,
      retryDelayMs: 100
    });
    vi.spyOn(env.masterIndex, 'acquireCollectionLock').mockImplementation(() => {
      throw new ErrorHandler.ErrorTypes.LOCK_TIMEOUT(COLLECTION_NAME, leaseMs);
    });
    const callback = vi.fn(() => CALLBACK_RESULT);
    let caught;
    try {
      coordinator.coordinate('lockAcquisitionTimeout', callback);
    } catch (error) {
      caught = error;
    }

    // Assert — site 0 keeps its distinct reason and the callback never runs.
    expect(caught).toBeInstanceOf(ErrorHandler.ErrorTypes.COORDINATION_TIMEOUT);
    expect(caught.context.reason).toBe(LOCK_ACQUISITION_TIMEOUT_REASON);
    expect(callback).toHaveBeenCalledTimes(0);
  });

  it('logs an overrun elapsedMs measured after acquisition rather than from operation start', () => {
    // Arrange — the same slow-acquisition fixture, with a 600 ms callback overrun.
    const clock = createMockClock(1000);
    clock.mockUtilitiesSleep();
    const coordinator = createCoordinator({
      collectionLockLeaseMs: 1200,
      coordinationTimeoutMs: 500,
      retryDelayMs: 100,
      lockRetryBackoffBase: 2
    });
    const errorSpy = vi.spyOn(coordinator._logger, 'error');
    let outcome;
    try {
      env.masterIndex.acquireCollectionLock(COLLECTION_NAME, 'holder', 600);
      outcome = runCoordinated(coordinator, 'slowAcquisitionOverrun', clock, 600);
    } finally {
      clock.restore();
    }

    // Assert — the logged elapsed time must reflect the post-acquisition window (~600 ms),
    // not the wall clock since operation entry (~1600 ms). The range is deliberately tolerant.
    expect(outcome.caught).toBeInstanceOf(ErrorHandler.ErrorTypes.COORDINATION_TIMEOUT);
    expect(outcome.caught.context.reason).toBe(POST_OPERATION_OVERRUN_REASON);
    const overrunRecord = errorSpy.mock.calls.find(
      ([message]) => typeof message === 'string' && message.includes(OVERRUN_LOG_FRAGMENT)
    );
    expect(overrunRecord).toBeDefined();
    expect(overrunRecord[1].elapsedMs).toBeGreaterThanOrEqual(500);
    expect(overrunRecord[1].elapsedMs).toBeLessThanOrEqual(800);
  });

  it('routes a fully held acquisition to LockAcquisitionFailureError rather than the pre-flight timeout', () => {
    // Arrange — the holder outlives the 2000 ms acquisition window, so no attempt can succeed.
    const clock = createMockClock(1000);
    clock.mockUtilitiesSleep();
    let outcome;
    try {
      env.masterIndex.acquireCollectionLock(COLLECTION_NAME, 'holder', 10000);
      const coordinator = createCoordinator({
        collectionLockLeaseMs: 2000,
        coordinationTimeoutMs: 500,
        retryDelayMs: 1000,
        lockRetryBackoffBase: 2
      });
      outcome = runCoordinated(coordinator, 'fullyHeld', clock, 0);
    } finally {
      clock.restore();
    }

    // Assert — deadline exhaustion is an acquisition failure, never a site-1 budget verdict.
    expect(outcome.caught).toBeInstanceOf(ErrorHandler.ErrorTypes.LOCK_ACQUISITION_FAILURE);
    expect(outcome.caught).not.toBeInstanceOf(ErrorHandler.ErrorTypes.COORDINATION_TIMEOUT);
    expect(outcome.caught.context.reason).not.toBe(PREFLIGHT_BUDGET_EXHAUSTED_REASON);
  });
});
