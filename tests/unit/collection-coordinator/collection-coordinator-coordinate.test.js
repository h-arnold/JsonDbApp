/**
 * CollectionCoordinator Coordinate Tests
 *
 * Tests for CollectionCoordinator.coordinate method.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
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
    ({ collection, fileId } = createTestCollection(env, 'coordinatorTest'));
    resetCollectionState(collection, fileId);
  });

  it('should execute callback and return result in happy path', () => {
    const coordinator = createTestCoordinator(collection, env.masterIndex);

    const result = coordinator.coordinate('insertOne', () => 'operation-result');

    expect(result).toBe('operation-result');
  });

  it('should resolve conflicts and complete operation', () => {
    simulateConflict(env.masterIndex, 'coordinatorTest');

    const coordinator = createTestCoordinator(collection, env.masterIndex);

    const result = coordinator.coordinate('updateOne', () => 'conflict-resolved-result');

    expect(result).toBe('conflict-resolved-result');
  });

  it('should log completion at INFO only after a successful coordinated operation', () => {
    // Arrange
    const coordinator = createTestCoordinator(collection, env.masterIndex);
    const infoSpy = vi.spyOn(coordinator._logger, 'info');

    // Act
    const result = coordinator.coordinate('loggingHappyPath', () => 'ok');

    // Assert
    expect(result).toBe('ok');
    expect(infoSpy).toHaveBeenCalledTimes(1);
    expect(infoSpy.mock.calls[0][0]).toContain('Operation loggingHappyPath complete');
  });

  it('should not log completion when the coordinated operation fails', () => {
    // Arrange — failures are already reported by the boundary catch.
    const coordinator = createTestCoordinator(collection, env.masterIndex);
    const infoSpy = vi.spyOn(coordinator._logger, 'info');
    const errorSpy = vi.spyOn(coordinator._logger, 'error');

    // Act + Assert
    expect(() =>
      coordinator.coordinate('loggingFailurePath', () => {
        throw new Error('callback exploded');
      })
    ).toThrow('callback exploded');
    expect(infoSpy).not.toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(
      'Operation loggingFailurePath failed',
      expect.objectContaining({ error: 'callback exploded' })
    );
  });
});
