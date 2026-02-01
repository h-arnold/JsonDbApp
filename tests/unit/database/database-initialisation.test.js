/**
 * Database Initialisation Tests (Vitest)
 * Refactored from old_tests/unit/Database/01_DatabaseInitializationTestSuite.js
 */

import { describe, it, expect } from 'vitest';
import {
  createDatabaseConfig,
  createInitialisedDatabase,
  trackFileId
} from '../../helpers/database-test-helpers.js';

describe('Database Initialisation', () => {
  it('creates Database with default configuration', () => {
    const database = new Database();

    expect(database).toBeDefined();
    expect(database.config).toBeDefined();
    expect(database.collections instanceof Map).toBe(true);
    expect(database.indexFileId).toBeNull();
  });

  it('creates Database with custom configuration', () => {
    const config = createDatabaseConfig();
    const database = new Database(config);

    expect(database.config.rootFolderId).toBe(config.rootFolderId);
    expect(database.config.autoCreateCollections).toBe(config.autoCreateCollections);
  });

  it('initialises database and creates index file when backup enabled', () => {
    const config = createDatabaseConfig({ backupOnInitialise: true });
    const database = new Database(config);

    database.createDatabase();
    database.initialise();

    expect(database.indexFileId).toBeDefined();
    expect(database.indexFileId.length).toBeGreaterThan(5);
    trackFileId(database.indexFileId);
  });

  it('handles initialisation with existing index file', () => {
    const collectionName = `existingCollection_${Date.now()}`;
    const config = createDatabaseConfig();
    const firstDb = new Database(config);
    firstDb.createDatabase();
    firstDb.initialise();
    const created = firstDb.createCollection(collectionName);
    trackFileId(created.driveFileId);
    trackFileId(firstDb.indexFileId);

    const secondDb = new Database(config);
    secondDb.initialise();

    const collections = secondDb.listCollections();
    expect(collections).toContain(collectionName);
  });
});
