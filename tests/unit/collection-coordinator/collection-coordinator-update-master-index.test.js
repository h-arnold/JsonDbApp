/**
 * CollectionCoordinator Update Master Index Tests
 *
 * Tests for CollectionCoordinator.updateMasterIndexMetadata.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
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

  it('should wrap metadata failures without logging so the coordinate boundary owns failure logs', () => {
    // Arrange
    const updateSpy = vi
      .spyOn(env.masterIndex, 'updateCollectionMetadata')
      .mockImplementation(() => {
        throw new Error('metadata exploded');
      });
    const errorSpy = vi.spyOn(coordinator._logger, 'error');

    try {
      // Act + Assert — wrap only: no diagnostic log at this layer.
      expect(() => coordinator.updateMasterIndexMetadata()).toThrow(
        ErrorHandler.ErrorTypes.MASTER_INDEX_ERROR
      );
      expect(errorSpy).not.toHaveBeenCalled();
    } finally {
      updateSpy.mockRestore();
      errorSpy.mockRestore();
    }
  });

  it('should log a coordinated metadata failure exactly once from the coordinate catch', () => {
    // Arrange
    const updateSpy = vi
      .spyOn(env.masterIndex, 'updateCollectionMetadata')
      .mockImplementation(() => {
        throw new Error('metadata exploded');
      });
    const errorSpy = vi.spyOn(coordinator._logger, 'error');

    try {
      // Act + Assert — one boundary log, no duplicate from the wrapping layer.
      expect(() => coordinator.coordinate('failingFinalisation', () => 'result')).toThrow(
        ErrorHandler.ErrorTypes.MASTER_INDEX_ERROR
      );
      expect(errorSpy).toHaveBeenCalledTimes(1);
      expect(errorSpy.mock.calls[0][0]).toContain('Operation failingFinalisation failed');
    } finally {
      updateSpy.mockRestore();
      errorSpy.mockRestore();
    }
  });
});
