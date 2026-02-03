/**
 * CollectionCoordinator Modification Token Tests
 *
 * Tests for CollectionCoordinator modification token validation.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  setupCoordinatorTestEnvironment,
  createTestCollection,
  createTestCoordinator,
  simulateConflict
} from '../../helpers/collection-coordinator-test-helpers.js';

describe('CollectionCoordinator Modification Token', () => {
  let env;
  let collection;

  beforeEach(() => {
    env = setupCoordinatorTestEnvironment();
    ({ collection } = createTestCollection(env, 'coordinatorTest'));
  });

  describe('No Conflict', () => {
    it('should not throw when tokens match', () => {
      const localToken = collection._metadata.getModificationToken();

      env.masterIndex.updateCollectionMetadata('coordinatorTest', {
        modificationToken: localToken
      });

      const masterMeta = env.masterIndex.getCollection('coordinatorTest');
      const remoteToken = masterMeta ? masterMeta.getModificationToken() : null;

      const coordinator = createTestCoordinator(collection, env.masterIndex);

      expect(() => {
        coordinator.validateModificationToken(localToken, remoteToken);
      }).not.toThrow();
    });
  });

  describe('Conflict Detection', () => {
    it('should throw when tokens differ', () => {
      simulateConflict(env.masterIndex, 'coordinatorTest');

      const coordinator = createTestCoordinator(collection, env.masterIndex);

      const localToken = collection._metadata.getModificationToken();
      const masterMeta = env.masterIndex.getCollection('coordinatorTest');
      const remoteToken = masterMeta ? masterMeta.getModificationToken() : null;

      expect(() => {
        coordinator.validateModificationToken(localToken, remoteToken);
      }).toThrow(ErrorHandler.ErrorTypes.MODIFICATION_CONFLICT);
    });
  });
});
