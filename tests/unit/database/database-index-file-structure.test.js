/**
 * Database Index File Structure Tests (Vitest)
 * Refactored from old_tests/unit/Database/03_IndexFileStructureTestSuite.js
 */

import { describe, it, expect } from 'vitest';
import {
  createInitialisedDatabase,
  createDatabaseConfig,
  trackFileId
} from '../../helpers/database-test-helpers.js';

describe('Database Index File Structure', () => {
  it('creates index file with correct structure', () => {
    const config = createDatabaseConfig({ backupOnInitialise: true });
    const database = new Database(config);

    database.createDatabase();
    database.initialise();
    const indexData = database.loadIndex();

    expect(indexData).toBeDefined();
    expect(indexData.collections).toBeDefined();
    expect(indexData.lastUpdated).toBeDefined();
    expect(typeof indexData.collections).toBe('object');
    trackFileId(database.indexFileId);
  });

  it('updates index file when collections change', () => {
    const { database } = createInitialisedDatabase({ backupOnInitialise: true });
    const collectionName = `indexTestCollection_${Date.now()}`;

    const collection = database.createCollection(collectionName);
    trackFileId(collection.driveFileId);
    trackFileId(database.indexFileId);
    const indexData = database.loadIndex();

    expect(indexData.collections).toHaveProperty(collectionName);
    const collectionData = indexData.collections[collectionName];
    expect(collectionData.name).toBe(collectionName);
    expect(collectionData.fileId).toBeTruthy();
    expect(collectionData.created).toBeDefined();
    expect(collectionData.lastUpdated).toBeDefined();
  });

  it('synchronises with master index', () => {
    const { database, config } = createInitialisedDatabase();
    const collectionName = `masterIndexSyncTest_${Date.now()}`;
    const collection = database.createCollection(collectionName);
    trackFileId(collection.driveFileId);

    const masterIndex = new MasterIndex({ masterIndexKey: config.masterIndexKey });
    const miCollections = masterIndex.getCollections();

    expect(miCollections).toHaveProperty(collectionName);
  });

  it('records sanitised collection names in index file when sanitisation enabled', () => {
    const config = createDatabaseConfig({
      stripDisallowedCollectionNameCharacters: true,
      backupOnInitialise: true
    });
    const database = new Database(config);
    database.createDatabase();
    database.initialise();
    const suffix = `_${Date.now()}`;
    const requestedName = `index/backup${suffix}`;
    const expectedName = `indexbackup${suffix}`;

    const collection = database.createCollection(requestedName);
    trackFileId(collection.driveFileId);
    trackFileId(database.indexFileId);
    const indexData = database.loadIndex();

    expect(indexData.collections).toHaveProperty(expectedName);
    expect(indexData.collections[expectedName].name).toBe(expectedName);
  });
});
