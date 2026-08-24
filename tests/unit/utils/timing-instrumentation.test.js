/**
 * Inner Hot-Path Timing Instrumentation Tests
 *
 * Drives representative public operations against the GAS mocks and asserts the
 * full `SPEC.md` §6 instrumentation inventory at both layers: the live
 * `collection.*` boundary wraps plus each inner hot-path label. Timing events
 * are flat (no parent-child nesting), so coordinated work asserts the presence
 * of every participating label rather than any structure. Per-document helpers
 * (`deleteDocument`, `findAllDocuments`) are deliberately not timed, which the
 * deleteMany case guards as negative space.
 */

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  captureTimingEvents,
  eventsWithLabel,
  expectLabelsPresent
} from '../../helpers/timing-capture-test-helpers.js';
import {
  assertAcknowledgedWrite,
  createIsolatedTestCollection,
  seedStandardEmployees,
  setupCollectionTestEnvironment
} from '../../helpers/collection-test-helpers.js';
import { registerDatabaseFile } from '../../helpers/database-test-helpers.js';

describe('Inner hot-path timing instrumentation', () => {
  let capture;

  beforeEach(() => {
    capture = captureTimingEvents();
  });

  afterEach(() => {
    capture.restore();
  });

  it('yields boundary and inner labels across the full find-to-query-engine path', () => {
    // Arrange
    const { collection } = createIsolatedTestCollection('timingInnerFind');
    seedStandardEmployees(collection);

    // Act
    const results = collection.find({ department: 'Engineering' });

    // Assert
    expect(results).toHaveLength(2);
    expectLabelsPresent(capture.events, [
      'collection.find',
      'docOps.executeQuery',
      'queryEngine.executeQuery',
      'queryEngine.filterDocuments'
    ]);
  });

  it('yields boundary and inner operator labels when updateMany applies operators', () => {
    // Arrange
    const { collection } = createIsolatedTestCollection('timingInnerUpdateMany');
    seedStandardEmployees(collection);

    // Act
    const result = collection.updateMany({ department: 'Engineering' }, { $inc: { salary: 1000 } });

    // Assert
    assertAcknowledgedWrite(result, { matchedCount: 2, modifiedCount: 2 });
    expectLabelsPresent(capture.events, [
      'collection.updateMany',
      'docOps.updateWithOperators',
      'updateEngine.applyOperators'
    ]);
  });

  it('yields coordination and persistence labels for a coordinated save', () => {
    // Arrange
    const { collection } = createIsolatedTestCollection('timingCoordinatedSave');
    seedStandardEmployees(collection);

    // Act
    const result = collection.save();

    // Assert
    expect(result.acknowledged).toBe(true);
    expectLabelsPresent(capture.events, [
      'coordinator.coordinate',
      'coordinator.updateMasterIndexMetadata',
      'masterIndex.save'
    ]);
  });

  it('attributes FileService cache-path timings to the FileService component despite the injected logger', () => {
    // Arrange - the helper environment injects its own component logger into
    // FileService exactly as Database does, so correct attribution can only
    // come from FileService's own dedicated timing logger.
    const env = setupCollectionTestEnvironment();
    const payload = { documents: {}, metadata: { documentCount: 0 } };

    // Act
    const fileId = env.fileService.createFile('timing-file-cache.json', payload, env.folderId);
    registerDatabaseFile(fileId);
    // createFile seeds the cache, so drop it to force one cold Drive read
    // followed by one warm cache-hit repeat.
    env.fileService.clearCache();
    const coldRead = env.fileService.readFile(fileId);
    const warmRead = env.fileService.readFile(fileId);

    // Assert
    expect(coldRead).toEqual(payload);
    expect(warmRead).toEqual(payload);
    const createEvents = eventsWithLabel(capture.events, 'fileService.createFile');
    expect(createEvents.length, 'expected one fileService.createFile timing event').toBeGreaterThan(
      0
    );
    const readEvents = eventsWithLabel(capture.events, 'fileService.readFile');
    expect(
      readEvents.length,
      'expected cold and warm fileService.readFile timing events'
    ).toBeGreaterThanOrEqual(2);
    for (const event of [...createEvents, ...readEvents]) {
      expect(event.component).toBe('FileService');
    }
  });

  it('emits no per-document helper timings beyond the batch wrapper during deleteMany', () => {
    // Arrange
    const { collection } = createIsolatedTestCollection('timingDeleteNegativeSpace');
    seedStandardEmployees(collection);

    // Act
    const result = collection.deleteMany({ department: 'Marketing' });

    // Assert
    assertAcknowledgedWrite(result, { deletedCount: 1 });
    expect(
      eventsWithLabel(capture.events, 'collection.deleteMany').length,
      'expected the batch wrapper to be timed'
    ).toBeGreaterThan(0);
    const perDocumentEvents = capture.events.filter(
      (event) => event.label.includes('deleteDocument') || event.label.includes('findAllDocuments')
    );
    expect(
      perDocumentEvents,
      'per-document helpers must not emit timing events of their own'
    ).toEqual([]);
  });
});
