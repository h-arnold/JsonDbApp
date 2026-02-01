/**
 * Database initialisation and recovery refactor tests (Vitest)
 * Refactored from old_tests/unit/DatabaseInitializationRefactorTest.js
 */

import { describe, it, expect } from 'vitest';
import {
  createDatabaseConfig,
  trackFileId,
  trackMasterIndexKey,
  createTestFolder
} from '../../helpers/database-test-helpers.js';

const createLogger = () => JDbLogger.createComponentLogger('DatabaseRefactor-Test');

const createFileService = () => new FileService(new FileOperations(), createLogger());

describe('Database createDatabase()', () => {
  it('creates database with fresh MasterIndex', () => {
    const config = createDatabaseConfig({ masterIndexKey: trackMasterIndexKey(`GASDB_CREATE_TEST_${Date.now()}`) });
    const database = new Database(config);

    database.createDatabase();

    const masterIndex = new MasterIndex({ masterIndexKey: config.masterIndexKey });
    expect(masterIndex.isInitialised()).toBe(true);
    expect(Object.keys(masterIndex.getCollections()).length).toBe(0);
  });

  it('throws error if MasterIndex already exists', () => {
    const key = trackMasterIndexKey(`GASDB_CREATE_EXISTS_TEST_${Date.now()}`);
    const config = createDatabaseConfig({ masterIndexKey: key });
    const existing = new MasterIndex({ masterIndexKey: key });
    existing.addCollection('existingCollection', {
      name: 'existingCollection',
      fileId: 'existing-file-id',
      documentCount: 1
    });

    const database = new Database(config);
    expect(() => database.createDatabase()).toThrow();
  });
});

describe('Database initialise() refactor', () => {
  it('initialises from MasterIndex only', () => {
    const key = trackMasterIndexKey(`GASDB_INIT_ONLY_TEST_${Date.now()}`);
    const config = createDatabaseConfig({ masterIndexKey: key });
    const masterIndex = new MasterIndex({ masterIndexKey: key });
    masterIndex.addCollection('collection1', {
      name: 'collection1',
      fileId: 'file-id-1',
      documentCount: 5
    });
    masterIndex.addCollection('collection2', {
      name: 'collection2',
      fileId: 'file-id-2',
      documentCount: 3
    });

    const database = new Database(config);
    database.initialise();

    const collections = database.listCollections();
    expect(collections.length).toBe(2);
    expect(collections).toEqual(expect.arrayContaining(['collection1', 'collection2']));
  });

  it('throws error if MasterIndex is missing', () => {
    const key = trackMasterIndexKey(`GASDB_INIT_MISSING_TEST_${Date.now()}`);
    const config = createDatabaseConfig({ masterIndexKey: key });
    const database = new Database(config);

    expect(() => database.initialise()).toThrow();
  });

  it('throws error if MasterIndex is corrupted', () => {
    const key = trackMasterIndexKey(`GASDB_INIT_CORRUPT_TEST_${Date.now()}`);
    const config = createDatabaseConfig({ masterIndexKey: key });
    PropertiesService.getScriptProperties().setProperty(key, 'invalid-json-data');

    const database = new Database(config);
    expect(() => database.initialise()).toThrow();
  });

  it('persists sanitised collection names to MasterIndex when flag enabled', () => {
    const key = trackMasterIndexKey(`GASDB_INIT_SANITISE_${Date.now()}`);
    const config = createDatabaseConfig({
      masterIndexKey: key,
      stripDisallowedCollectionNameCharacters: true
    });
    const database = new Database(config);
    database.createDatabase();
    database.initialise();

    const collection = database.createCollection('sanitize/This');
    trackFileId(collection?.driveFileId);

    const masterIndex = new MasterIndex({ masterIndexKey: key });
    const collections = masterIndex.getCollections();
    expect(collections).toHaveProperty('sanitizeThis');
    expect(collections.sanitizeThis.name).toBe('sanitizeThis');
  });
});

describe('Database recoverDatabase() method', () => {
  it('recovers database from backup index file', () => {
    const key = trackMasterIndexKey(`GASDB_RECOVER_TEST_${Date.now()}`);
    const config = createDatabaseConfig({ masterIndexKey: key });
    const fileService = createFileService();
    const backupIndexData = {
      collections: {
        recoveredCollection1: {
          name: 'recoveredCollection1',
          fileId: 'recovered-file-id-1',
          documentCount: 4
        },
        recoveredCollection2: {
          name: 'recoveredCollection2',
          fileId: 'recovered-file-id-2',
          documentCount: 7
        }
      },
      lastUpdated: new Date(),
      version: 1
    };

    const backupFileId = fileService.createFile('backup_index.json', backupIndexData, config.rootFolderId);
    trackFileId(backupFileId);

    const database = new Database(config);
    const recoveredCollections = database.recoverDatabase(backupFileId);

    const masterIndex = new MasterIndex({ masterIndexKey: key });
    const collections = masterIndex.getCollections();
    expect(recoveredCollections.length).toBe(2);
    expect(collections).toHaveProperty('recoveredCollection1');
    expect(collections).toHaveProperty('recoveredCollection2');
  });

  it('throws error if backup file is invalid', () => {
    const key = trackMasterIndexKey(`GASDB_RECOVER_INVALID_TEST_${Date.now()}`);
    const config = createDatabaseConfig({ masterIndexKey: key });
    const fileService = createFileService();
    const invalidBackupFileId = fileService.createFile('invalid_backup.json', { invalid: 'data' }, config.rootFolderId);
    trackFileId(invalidBackupFileId);

    const database = new Database(config);
    expect(() => database.recoverDatabase(invalidBackupFileId)).toThrow();
  });
});

describe('Collection methods with no fallback', () => {
  it('accesses collection from MasterIndex only', () => {
    const key = trackMasterIndexKey(`GASDB_COLLECTION_ONLY_TEST_${Date.now()}`);
    const config = createDatabaseConfig({ masterIndexKey: key });
    const database = new Database(config);
    database.createDatabase();
    const masterIndex = new MasterIndex({ masterIndexKey: key });
    masterIndex.addCollection('testCollection', {
      name: 'testCollection',
      fileId: 'test-file-id',
      documentCount: 2
    });

    database.initialise();
    const collection = database.collection('testCollection');

    expect(collection).toBeDefined();
    expect(collection.name).toBe('testCollection');
  });

  it('throws error if collection not in MasterIndex and autoCreate disabled', () => {
    const key = trackMasterIndexKey(`GASDB_COLLECTION_NOT_FOUND_TEST_${Date.now()}`);
    const config = createDatabaseConfig({ masterIndexKey: key, autoCreateCollections: false });
    const database = new Database(config);
    database.createDatabase();
    database.initialise();

    expect(() => database.collection('nonExistentCollection')).toThrow();
  });
});
