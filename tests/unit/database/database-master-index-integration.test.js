/**
 * Database Master Index Integration Tests (Vitest)
 * Refactored from old_tests/unit/Database/04_DatabaseMasterIndexIntegrationTestSuite.js
 */

import { describe, it, expect } from 'vitest';
import {
  createDatabaseConfig,
  trackFileId,
  trackMasterIndexKey
} from '../../helpers/database-test-helpers.js';

describe('Database Master Index Integration', () => {
  it('integrates with master index on initialisation', () => {
    const uniqueKey = trackMasterIndexKey(`VITEST_DB_MASTER_INDEX_INIT_${Date.now()}`);
    const config = createDatabaseConfig({ masterIndexKey: uniqueKey });
    const database = new Database(config);
    database.createDatabase();

    const masterIndex = new MasterIndex({ masterIndexKey: uniqueKey });
    masterIndex.addCollection('existingCollection', {
      name: 'existingCollection',
      fileId: 'mock-file-id',
      documentCount: 2
    });

    database.initialise();

    const collections = database.listCollections();
    expect(collections).toContain('existingCollection');
  });

  it('co-ordinates collection operations with master index', () => {
    const uniqueKey = trackMasterIndexKey(`VITEST_DB_MASTER_INDEX_COORD_${Date.now()}`);
    const config = createDatabaseConfig({ masterIndexKey: uniqueKey });
    const database = new Database(config);
    database.createDatabase();
    database.initialise();

    const collectionName = 'coordinationTest';
    const collObj = database.createCollection(collectionName);
    trackFileId(collObj.driveFileId);

    const masterIndex = new MasterIndex({ masterIndexKey: uniqueKey });
    const miCollections = masterIndex.getCollections();

    expect(miCollections).toHaveProperty(collectionName);
    expect(collObj.driveFileId).toBe(miCollections[collectionName].fileId);
  });
});
