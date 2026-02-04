/* global Database, MasterIndex, PropertiesService, DriveApp */

/**
 * Database Create Tests
 *
 * Covers createDatabase() behaviour for the master index initialisation flow.
 */

import { describe, it, expect } from 'vitest';
import {
  createDatabaseTestConfig,
  registerDatabaseFile,
  registerMasterIndexKey
} from '../../helpers/database-test-helpers.js';

const { getScriptProperties } = PropertiesService;

/**
 * Returns the number of collections currently tracked in the MasterIndex.
 * @param {MasterIndex} masterIndex - Index instance under test.
 * @returns {number} Collection count to validate initialisation.
 */
const getCollectionsCount = (masterIndex) => Object.keys(masterIndex.getCollections()).length;

describe('Database createDatabase()', () => {
  it('should initialise a fresh MasterIndex with no collections', () => {
    // Arrange - Generate unique configuration and ensure clean ScriptProperties state
    const { config, masterIndexKey } = createDatabaseTestConfig();
    registerMasterIndexKey(masterIndexKey);
    getScriptProperties().deleteProperty(masterIndexKey);
    const database = new Database(config);

    // Act - Create the database for the first time
    database.createDatabase();

    // Assert - MasterIndex should exist and start empty
    const masterIndex = new MasterIndex({ masterIndexKey });
    expect(masterIndex.isInitialised()).toBeTruthy();
    expect(getCollectionsCount(masterIndex)).toBe(0);
  });

  it('should throw when a MasterIndex already exists for the key', () => {
    // Arrange - Prepare configuration with a pre-existing MasterIndex
    const { config, masterIndexKey, rootFolderId } = createDatabaseTestConfig();
    registerMasterIndexKey(masterIndexKey);
    const folder = DriveApp.getFolderById(rootFolderId);
    const existingFile = folder.createFile(
      'existing-collection.json',
      JSON.stringify({ documents: {}, metadata: {} })
    );
    registerDatabaseFile(existingFile.getId());
    const existingMasterIndex = new MasterIndex({ masterIndexKey });
    existingMasterIndex.addCollection('existingCollection', {
      name: 'existingCollection',
      fileId: existingFile.getId(),
      documentCount: 1
    });
    const database = new Database(config);

    // Act & Assert - Creating again should fail with a descriptive error
    expect(() => database.createDatabase()).toThrowError(/Database already exists/);

    const loadedIndex = new MasterIndex({ masterIndexKey });
    expect(getCollectionsCount(loadedIndex)).toBe(1);
  });
});
