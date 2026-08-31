/* global ErrorHandler, PropertiesService, ObjectUtils */

/**
 * MasterIndex.save() resynchronisation on persistence failure.
 *
 * When ScriptProperties persistence fails, MasterIndex.save() resynchronises in-memory
 * state with the stored snapshot (or retains the staged state when no snapshot exists),
 * records a loud ERROR, and always re-throws the ORIGINAL MasterIndexError('save').
 * The resync path must not recurse into save() or normalisation. Case 6 pins the existing
 * single-wrap-point loader contract for _loadFromScriptProperties.
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  cleanupMasterIndexTests,
  createMasterIndexKey,
  createTestMasterIndex,
  seedMasterIndex
} from '../../helpers/master-index-test-helpers.js';

const scriptProperties = PropertiesService.getScriptProperties();

/**
 * Builds a plain (non-CollectionMetadata) collection entry for seeded snapshots so
 * the loaded in-memory shape round-trips predictably through serialise/deserialise.
 * @param {string} name - Collection identifier.
 * @param {Object} [overrides] - Optional field overrides.
 * @returns {Object} Plain collection metadata object.
 */
const buildSeededCollection = (name, overrides = {}) => ({
  name,
  fileId: `${name}-file`,
  documentCount: 1,
  modificationToken: 'seeded-token',
  created: new Date('2025-01-01T00:00:00Z'),
  lastUpdated: new Date('2025-01-01T00:00:00Z'),
  lockStatus: null,
  ...overrides
});

/**
 * Runs fn and returns any thrown error (or null when it succeeds).
 * @param {Function} fn - Zero-argument operation to execute.
 * @returns {*} The captured throwable, or null.
 */
const captureThrow = (fn) => {
  let caught = null;
  try {
    fn();
  } catch (error) {
    caught = error;
  }
  return caught;
};

afterEach(() => {
  cleanupMasterIndexTests();
  vi.restoreAllMocks();
});

