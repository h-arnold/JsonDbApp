/**
 * MasterIndex ScriptProperties Loading Tests
 *
 * Pins the consolidated ScriptProperties loader contract: public load() shares the
 * single private loader implementation used by construction and under-lock reloads
 * (one MASTER_INDEX_ERROR wrap point, one failure-log site), and getCollections
 * fails loud with a typed error when the index state is unloaded.
 */

/* global MasterIndex, ErrorHandler, PropertiesService */

import { afterEach, describe, expect, it } from 'vitest';
import {
  cleanupMasterIndexTests,
  createMasterIndexKey,
  createTestMasterIndex
} from '../../helpers/master-index-test-helpers.js';

const scriptProperties = PropertiesService.getScriptProperties();

/**
 * Adds a collection using consistent defaults for loading scenarios.
 * @param {MasterIndex} masterIndex - Master index under test.
 * @param {string} name - Collection identifier.
 */
const addSimpleCollection = (masterIndex, name) => {
  masterIndex.addCollection(name, {
    fileId: `${name}-file`,
    documentCount: 1,
    modificationToken: masterIndex.generateModificationToken(),
    lastModified: new Date('2024-01-01T00:00:00Z'),
    lockStatus: null
  });
};

afterEach(() => {
  cleanupMasterIndexTests();
});

describe('MasterIndex ScriptProperties loading consolidation', () => {
  it('should expose load() returning the deserialised index data shared with internal state', () => {
    const { masterIndex } = createTestMasterIndex();
    addSimpleCollection(masterIndex, 'loadedThroughPublicLoad');

    const loaded = masterIndex.load();

    expect(loaded).not.toBeNull();
    expect(loaded.collections.loadedThroughPublicLoad).toBeDefined();
    expect(masterIndex.isInitialised()).toBeTruthy();
  });

  it('should return null from load() when ScriptProperties holds no snapshot', () => {
    const { key, masterIndex } = createTestMasterIndex();
    scriptProperties.deleteProperty(key);

    expect(masterIndex.load()).toBeNull();
    expect(masterIndex.isInitialised()).toBeFalsy();
  });

  it('should throw a typed MasterIndexError from getCollections when index state is unloaded', () => {
    const { masterIndex } = createTestMasterIndex();
    masterIndex._data = null;

    expect(() => masterIndex.getCollections()).toThrow(ErrorHandler.ErrorTypes.MASTER_INDEX_ERROR);

    let caught;
    try {
      masterIndex.getCollections();
    } catch (error) {
      caught = error;
    }
    expect(caught.code).toBe(ErrorHandler.ERROR_CODES.MASTER_INDEX_ERROR);
    expect(caught.message).toContain('getCollections');
  });

  it('should reload a snapshot persisted by another instance through load()', () => {
    const key = createMasterIndexKey();
    const writer = new MasterIndex({ masterIndexKey: key });
    addSimpleCollection(writer, 'crossInstance');

    const reader = new MasterIndex({ masterIndexKey: key });
    const loaded = reader.load();

    expect(loaded.collections.crossInstance).toBeDefined();
  });
});
