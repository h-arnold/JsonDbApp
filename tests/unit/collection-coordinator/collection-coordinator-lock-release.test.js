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
  let collection;
  let fileId;

  beforeEach(() => {
    env = setupCoordinatorTestEnvironment();
    ({ collection, fileId } = createTestCollection(env, 'coordinatorTest'));
    resetCollectionState(collection, fileId);
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

  it('should throw timeout error for operations exceeding lockTimeout', () => {
    const coordinator = createCoordinator({
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
