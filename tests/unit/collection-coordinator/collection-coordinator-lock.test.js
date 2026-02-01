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

  beforeEach(() => {
    env = setupCoordinatorTestEnvironment();
  });

  describe('Retry Success', () => {
    it('should successfully acquire lock with default configuration', () => {
      const { collection } = createTestCollection(env, 'coordinatorTest');
      const coordinator = createTestCoordinator(collection, env.masterIndex);
      
      expect(() => {
        coordinator.acquireOperationLock('test-op-id');
      }).not.toThrow();
    });
  });

  describe('Retry Failure', () => {
    it('should throw LOCK_ACQUISITION_FAILURE when lock already held', () => {
      const { collection } = createTestCollection(env, 'coordinatorTest');
      
      env.masterIndex.acquireCollectionLock('coordinatorTest', 'existing-lock', 30000);
      
      const aggressiveConfig = {
        lockTimeout: 500,
        retryAttempts: 2,
        retryDelayMs: 50
      };
      
      const coordinator = createTestCoordinator(collection, env.masterIndex, aggressiveConfig);
      
      expect(() => {
        coordinator.acquireOperationLock('test-op-id-2');
      }).toThrow(ErrorHandler.ErrorTypes.LOCK_ACQUISITION_FAILURE);
    });
  });
});
