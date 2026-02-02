/**
 * CollectionCoordinator Update Master Index Tests
 * 
 * Tests for CollectionCoordinator.updateMasterIndexMetadata.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  setupCoordinatorTestEnvironment,
  createTestCollection,
  createTestCoordinator,
  resetCollectionState
} from '../../helpers/collection-coordinator-test-helpers.js';

describe('CollectionCoordinator Update Master Index Metadata', () => {
  let env;
  let collection;
  let fileId;
  let coordinator;

  beforeEach(() => {
    env = setupCoordinatorTestEnvironment();
    ({ collection, fileId } = createTestCollection(env, 'coordinatorTest'));
    resetCollectionState(collection, fileId);
    coordinator = createTestCoordinator(collection, env.masterIndex);
  });

  it('should update master index metadata without throwing', () => {
    expect(() => {
      coordinator.updateMasterIndexMetadata();
    }).not.toThrow();
    
    const updatedCollections = Object.keys(env.masterIndex.getCollections());
    expect(updatedCollections).toContain('coordinatorTest');
  });
});