describe('MasterIndex.save resynchronisation on failure', () => {
  it('resyncs in-memory state to the stored snapshot when save fails with an existing snapshot', () => {
    // Arrange
    const key = createMasterIndexKey();
    const seededData = {
      version: 1,
      lastUpdated: new Date('2025-03-01T00:00:00Z'),
      collections: { users: buildSeededCollection('users', { documentCount: 3 }) }
    };
    seedMasterIndex(key, seededData);

    const { masterIndex } = createTestMasterIndex({ masterIndexKey: key });
    const expectedSnapshot = ObjectUtils.deserialise(scriptProperties.getProperty(key));

    vi.spyOn(scriptProperties, 'setProperty').mockImplementation(() => {
      throw new Error('forced persist failure');
    });

    // Act
    const caught = captureThrow(() => masterIndex.save());

    // Assert
    expect(caught).toBeInstanceOf(ErrorHandler.ErrorTypes.MASTER_INDEX_ERROR);
    expect(caught.context.operation).toBe('save');

    // Staged lastUpdated advance must be discarded; in-memory state must equal the
    // stored snapshot.
    expect(masterIndex._data).toEqual(expectedSnapshot);
  });

  it('keeps staged state and logs an ERROR when save fails with no stored snapshot', () => {
    // Arrange
    const { key, masterIndex } = createTestMasterIndex();
    scriptProperties.deleteProperty(key);

    const loggerErrorSpy = vi.spyOn(masterIndex._logger, 'error');
    vi.spyOn(scriptProperties, 'setProperty').mockImplementation(() => {
      throw new Error('forced persist failure');
    });

    // Act
    const beforeData = masterIndex._data;
    const caught = captureThrow(() => masterIndex.save());

    // Assert
    expect(caught).toBeInstanceOf(ErrorHandler.ErrorTypes.MASTER_INDEX_ERROR);
    expect(caught.context.operation).toBe('save');

    // Staged state must be retained (no snapshot available to resync from).
    expect(masterIndex._data).toBe(beforeData);

    // A loud ERROR must record the missing-snapshot outcome.
    expect(loggerErrorSpy).toHaveBeenCalled();
  });

  it('keeps staged state and throws the original save error when resync reader also fails', () => {
    // Arrange
    const key = createMasterIndexKey();
    const seededData = {
      version: 1,
      lastUpdated: new Date('2025-03-01T00:00:00Z'),
      collections: { users: buildSeededCollection('users', { documentCount: 2 }) }
    };
    seedMasterIndex(key, seededData);

    const { masterIndex } = createTestMasterIndex({ masterIndexKey: key });

    const loggerErrorSpy = vi.spyOn(masterIndex._logger, 'error');
    vi.spyOn(scriptProperties, 'setProperty').mockImplementation(() => {
      throw new Error('forced persist failure');
    });
    vi.spyOn(scriptProperties, 'getProperty').mockImplementation(() => {
      throw new Error('forced read failure');
    });

    // Act
    const beforeData = masterIndex._data;
    const caught = captureThrow(() => masterIndex.save());

    // Assert
    expect(caught).toBeInstanceOf(ErrorHandler.ErrorTypes.MASTER_INDEX_ERROR);
    expect(caught.context.operation).toBe('save');

    // Staged state retained; the original save error (not a load error) must propagate.
    expect(masterIndex._data).toBe(beforeData);

    // A loud ERROR must state that memory may be diverged from the stored snapshot.
    expect(loggerErrorSpy).toHaveBeenCalled();
  });

  it('does not recurse into save or normalisation on the resync path with a legacy payload', () => {
    // Arrange
    const key = createMasterIndexKey();
    const cleanData = {
      version: 1,
      lastUpdated: new Date('2025-02-01T00:00:00Z'),
      collections: { legacyCol: buildSeededCollection('legacyCol', { documentCount: 1 }) }
    };
    seedMasterIndex(key, cleanData);

    const { masterIndex } = createTestMasterIndex({ masterIndexKey: key });

    const legacyPayload = {
      version: 1,
      lastUpdated: new Date('2025-02-15T00:00:00Z'),
      collections: { legacyCol: buildSeededCollection('legacyCol', { documentCount: 7 }) },
      modificationHistory: [
        {
          collection: 'legacyCol',
          operation: 'UPDATE_METADATA',
          timestamp: '2025-02-15T00:00:00.000Z',
          data: { documentCount: 7 }
        }
      ]
    };
    seedMasterIndex(key, legacyPayload);

    const saveSpy = vi.spyOn(masterIndex, 'save');
    const ensureShapeSpy = vi.spyOn(masterIndex, '_ensureStateShape');
    vi.spyOn(scriptProperties, 'setProperty').mockImplementation(() => {
      throw new Error('forced persist failure');
    });

    // Act
    const caught = captureThrow(() => masterIndex.save());

    // Assert
    expect(caught).toBeInstanceOf(ErrorHandler.ErrorTypes.MASTER_INDEX_ERROR);
    expect(caught.context.operation).toBe('save');

    // Single triggering call; the resync path must never re-enter save() nor normalise.
    expect(saveSpy).toHaveBeenCalledTimes(1);
    expect(ensureShapeSpy).toHaveBeenCalledTimes(0);

    // Normalisation skipped on resync: the legacy modificationHistory must survive on
    // this._data once resync adopts the stored payload.
    expect(masterIndex._data.modificationHistory).toBeDefined();
  });

  it('resyncs this._data (not the override) when save(dataOverride) fails with an existing snapshot', () => {
    // Arrange
    const key = createMasterIndexKey();
    const seededData = {
      version: 1,
      lastUpdated: new Date('2025-03-01T00:00:00Z'),
      collections: { users: buildSeededCollection('users', { documentCount: 5 }) }
    };
    seedMasterIndex(key, seededData);

    const { masterIndex } = createTestMasterIndex({ masterIndexKey: key });
    const expectedSnapshot = ObjectUtils.deserialise(scriptProperties.getProperty(key));
    const beforeData = masterIndex._data;

    const dataOverride = {
      version: 1,
      collections: {},
      lastUpdated: new Date('2025-04-01T00:00:00Z')
    };

    vi.spyOn(scriptProperties, 'setProperty').mockImplementation(() => {
      throw new Error('forced persist failure');
    });

    // Act
    const caught = captureThrow(() => masterIndex.save(dataOverride));

    // Assert
    expect(caught).toBeInstanceOf(ErrorHandler.ErrorTypes.MASTER_INDEX_ERROR);
    expect(caught.context.operation).toBe('save');

    // this._data must equal the stored snapshot and must NOT adopt the override.
    expect(masterIndex._data).toEqual(expectedSnapshot);
    expect(masterIndex._data).not.toBe(dataOverride);

    // Resync must replace the in-memory reference (de-aliasing); without it this._data
    // stays the originally loaded object.
    expect(masterIndex._data).not.toBe(beforeData);
  });

  it('wraps load failures as MASTER_INDEX_ERROR(load) exactly once via _loadFromScriptProperties', () => {
    // Arrange
    const { masterIndex } = createTestMasterIndex();
    const loggerErrorSpy = vi.spyOn(masterIndex._logger, 'error');
    vi.spyOn(scriptProperties, 'getProperty').mockImplementation(() => {
      throw new Error('forced read failure');
    });

    // Act
    const caught = captureThrow(() => masterIndex._loadFromScriptProperties());

    // Assert
    expect(caught).toBeInstanceOf(ErrorHandler.ErrorTypes.MASTER_INDEX_ERROR);
    expect(caught.context.operation).toBe('load');
    expect(loggerErrorSpy).toHaveBeenCalledTimes(1);
  });
});
