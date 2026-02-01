/**
 * Database Backup Index Tests (Vitest)
 * Refactored from old_tests/unit/Database/05_DatabaseBackupIndexTestSuite.js
 */

import { describe, it, expect } from 'vitest';
import {
  createDatabaseConfig,
  trackFileId,
  createInitialisedDatabase
} from '../../helpers/database-test-helpers.js';

const countIndexFiles = (folderId) => {
  const folder = DriveApp.getFolderById(folderId);
  const files = folder.getFiles();
  let count = 0;
  while (files.hasNext()) {
    const file = files.next();
    if (file.getName().includes('database_index') && file.getName().endsWith('.json')) {
      count++;
    }
  }
  return count;
};

const listIndexFiles = (folderId) => {
  const folder = DriveApp.getFolderById(folderId);
  const files = folder.getFiles();
  const ids = [];
  while (files.hasNext()) {
    const file = files.next();
    if (file.getName().includes('database_index') && file.getName().endsWith('.json')) {
      ids.push(file.getId());
    }
  }
  return ids;
};

describe('Database Backup Index Tests', () => {
  it('does NOT create index file when backupOnInitialise is false', () => {
    const config = createDatabaseConfig({ backupOnInitialise: false });
    const database = new Database(config);
    const initialIndexCount = countIndexFiles(config.rootFolderId);

    database.createDatabase();
    database.initialise();
    const collectionName = 'test_col_no_backup';
    const collection = database.createCollection(collectionName);
    trackFileId(collection?.driveFileId);

    const indexFileCount = countIndexFiles(config.rootFolderId);
    expect(indexFileCount).toBe(initialIndexCount);
    trackFileId(database.indexFileId);
  });

  it('creates index file when backupOnInitialise is true', () => {
    const config = createDatabaseConfig({ backupOnInitialise: true });
    const database = new Database(config);

    database.createDatabase();
    database.initialise();

    const indexFileCount = countIndexFiles(config.rootFolderId);
    expect(indexFileCount).toBeGreaterThanOrEqual(1);
    trackFileId(database.indexFileId);
  });

  it('createCollection does not create index file when backup disabled', () => {
    const config = createDatabaseConfig({ backupOnInitialise: false });
    const database = new Database(config);
    database.createDatabase();
    database.initialise();
    const collectionName = 'test_col_creation_check';
    const initialIndexFiles = listIndexFiles(config.rootFolderId);
    const initialCount = initialIndexFiles.length;

    const collection = database.createCollection(collectionName);
    trackFileId(collection?.driveFileId);

    const finalIndexFiles = listIndexFiles(config.rootFolderId);
    const finalCount = finalIndexFiles.length;

    expect(finalCount).toBe(initialCount);
  });
});
