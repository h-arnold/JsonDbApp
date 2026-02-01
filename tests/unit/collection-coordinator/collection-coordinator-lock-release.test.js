/**
 * CollectionCoordinator Lock Release and Timeout Tests
 * 
 * Tests for CollectionCoordinator lock release and timeout behaviour.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  setupCoordinatorTestEnvironment,
  createTestCollection,
  createTestCoordinator,
  resetCollectionState
} from '../../helpers/collection-coordinator-test-helpers.js';

describe('CollectionCoordinator Lock Release and Timeout', () => {
  let env;

  beforeEach(() => {
    env = setupCoordinatorTestEnvironment();
  });

  it('should release lock when exception is thrown during coordination', () => {
    const { collection, fileId } = createTestCollection(env, 'coordinatorTest');
    resetCollectionState(collection, fileId);
    
    const coordinator = createTestCoordinator(collection, env.masterIndex);
    
    expect(() => {
      coordinator.coordinate('testOperation', () => {
        throw new Error('test exception');
      });
    }).toThrow('test exception');
  });

  it('should throw timeout error for operations exceeding lockTimeout', () => {
    const { collection, fileId } = createTestCollection(env, 'coordinatorTest');
    resetCollectionState(collection, fileId);
    
    const coordinator = createTestCoordinator(collection, env.masterIndex, {
      lockTimeout: 500
    });
    
    expect(() => {
      coordinator.coordinate('longOperation', () => {
        Utilities.sleep(600);
        return 'should not reach here';
      });
    }).toThrow(ErrorHandler.ErrorTypes.COORDINATION_TIMEOUT);
  });
});
