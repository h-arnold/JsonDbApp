/**
 * CollectionCoordinator Conflict Resolution Tests
 * 
 * Tests for CollectionCoordinator conflict resolution behaviour.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  setupCoordinatorTestEnvironment,
  createTestCollection,
  createTestCoordinator,
  resetCollectionState,
  simulateConflict
} from '../../helpers/collection-coordinator-test-helpers.js';

describe('CollectionCoordinator Conflict Resolution', () => {
  let env;
  let collection;
  let fileId;

  beforeEach(() => {
    env = setupCoordinatorTestEnvironment();
    ({ collection, fileId } = createTestCollection(env, 'coordinatorTest'));
    resetCollectionState(collection, fileId);
  });

  it('should resolve conflict using reload strategy', () => {
    simulateConflict(env.masterIndex, 'coordinatorTest');
    
    const coordinator = createTestCoordinator(collection, env.masterIndex);
    
    expect(() => {
      coordinator.resolveConflict();
    }).not.toThrow();
  });
});
