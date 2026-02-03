/* global Database, MasterIndex, DriveApp, ErrorHandler, InvalidFileFormatError */

/**
 * Database Recover Tests
 *
 * Validates recoverDatabase() behaviour when restoring from Drive backups.
 */

import { describe, it, expect } from 'vitest';
import {
  createBackupIndexFile,
  createDatabaseTestConfig,
  registerDatabaseFile,
  registerMasterIndexKey
} from '../../helpers/database-test-helpers.js';

describe('Database recoverDatabase()', () => {
  it('should restore all collections from a valid backup file', () => {
    // Arrange - Prepare backup payload with two collections
    const { config, masterIndexKey, rootFolderId } = createDatabaseTestConfig();
    registerMasterIndexKey(masterIndexKey);
    const folder = DriveApp.getFolderById(rootFolderId);

    const collectionOneFile = folder.createFile('recoveredCollection1.json', JSON.stringify({ documents: {}, metadata: {} }));
    const collectionTwoFile = folder.createFile('recoveredCollection2.json', JSON.stringify({ documents: {}, metadata: {} }));
    registerDatabaseFile(collectionOneFile.getId());
    registerDatabaseFile(collectionTwoFile.getId());

    const backupIndexData = {
      collections: {
        recoveredCollection1: {
          name: 'recoveredCollection1',
          fileId: collectionOneFile.getId(),
          documentCount: 4
        },
        recoveredCollection2: {
          name: 'recoveredCollection2',
          fileId: collectionTwoFile.getId(),
          documentCount: 7
        }
      },
      lastUpdated: new Date(),
      version: 1
    };

    const backupFileId = createBackupIndexFile(rootFolderId, backupIndexData, 'backup_index.json');
    const database = new Database(config);

    // Act - Recover database contents from backup
    const recoveredCollections = database.recoverDatabase(backupFileId);

    // Assert - MasterIndex should now contain the recovered collections
    expect(recoveredCollections).toEqual(expect.arrayContaining(['recoveredCollection1', 'recoveredCollection2']));
    expect(recoveredCollections).toHaveLength(2);

    const masterIndex = new MasterIndex({ masterIndexKey });
    const collections = masterIndex.getCollections();
    expect(Object.keys(collections)).toEqual(expect.arrayContaining(['recoveredCollection1', 'recoveredCollection2']));
  });

  it('should throw when backup file structure is invalid', () => {
    // Arrange - Create malformed backup content missing the collections object
    const { config, masterIndexKey, rootFolderId } = createDatabaseTestConfig();
    registerMasterIndexKey(masterIndexKey);
    const invalidBackupId = createBackupIndexFile(rootFolderId, { invalid: 'data' }, 'invalid_backup.json');
    const database = new Database(config);

    // Act & Assert - Recovery should reject invalid structures
    try {
      database.recoverDatabase(invalidBackupId);
      throw new Error('Expected InvalidFileFormatError for invalid backup structure');
    } catch (error) {
      expect(error).toBeInstanceOf(InvalidFileFormatError);
      expect(error.message).toMatch(/Invalid backup file structure/);
    }
  });

  it('should validate backup file identifier arguments', () => {
    // Arrange - Database instance with otherwise valid configuration
    const { config, masterIndexKey } = createDatabaseTestConfig();
    registerMasterIndexKey(masterIndexKey);
    const database = new Database(config);

    // Act & Assert - Invalid identifiers should raise InvalidArgumentError without wrapping
    expect(() => database.recoverDatabase('')).toThrow(ErrorHandler.ErrorTypes.INVALID_ARGUMENT);
  });
});
