/**
 * CollectionCoordinator Lock Release and Timeout Tests
 *
 * Tests for CollectionCoordinator lock release and timeout behaviour.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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

  // Defensive catch-all: any spy not explicitly restored in a per-test finally
  // block is reverted here so it cannot leak into other suites.
  afterEach(() => {
    vi.restoreAllMocks();
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

  it('should include the failure message when logging a swallowed lock release failure', () => {
    // Arrange — the deliberate swallow keeps the operation result intact, but the
    // diagnostic log must carry the underlying error detail.
    const coordinator = createCoordinator();
    const releaseSpy = vi.spyOn(env.masterIndex, 'releaseCollectionLock').mockImplementation(() => {
      throw new Error('release exploded');
    });
    const errorSpy = vi.spyOn(coordinator._logger, 'error');

    try {
      // Act
      const result = coordinator.coordinate('releaseFailureOperation', () => 'done');

      // Assert
      expect(result).toBe('done');
      expect(errorSpy).toHaveBeenCalledWith(
        'Lock release failed',
        expect.objectContaining({ error: 'release exploded' })
      );
    } finally {
      releaseSpy.mockRestore();
      errorSpy.mockRestore();
    }
  });

  it('should throw timeout error for operations exceeding coordinationTimeoutMs', () => {
    // Arrange — an over-budget callback must still finalise metadata before the timeout throws,
    // and the thrown error must identify the post-operation overrun site.
    const coordinator = createCoordinator({
      collectionLockLeaseMs: 800,
      coordinationTimeoutMs: 500
    });
    const metadataSpy = vi.spyOn(env.masterIndex, 'updateCollectionMetadata');
    const clock = createMockClock(1000);
    let caught;
    /**
     * Runs the over-budget operation, recording the thrown error before rethrowing it.
     * @returns {void}
     * @throws {*} Whatever coordinate() throws, rethrown unchanged.
     */
    const act = () => {
      try {
        coordinator.coordinate('longOperation', () => {
          clock.advanceTime(600);
          return 'should not reach here';
        });
      } catch (error) {
        caught = error;
        throw error;
      }
    };

    try {
      // Act + Assert
      expect(act).toThrow(ErrorHandler.ErrorTypes.COORDINATION_TIMEOUT);
      expect(caught.context.reason).toBe('post-operation-overrun');
      expect(metadataSpy).toHaveBeenCalled();
    } finally {
      clock.restore();
      metadataSpy.mockRestore();
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
