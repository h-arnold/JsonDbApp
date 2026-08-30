/**
 * Instrumented Call-Site Error-Path Timing Tests
 *
 * Pins the error-fidelity invariant (each failing site still emits a boundary event
 * carrying the thrown error) at every instrumented
 * call site listed in PR_REVIEW.md (Testing gap C1): when a wrapped operation
 * throws, the site's boundary timing event IS still emitted with `error`
 * populated from the thrown value, and the ORIGINAL error alone reaches the
 * caller with its identity preserved — the event never displaces it. Captures
 * start after the arrange phase so seeding and setup emissions cannot pollute
 * the exact-label assertions.
 *
 * Seam-level error behaviour lives in jdb-logger-timing.test.js; happy-path
 * inventory and short-circuit behaviour live in timing-instrumentation.test.js.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { captureTimingEvents, eventsWithLabel } from '../../helpers/timing-capture-test-helpers.js';
import { createIsolatedTestCollection } from '../../helpers/collection-test-helpers.js';
import {
  setupTestEnvironment,
  resetCollection
} from '../../helpers/document-operations-test-helpers.js';
import {
  cleanupMasterIndexTests,
  createTestMasterIndex
} from '../../helpers/master-index-test-helpers.js';
import {
  createTestCoordinator,
  createTestCollection as createCoordinatorTestCollection,
  resetCollectionState,
  setupCoordinatorTestEnvironment
} from '../../helpers/collection-coordinator-test-helpers.js';

let capture;

afterEach(() => {
  if (capture) {
    capture.restore();
  }
  cleanupMasterIndexTests();
});

/**
 * Invokes an operation expected to throw and returns whatever it threw so both
 * its identity and its timing-event footprint can be asserted afterwards.
 * @param {Function} operation - Zero-argument operation expected to throw.
 * @returns {*} The throwable raised by the operation.
 */
const catchThrown = (operation) => {
  try {
    operation();
  } catch (error) {
    return error;
  }
  throw new Error('Operation failed: expected the instrumented operation to throw');
};

/**
 * Asserts that the failing act emitted exactly one boundary timing event whose
 * fields satisfy the error-handling contract and carry the thrown message.
 * @param {string} label - Boundary label expected from the failing site.
 * @param {string} component - PascalCase component attributed to the event.
 * @param {*} thrown - Original throwable caught by the caller.
 * @returns {void}
 */
const expectBoundaryErrorPathEvent = (label, component, thrown) => {
  expect(capture.events.map((event) => event.label)).toEqual([label]);
  const [event] = eventsWithLabel(capture.events, label);
  expect(event.component).toBe(component);
  expect(event.error).toBe(thrown.message);
  expect(typeof event.durationMs).toBe('number');
  expect(event.durationMs).toBeGreaterThanOrEqual(0);
  expect(typeof event.timestamp).toBe('string');
};

/**
 * Creates a FileService wired to stubbed Drive operations, mirroring the unit
 * context used by the FileService suite.
 * @param {Function} readFileImplementation - Replacement FileOperations.readFile implementation.
 * @returns {{fileService: FileService, mockFileOps: Object}} Service under test plus its stubs.
 */
const createFileServiceWithStubbedRead = (readFileImplementation) => {
  const mockLogger = { debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() };
  const mockFileOps = {
    readFile: vi.fn(readFileImplementation),
    writeFile: vi.fn(),
    createFile: vi.fn(),
    deleteFile: vi.fn(),
    fileExists: vi.fn(),
    getFileMetadata: vi.fn()
  };
  return { fileService: new FileService(mockFileOps, mockLogger), mockFileOps };
};

