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
      env.masterIndex.acquireCollectionLock('coordinatorTest', 'existing-lock', 30000);

      const coordinator = createCoordinator({
        lockTimeout: 500,
        retryAttempts: 2,
        retryDelayMs: 50
      });

      expect(() => {
        coordinator.acquireOperationLock('test-op-id-2');
      }).toThrow(ErrorHandler.ErrorTypes.LOCK_ACQUISITION_FAILURE);
    });
  });
});
