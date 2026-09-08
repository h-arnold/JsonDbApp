/**
 * CollectionCoordinator unified violation policy tests.
 *
 * Asserts the post-callback half of the coordination violation algorithm: a single budget verdict
 * taken after the callback; a non-throwing lease renewal followed by a single re-acquisition
 * attempt; finalise-or-skip of the collection metadata; and the two post-callback
 * CoordinationTimeoutError sites ('post-operation-overrun' and 'lease-not-recoverable') with their
 * reason values. Also verifies point-of-occurrence logging and operation-lock release on each path.
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

const CALLBACK_RESULT = 'callback-result';
const POST_OPERATION_OVERRUN_REASON = 'post-operation-overrun';
const LEASE_NOT_RECOVERABLE_REASON = 'lease-not-recoverable';
const BOUNDARY_FAILURE_FRAGMENT = ' failed';

describe('CollectionCoordinator unified violation policy', () => {
  const name = 'coordinatorTest';
  // Lease equals budget, so a callback overrunning the budget also overruns the lease.
  const violationConfig = { collectionLockLeaseMs: 700, coordinationTimeoutMs: 700 };
  let env;
  let collection;
  let fileId;

  beforeEach(() => {
    env = setupCoordinatorTestEnvironment();
    ({ collection, fileId } = createTestCollection(env, name));
    resetCollectionState(collection, fileId);
  });

  // Resource cleanup is registered by the coordinator helper itself; spies added here must be
  // restored so the Date.now mock and the master index stubs cannot leak into other suites.
  afterEach(() => {
    vi.restoreAllMocks();
  });

  /**
   * Builds a CollectionCoordinator for the shared test collection.
   * @param {Object} config - Configuration overrides for the coordinator.
   * @returns {Object} Coordinator instance ready for tests.
   */
  const createCoordinator = (config) => createTestCoordinator(collection, env.masterIndex, config);

  /**
   * Runs a coordinated operation whose callback consumes a controlled amount of mocked time.
   * @param {Object} coordinator - Coordinator under test.
   * @param {string} operationName - Operation name passed to coordinate().
   * @param {number} advanceMs - Milliseconds the callback consumes on the mocked clock.
   * @returns {{result: *, caught: *}} Returned value, or the captured error when one was thrown.
   */
  const runCoordinated = (coordinator, operationName, advanceMs) => {
    const clock = createMockClock(1000);
    const outcome = { result: undefined, caught: undefined };
    try {
      outcome.result = coordinator.coordinate(operationName, () => {
        clock.advanceTime(advanceMs);
        return CALLBACK_RESULT;
      });
    } catch (error) {
      outcome.caught = error;
    } finally {
      clock.restore();
    }
    return outcome;
  };

  /**
   * Forces the ownership step down the renewal-failure branch with a chosen re-acquisition result.
   * @param {Function} reacquire - Behaviour of the re-acquisition attempt (returns a boolean or throws).
   * @returns {{renewSpy: Object, acquireSpy: Object}} Spies for call-count assertions.
   */
  const stubRenewalFailure = (reacquire) => {
    const renewSpy = vi.spyOn(env.masterIndex, 'renewCollectionLock').mockReturnValue(false);
    let acquireCalls = 0;
    const acquireSpy = vi.spyOn(env.masterIndex, 'acquireCollectionLock').mockImplementation(() => {
      acquireCalls += 1;
      // The first call is coordinate()'s initial acquisition; later calls are re-acquisitions.
      return acquireCalls === 1 ? true : reacquire();
    });
    return { renewSpy, acquireSpy };
  };

  /**
   * Counts logger-spy records whose message contains the given fragment.
   * @param {Object} spy - Logger spy to inspect.
   * @param {string} fragment - Message fragment to match.
   * @returns {number} Number of matching records.
   */
  const countRecords = (spy, fragment) =>
    spy.mock.calls.filter(([message]) => typeof message === 'string' && message.includes(fragment))
      .length;

  /**
   * Asserts a logger spy captured a record whose message contains a fragment and whose context matches.
   * @param {Object} spy - Logger spy to inspect.
   * @param {string} fragment - Message fragment expected in the record.
   * @param {Object} expectedContext - Context properties expected on the record.
   * @returns {void}
   */
  const expectRecord = (spy, fragment, expectedContext) => {
    expect(spy).toHaveBeenCalledWith(
      expect.stringContaining(fragment),
      expect.objectContaining(expectedContext)
    );
  };

  /**
   * Asserts a captured error is a CoordinationTimeoutError carrying the expected throw-site reason.
   * @param {*} caught - Error captured from coordinate().
   * @param {string} reason - Exact reason value expected in the error context.
   * @returns {void}
   */
  const expectCoordinationTimeout = (caught, reason) => {
    expect(caught).toBeInstanceOf(ErrorHandler.ErrorTypes.COORDINATION_TIMEOUT);
    expect(caught.context.reason).toBe(reason);
  };

  it('swallows a finalisation failure on an over-budget path but still throws the post-operation-overrun CoordinationTimeoutError', () => {
    // Arrange — finalisation explodes after an over-budget callback; the secondary failure must
    // not mask the primary coordination timeout.
    const coordinator = createCoordinator(violationConfig);
    const errorSpy = vi.spyOn(coordinator._logger, 'error');
    vi.spyOn(env.masterIndex, 'updateCollectionMetadata').mockImplementation(() => {
      throw new Error('metadata write exploded');
    });

    // Act
    const { caught } = runCoordinated(coordinator, 'overBudgetFinalisationBreak', 750);

    // Assert
    expectCoordinationTimeout(caught, POST_OPERATION_OVERRUN_REASON);
    expectRecord(errorSpy, 'finalisation failed on a violation path', {
      collection: name,
      opId: expect.any(String),
      error: expect.any(String)
    });
  });

  it('finalises exactly once via re-acquisition when renewal fails but re-acquisition succeeds on an over-budget path', () => {
    // Arrange — renewal fails, one re-acquisition restores ownership.
    const coordinator = createCoordinator(violationConfig);
    const warnSpy = vi.spyOn(coordinator._logger, 'warn');
    const metadataSpy = vi.spyOn(env.masterIndex, 'updateCollectionMetadata');
    stubRenewalFailure(() => true);

    // Act
    const { caught } = runCoordinated(coordinator, 'overBudgetRestored', 750);

    // Assert
    expect(metadataSpy).toHaveBeenCalledTimes(1);
    expectRecord(warnSpy, 're-acquired for finalisation', {
      collection: name,
      opId: expect.any(String),
      outcome: 'recovered'
    });
    expectCoordinationTimeout(caught, POST_OPERATION_OVERRUN_REASON);
  });

  it('skips finalisation and throws lease-not-recoverable when renewal fails and re-acquisition returns false', () => {
    // Arrange — ownership is unrecoverable, so metadata must not be published.
    const coordinator = createCoordinator(violationConfig);
    const errorSpy = vi.spyOn(coordinator._logger, 'error');
    const metadataSpy = vi.spyOn(env.masterIndex, 'updateCollectionMetadata');
    stubRenewalFailure(() => false);

    // Act
    const { caught } = runCoordinated(coordinator, 'leaseLostRefused', 750);

    // Assert
    expect(metadataSpy).not.toHaveBeenCalled();
    expectRecord(errorSpy, 'finalisation skipped', {
      collection: name,
      opId: expect.any(String),
      operation: expect.any(String)
    });
    expectCoordinationTimeout(caught, LEASE_NOT_RECOVERABLE_REASON);
  });

  it('treats a thrown re-acquisition as lost-unrecoverable, identically to a false return', () => {
    // Arrange — a thrown re-acquisition (collection removed concurrently) is handled uniformly.
    const coordinator = createCoordinator(violationConfig);
    const errorSpy = vi.spyOn(coordinator._logger, 'error');
    const metadataSpy = vi.spyOn(env.masterIndex, 'updateCollectionMetadata');
    stubRenewalFailure(() => {
      throw new ErrorHandler.ErrorTypes.COLLECTION_NOT_FOUND(name);
    });

    // Act
    const { caught } = runCoordinated(coordinator, 'leaseLostThrown', 750);

    // Assert
    expect(metadataSpy).not.toHaveBeenCalled();
    expectRecord(errorSpy, 'finalisation skipped', {
      collection: name,
      opId: expect.any(String),
      operation: expect.any(String)
    });
    expectCoordinationTimeout(caught, LEASE_NOT_RECOVERABLE_REASON);
  });

  it('returns successfully when the lease is restored within budget, alongside the renewal-failure ERROR record', () => {
    // Arrange — renewal is due at 600 ms but the budget (700 ms) is intact, so recovery succeeds
    // and the operation must complete: an ERROR record may co-occur with a successful result.
    const coordinator = createCoordinator(violationConfig);
    const errorSpy = vi.spyOn(coordinator._logger, 'error');
    stubRenewalFailure(() => true);

    // Act
    const { result, caught } = runCoordinated(coordinator, 'withinBudgetRestored', 600);

    // Assert
    expect(caught).toBeUndefined();
    expect(result).toBe(CALLBACK_RESULT);
    expectRecord(errorSpy, 'lease expired before finalisation', {
      collection: name,
      opId: expect.any(String),
      leaseMs: 700
    });
  });

  it('emits the overrun record plus exactly one boundary failure record and no completion INFO when over budget', () => {
    // Arrange
    const coordinator = createCoordinator(violationConfig);
    const errorSpy = vi.spyOn(coordinator._logger, 'error');
    const infoSpy = vi.spyOn(coordinator._logger, 'info');

    // Act
    const { caught } = runCoordinated(coordinator, 'overBudgetLogging', 750);

    // Assert
    expectCoordinationTimeout(caught, POST_OPERATION_OVERRUN_REASON);
    expectRecord(errorSpy, 'exceeded the coordination budget', {
      collection: name,
      opId: expect.any(String),
      timeoutMs: 700,
      elapsedMs: expect.any(Number),
      finalisationOutcome: expect.stringMatching(/finalised|finalisation-failed/)
    });
    expect(countRecords(errorSpy, BOUNDARY_FAILURE_FRAGMENT)).toBe(1);
    expect(countRecords(infoSpy, 'complete')).toBe(0);
  });

  it('emits the renewal-failure and finalisation-skipped records plus exactly one boundary failure record when the lease is unrecoverable', () => {
    // Arrange
    const coordinator = createCoordinator(violationConfig);
    const errorSpy = vi.spyOn(coordinator._logger, 'error');
    const infoSpy = vi.spyOn(coordinator._logger, 'info');
    stubRenewalFailure(() => false);

    // Act
    const { caught } = runCoordinated(coordinator, 'leaseLostLogging', 750);

    // Assert
    expectCoordinationTimeout(caught, LEASE_NOT_RECOVERABLE_REASON);
    expectRecord(errorSpy, 'lease expired before finalisation', {
      collection: name,
      opId: expect.any(String),
      leaseMs: 700
    });
    expectRecord(errorSpy, 'finalisation skipped', {
      collection: name,
      opId: expect.any(String),
      operation: expect.any(String)
    });
    expect(countRecords(errorSpy, BOUNDARY_FAILURE_FRAGMENT)).toBe(1);
    expect(countRecords(errorSpy, 'exceeded the coordination budget')).toBe(0);
    expect(countRecords(infoSpy, 'complete')).toBe(0);
  });

  it('releases the operation lock on the post-operation-overrun path', () => {
    // Arrange
    const coordinator = createCoordinator(violationConfig);
    const releaseSpy = vi.spyOn(env.masterIndex, 'releaseCollectionLock');

    // Act
    const { caught } = runCoordinated(coordinator, 'overBudgetRelease', 750);

    // Assert
    expectCoordinationTimeout(caught, POST_OPERATION_OVERRUN_REASON);
    expect(releaseSpy).toHaveBeenCalledWith(name, expect.any(String));
    expect(env.masterIndex.isCollectionLocked(name)).toBe(false);
  });

  it('releases the operation lock on the lease-not-recoverable path', () => {
    // Arrange
    const coordinator = createCoordinator(violationConfig);
    const releaseSpy = vi.spyOn(env.masterIndex, 'releaseCollectionLock');
    stubRenewalFailure(() => false);

    // Act
    const { caught } = runCoordinated(coordinator, 'leaseLostRelease', 750);

    // Assert
    expectCoordinationTimeout(caught, LEASE_NOT_RECOVERABLE_REASON);
    expect(releaseSpy).toHaveBeenCalledWith(name, expect.any(String));
    expect(env.masterIndex.isCollectionLocked(name)).toBe(false);
  });
});
