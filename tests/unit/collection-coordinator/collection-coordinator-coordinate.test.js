/**
 * CollectionCoordinator Coordinate Tests
 * 
 * Tests for CollectionCoordinator.coordinate method.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  setupCoordinatorTestEnvironment,
  createTestCollection,
  createTestCoordinator,
  resetCollectionState,
  simulateConflict
} from '../../helpers/collection-coordinator-test-helpers.js';

describe('CollectionCoordinator Coordinate', () => {
  let env;
  let collection;
  let fileId;

  beforeEach(() => {
    env = setupCoordinatorTestEnvironment();
    const result = createTestCollection(env, 'coordinatorTest');
    collection = result.collection;
    fileId = result.fileId;
  });

  it('should execute callback and return result in happy path', () => {
    const coordinator = createTestCoordinator(collection, env.masterIndex);
    
    const result = coordinator.coordinate('insertOne', () => 'operation-result');
    
    expect(result).toBe('operation-result');
  });

  it('should resolve conflicts and complete operation', () => {
    resetCollectionState(collection, fileId);
    simulateConflict(env.masterIndex, 'coordinatorTest');
    
    const coordinator = createTestCoordinator(collection, env.masterIndex);
    
    const result = coordinator.coordinate('updateOne', () => 'conflict-resolved-result');
    
    expect(result).toBe('conflict-resolved-result');
  });
});
