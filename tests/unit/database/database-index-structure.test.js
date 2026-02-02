/* global MasterIndex */

/**
 * Database Index Structure Tests
 *
 * Ports legacy index backup behaviours into the Vitest suite.
 */

import { describe, it, expect } from 'vitest';
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
});