describe('Instrumented call-site error-path timing events', () => {
  it('emits the collection.insertOne error-path event when a duplicate key aborts the insert', () => {
    // Arrange
    const { collection } = createIsolatedTestCollection('timingErrorDuplicateKey');
    collection.insertOne({
      _id: 'employee-1',
      name: 'Alice',
      department: 'Engineering',
      salary: 75000
    });
    capture = captureTimingEvents();

    // Act
    const thrown = catchThrown(() =>
      collection.insertOne({
        _id: 'employee-1',
        name: 'Impostor',
        department: 'Engineering',
        salary: 1
      })
    );

    // Assert
    expect(thrown).toBeInstanceOf(ErrorHandler.ErrorTypes.CONFLICT_ERROR);
    expectBoundaryErrorPathEvent('collection.insertOne', 'Collection', thrown);
  });

  it('emits the queryEngine.executeQuery error-path event when query validation throws inside the timed closure', () => {
    // Arrange
    const engine = new QueryEngine();
    const documents = [
      { _id: 'a', group: 1 },
      { _id: 'b', group: 2 }
    ];
    capture = captureTimingEvents();

    // Act — validation runs inside the timed wrapper, so the failure must reach the event.
    const thrown = catchThrown(() =>
      engine.executeQuery(documents, { group: { $regex: 'pattern' } })
    );

    // Assert
    expect(thrown).toBeInstanceOf(ErrorHandler.ErrorTypes.INVALID_QUERY);
    expectBoundaryErrorPathEvent('queryEngine.executeQuery', 'QueryEngine', thrown);
  });

  it('emits the fileService.readFile error-path event when the underlying file is missing', () => {
    // Arrange
    const { fileService } = createFileServiceWithStubbedRead(() => {
      throw new ErrorHandler.ErrorTypes.FILE_NOT_FOUND('missing-file-id');
    });
    capture = captureTimingEvents();

    // Act
    const thrown = catchThrown(() => fileService.readFile('missing-file-id'));

    // Assert
    expect(thrown).toBeInstanceOf(ErrorHandler.ErrorTypes.FILE_NOT_FOUND);
    expectBoundaryErrorPathEvent('fileService.readFile', 'FileService', thrown);
  });

  it('emits the masterIndex.save error-path event carrying the wrapped MASTER_INDEX_ERROR message', () => {
    // Arrange
    const { masterIndex } = createTestMasterIndex();
    const poisonedData = {};
    poisonedData.self = poisonedData; // JSON.stringify cannot serialise cycles.
    capture = captureTimingEvents();

    // Act — the MASTER_INDEX_ERROR wrap happens inside the timed closure itself.
    const thrown = catchThrown(() => masterIndex.save(poisonedData));

    // Assert
    expect(thrown).toBeInstanceOf(ErrorHandler.ErrorTypes.MASTER_INDEX_ERROR);
    expect(thrown.message).toContain('Master index error during save');
    expectBoundaryErrorPathEvent('masterIndex.save', 'MasterIndex', thrown);
  });

  it('emits the updateEngine.applyOperators error-path event when an unsupported operator throws', () => {
    // Arrange
    const engine = new UpdateEngine();
    capture = captureTimingEvents();

    // Act
    const thrown = catchThrown(() => engine.applyOperators({ count: 1 }, { $unsupportedOp: {} }));

    // Assert
    expect(thrown).toBeInstanceOf(ErrorHandler.ErrorTypes.INVALID_QUERY);
    expectBoundaryErrorPathEvent('updateEngine.applyOperators', 'UpdateEngine', thrown);
  });

  it('emits the docOps.updateWithOperators error-path event when the update operators are invalid', () => {
    // Arrange
    const env = setupTestEnvironment();
    resetCollection(env.collection);
    const docOps = new DocumentOperations(env.collection);
    capture = captureTimingEvents();

    // Act — operator-shape validation runs inside the timed wrapper.
    const thrown = catchThrown(() =>
      docOps.updateDocumentWithOperators('any-id', { plainField: 'value' })
    );

    // Assert
    expect(thrown).toBeInstanceOf(ErrorHandler.ErrorTypes.INVALID_ARGUMENT);
    expectBoundaryErrorPathEvent('docOps.updateWithOperators', 'DocumentOperations', thrown);
  });

  it('emits the coordinator.coordinate error-path event when the coordinated operation fails', () => {
    // Arrange
    const env = setupCoordinatorTestEnvironment();
    const { collection, fileId } = createCoordinatorTestCollection(env, 'timingCoordFailure');
    resetCollectionState(collection, fileId);
    const coordinator = createTestCoordinator(collection, env.masterIndex);
    const operationFailure = new Error('coordinated work exploded');
    capture = captureTimingEvents();

    // Act
    const thrown = catchThrown(() =>
      coordinator.coordinate('failingProbe', () => {
        throw operationFailure;
      })
    );

    // Assert — the caller receives the very instance the callback threw, unchanged.
    expect(thrown).toBe(operationFailure);
    expectBoundaryErrorPathEvent('coordinator.coordinate', 'CollectionCoordinator', thrown);
  });
});

describe('coordinate argument validation inside the timed closure', () => {
  it('still emits the coordinator.coordinate error-path event when argument validation fails', () => {
    // Arrange — validation deliberately lives INSIDE the timed closure, so misuse
    // is observable on the listener surface as well as through the throw.
    const env = setupCoordinatorTestEnvironment();
    const { collection, fileId } = createCoordinatorTestCollection(env, 'timingCoordValidation');
    resetCollectionState(collection, fileId);
    const coordinator = createTestCoordinator(collection, env.masterIndex);
    capture = captureTimingEvents();

    // Act
    const thrown = catchThrown(() => coordinator.coordinate('', () => 'never executed'));

    // Assert
    expect(thrown).toBeInstanceOf(ErrorHandler.ErrorTypes.INVALID_ARGUMENT);
    expectBoundaryErrorPathEvent('coordinator.coordinate', 'CollectionCoordinator', thrown);
  });

  it('rejects a non-function callback while still emitting the coordinator.coordinate error-path event', () => {
    // Arrange
    const env = setupCoordinatorTestEnvironment();
    const { collection, fileId } = createCoordinatorTestCollection(
      env,
      'timingCoordValidationCallback'
    );
    resetCollectionState(collection, fileId);
    const coordinator = createTestCoordinator(collection, env.masterIndex);
    capture = captureTimingEvents();

    // Act
    const thrown = catchThrown(() => coordinator.coordinate('badCallbackProbe', 'not-a-function'));

    // Assert
    expect(thrown).toBeInstanceOf(ErrorHandler.ErrorTypes.INVALID_ARGUMENT);
    expectBoundaryErrorPathEvent('coordinator.coordinate', 'CollectionCoordinator', thrown);
  });
});
