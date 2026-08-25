/**
 * Inner Hot-Path Timing Instrumentation Tests
 *
 * Drives representative public operations against the GAS mocks and asserts
 * the `SPEC.md` §6 instrumentation inventory under the stacked-timer
 * short-circuit contract: while an outer measurement is active, inner timers
 * run their fn directly, so each driven operation emits exactly its outermost
 * boundary label and every inner hot-path label stays silent — one event per
 * operation, no double counting. Coordinated work therefore asserts the
 * coordinator boundary alone. Per-document helpers (`deleteDocument`,
 * `findAllDocuments`) remain deliberately untimed, which the deleteMany case
 * guards as negative space.
 */

import { afterEach, describe, expect, it } from 'vitest';
import { captureTimingEvents, eventsWithLabel } from '../../helpers/timing-capture-test-helpers.js';
import {
  assertAcknowledgedWrite,
  createIsolatedTestCollection,
  seedStandardEmployees,
  setupCollectionTestEnvironment
} from '../../helpers/collection-test-helpers.js';
import { registerDatabaseFile } from '../../helpers/database-test-helpers.js';

describe('Inner hot-path timing instrumentation', () => {
  let capture;

  afterEach(() => {
    if (capture) {
      capture.restore();
    }
  });

  it('short-circuits inner query timers so find emits exactly its boundary label', () => {
    // Arrange — the capture starts after the arrange phase because the SPEC §6
    // instrumentation inventory makes the registration and seeding helpers emit
    // their own events, which would pollute the exact-label assertion below.
    const { collection } = createIsolatedTestCollection('timingInnerFind');
    seedStandardEmployees(collection);
    capture = captureTimingEvents();

    // Act
    const results = collection.find({ department: 'Engineering' });

    // Assert
    expect(results).toHaveLength(2);
    expect(capture.events.map((event) => event.label)).toEqual(['collection.find']);
  });

  it('short-circuits operator timers so updateMany emits exactly its boundary label', () => {
    // Arrange — capture starts after arrange so only act-phase events are recorded.
    const { collection } = createIsolatedTestCollection('timingInnerUpdateMany');
    seedStandardEmployees(collection);
    capture = captureTimingEvents();

    // Act
    const result = collection.updateMany({ department: 'Engineering' }, { $inc: { salary: 1000 } });

    // Assert
    assertAcknowledgedWrite(result, { matchedCount: 2, modifiedCount: 2 });
    expect(capture.events.map((event) => event.label)).toEqual(['collection.updateMany']);
  });

  it('short-circuits coordination-internal timers so a coordinated save emits one outer event', () => {
    // Arrange — capture starts after arrange so only act-phase events are recorded.
    const { collection } = createIsolatedTestCollection('timingCoordinatedSave');
    seedStandardEmployees(collection);
    capture = captureTimingEvents();

    // Act
    const result = collection.save();

    // Assert
    expect(result.acknowledged).toBe(true);
    expect(capture.events.map((event) => event.label)).toEqual(['coordinator.coordinate']);
  });

  it('attributes FileService cache-path timings to the FileService component despite the injected logger', () => {
    // Arrange - the helper environment injects its own component logger into
    // FileService exactly as Database does, so correct attribution can only
    // come from FileService's own dedicated timing logger.
    const env = setupCollectionTestEnvironment();
    const payload = { documents: {}, metadata: { documentCount: 0 } };
    capture = captureTimingEvents();

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
    capture = captureTimingEvents();

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
