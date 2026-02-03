/**
 * CollectionCoordinator Constructor Tests
 *
 * Tests for CollectionCoordinator constructor validation and configuration.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  setupCoordinatorTestEnvironment,
  createTestCollection,
  createTestCoordinator
} from '../../helpers/collection-coordinator-test-helpers.js';

describe('CollectionCoordinator Constructor', () => {
  let env;

  beforeEach(() => {
    env = setupCoordinatorTestEnvironment();
  });

  describe('Constructor Validation', () => {
    it('should throw InvalidArgumentError when dependencies are missing', () => {
      expect(() => {
        new CollectionCoordinator(null, null, null, null);
      }).toThrow(ErrorHandler.ErrorTypes.INVALID_ARGUMENT);
    });
  });

  describe('Valid Constructor', () => {
    let collection;

    beforeEach(() => {
      ({ collection } = createTestCollection(env, 'coordinatorTest'));
    });

    it('should create CollectionCoordinator with valid dependencies', () => {
      let coordinator;
      expect(() => {
        coordinator = createTestCoordinator(collection, env.masterIndex);
      }).not.toThrow();

      expect(coordinator).toBeDefined();
    });
  });

  describe('Configuration', () => {
    let collection;

    beforeEach(() => {
      ({ collection } = createTestCollection(env, 'coordinatorTest'));
    });

    it('should use default configuration values', () => {
      const coordinator = createTestCoordinator(collection, env.masterIndex);

      expect(coordinator._config.lockTimeout).toBe(30000);
      expect(coordinator._config.retryAttempts).toBe(3);
      expect(coordinator._config.retryDelayMs).toBe(1000);
    });

    it('should use custom configuration values', () => {
      const customConfig = {
        lockTimeout: 12345,
        retryAttempts: 7,
        retryDelayMs: 2222
      };

      const coordinator = createTestCoordinator(collection, env.masterIndex, customConfig);

      expect(coordinator._config.lockTimeout).toBe(12345);
      expect(coordinator._config.retryAttempts).toBe(7);
      expect(coordinator._config.retryDelayMs).toBe(2222);
    });
  });
});
