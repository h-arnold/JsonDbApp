/* global MasterIndex */

/**
 * Database Index Structure Tests
 *
 * Ports legacy index backup behaviours into the Vitest suite.
 */

import { describe, it, expect, vi } from 'vitest';
import {
  setupDatabaseTestEnvironment,
  setupInitialisedDatabase,
  registerDatabaseFile,
  generateUniqueName
} from '../../helpers/database-test-helpers.js';

describe('Database Index Structure', () => {
  it('should create the index file with the expected structure when backup is enabled', () => {
    // Arrange - Prepare a database configured to back up during initialise
    const { database } = setupDatabaseTestEnvironment({ backupOnInitialise: true });
    database.createDatabase();

    // Act - Initialise to trigger index creation
    database.initialise();
    const indexData = database.loadIndex();
    registerDatabaseFile(database.indexFileId);

    // Assert - Structure should match expectations
    expect(indexData).toBeDefined();
    expect(indexData.collections).toBeDefined();
    expect(typeof indexData.collections).toBe('object');
    expect(indexData.lastUpdated).toBeDefined();
    expect(indexData.created).toBeDefined();
  });

  it('should update the index file when a new collection is created', () => {
    // Arrange - Start with an initialised database that maintains an index backup
    const { database } = setupInitialisedDatabase({ backupOnInitialise: true });
    const collectionName = generateUniqueName('indexUpdate');

    // Act - Create a collection and read back the index file
    const collection = database.createCollection(collectionName);
    const indexData = database.loadIndex();
    registerDatabaseFile(database.indexFileId);
    registerDatabaseFile(collection.getDriveFileId());

    // Assert - Index should record metadata for the new collection
    expect(Object.keys(indexData.collections)).toContain(collectionName);
    const entry = indexData.collections[collectionName];
    expect(entry.name).toBe(collectionName);
    expect(entry.fileId).toBe(collection.getDriveFileId());
    expect(entry.created).toBeDefined();
    expect(entry.lastUpdated).toBeDefined();
    expect(entry.documentCount).toBe(0);
  });

  it('should synchronise the MasterIndex when a collection is created', () => {
    // Arrange - Use a freshly initialised database
    const { database, masterIndexKey } = setupInitialisedDatabase();
    const collectionName = generateUniqueName('masterSync');

    // Act - Create the collection and load the MasterIndex
    const collection = database.createCollection(collectionName);
    const masterIndex = new MasterIndex({ masterIndexKey });
    const collections = masterIndex.getCollections();
    registerDatabaseFile(collection.getDriveFileId());

    // Assert - MasterIndex should contain the new collection metadata
    expect(collections).toHaveProperty(collectionName);
    const metadata = collections[collectionName];
    expect(metadata.name).toBe(collectionName);
    expect(metadata.fileId).toBe(collection.getDriveFileId());
  });

  it('should record sanitised collection names in the index when sanitisation is enabled', () => {
    // Arrange - Enable sanitisation and backups for the database
    const { database } = setupDatabaseTestEnvironment({
      backupOnInitialise: true,
      stripDisallowedCollectionNameCharacters: true
    });
    database.createDatabase();
    database.initialise();
    registerDatabaseFile(database.indexFileId);
    const requestedName = `index/backup:${Date.now()}`;
    const expectedName = requestedName.replace(/[\\/:*?"<>|]/g, '');

    // Act - Create the collection and load the index data
    const collection = database.createCollection(requestedName);
    const indexData = database.loadIndex();
    registerDatabaseFile(collection.getDriveFileId());

    // Assert - Index should store the sanitised identifier only
    expect(indexData.collections).toHaveProperty(expectedName);
    expect(Object.keys(indexData.collections)).not.toContain(requestedName);
    const entry = indexData.collections[expectedName];
    expect(entry.name).toBe(expectedName);
    expect(collection.getName()).toBe(expectedName);
  });

  it('repairs missing collections when loading the index file', () => {
    // Arrange - Start with a database that maintains an index backup
    const { database } = setupInitialisedDatabase({ backupOnInitialise: true });
    registerDatabaseFile(database.indexFileId);
    const warnSpy = vi.spyOn(console, 'warn');

    try {
      database._fileService.writeFile(database.indexFileId, {
        lastUpdated: new Date(),
        version: 1
      });

      // Act - Load the index after corrupting the collections property
      const indexData = database.loadIndex();

      // Assert - Collections are repaired and a warning is emitted
      expect(indexData.collections).toEqual({});
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[Database] Index file missing collections property, repairing'));
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('repairs missing lastUpdated when loading the index file', () => {
    // Arrange - Prepare a database with backup support
    const { database } = setupInitialisedDatabase({ backupOnInitialise: true });
    registerDatabaseFile(database.indexFileId);
    const warnSpy = vi.spyOn(console, 'warn');

    try {
      database._fileService.writeFile(database.indexFileId, {
        collections: {},
        version: 1
      });

      // Act - Perform the load
      const indexData = database.loadIndex();

      // Assert - lastUpdated should be repaired and warning generated
      expect(indexData.lastUpdated).toBeInstanceOf(Date);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[Database] Index file missing lastUpdated property, repairing'));
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('repairs missing collections before adding to the index', () => {
    // Arrange - Corrupt the index backup prior to adding a collection entry
    const { database } = setupInitialisedDatabase({ backupOnInitialise: true });
    registerDatabaseFile(database.indexFileId);
    const warnSpy = vi.spyOn(console, 'warn');

    try {
      database._fileService.writeFile(database.indexFileId, {
        lastUpdated: new Date(),
        version: 1
      });

      // Act - Add collection metadata despite the missing collections map
      database._addCollectionToIndex('helperRepairAdd', 'drive-file-id');

      // Assert - Helper repairs structure and logs the warning once
      const indexData = database.loadIndex();
      expect(indexData.collections).toHaveProperty('helperRepairAdd');
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[Database] Index file missing collections property, repairing'));
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('repairs missing lastUpdated before removing from the index', () => {
    // Arrange - Persist index data without lastUpdated
    const { database } = setupInitialisedDatabase({ backupOnInitialise: true });
    registerDatabaseFile(database.indexFileId);
    const warnSpy = vi.spyOn(console, 'warn');

    try {
      database._fileService.writeFile(database.indexFileId, {
        collections: {
          helperRepairRemove: {
            name: 'helperRepairRemove',
            fileId: 'drive-file-id',
            created: new Date(),
            lastUpdated: new Date(),
            documentCount: 0
          }
        },
        version: 1
      });

      // Act - Remove collection metadata with missing lastUpdated field on payload
      database._removeCollectionFromIndex('helperRepairRemove');

      // Assert - Helper restores lastUpdated and writes through the repaired payload
      const indexData = database.loadIndex();
      expect(indexData.collections).not.toHaveProperty('helperRepairRemove');
      expect(indexData.lastUpdated).toBeInstanceOf(Date);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('[Database] Index file missing lastUpdated property, repairing'));
    } finally {
      warnSpy.mockRestore();
    }
  });

  it('throws an error when index data is not an object', () => {
    // Arrange - Corrupt the underlying JSON to a primitive value
    const { database } = setupInitialisedDatabase({ backupOnInitialise: true });
    registerDatabaseFile(database.indexFileId);

    database._fileService.writeFile(database.indexFileId, 'not-an-object');

    // Act & Assert - Load should surface a descriptive error
    expect(() => database.loadIndex()).toThrowError('Index file contains invalid data structure');
  });

  it('throws an error when index data is an array', () => {
    // Arrange - Persist an array instead of the expected object payload
    const { database } = setupInitialisedDatabase({ backupOnInitialise: true });
    registerDatabaseFile(database.indexFileId);

    database._fileService.writeFile(database.indexFileId, []);

    // Act & Assert - Loading should treat the array as structural corruption
    expect(() => database.loadIndex()).toThrowError('Index file contains invalid data structure');
  });

  it('throws a TypeError when collections is not an object', () => {
    // Arrange - Persist malformed collections payload
    const { database } = setupInitialisedDatabase({ backupOnInitialise: true });
    registerDatabaseFile(database.indexFileId);

    database._fileService.writeFile(database.indexFileId, {
      collections: 'invalid-collections',
      lastUpdated: new Date(),
      version: 1
    });

    const loadMalformedIndex = database.loadIndex.bind(database);

    // Act & Assert - Loading should fail with a TypeError
    expect(loadMalformedIndex).toThrowError(TypeError);
    expect(loadMalformedIndex).toThrowError('Index file collections property is corrupted');
  });

  it('throws a TypeError when collections is an array', () => {
    // Arrange - Persist collections property as an array to mirror Drive corruption
    const { database } = setupInitialisedDatabase({ backupOnInitialise: true });
    registerDatabaseFile(database.indexFileId);

    database._fileService.writeFile(database.indexFileId, {
      collections: [],
      lastUpdated: new Date(),
      version: 1
    });

    const loadMalformedIndex = database.loadIndex.bind(database);

    // Act & Assert - Array payload should raise the same corruption error
    expect(loadMalformedIndex).toThrowError(TypeError);
    expect(loadMalformedIndex).toThrowError('Index file collections property is corrupted');
  });
});
