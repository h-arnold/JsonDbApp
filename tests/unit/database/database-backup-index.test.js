/**
 * Database Backup Index Tests
 *
 * Ports legacy backup index behaviours into the Vitest suite.
 */

import { describe, it, expect } from 'vitest';
import {
  registerDatabaseFile,
  setupDatabaseTestEnvironment,
  setupInitialisedDatabase
} from '../../helpers/database-test-helpers.js';

/**
 * Generates a unique identifier for collections within tests.
 * @param {string} prefix - Prefix aiding traceability when tests fail.
 * @returns {string} Unique collection name.
 */
const generateUniqueCollectionName = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

/**
 * Lists backup index files stored inside the provided Drive folder.
 * @param {string} folderId - Identifier for the Drive folder to inspect.
 * @returns {Array<{id: string, name: string}>} Matching file descriptors.
 */
const listBackupIndexFiles = (folderId) => {
  const folder = DriveApp.getFolderById(folderId);
  const files = folder.getFiles();
  const matches = [];

  while (files.hasNext()) {
    const file = files.next();
    const name = file.getName();
    if (name.includes('database_index') && name.endsWith('.json')) {
      matches.push({ id: file.getId(), name });
    }
  }

  return matches;
};

/**
 * Registers newly discovered backup index files to ensure cleanup.
 * @param {Set<string>} knownFileIds - Set of file IDs already tracked.
 * @param {Array<{id: string}>} files - Files detected during inspection.
 */
const registerNewIndexFiles = (knownFileIds, files) => {
  files.forEach((file) => {
    if (!knownFileIds.has(file.id)) {
      registerDatabaseFile(file.id);
      knownFileIds.add(file.id);
    }
  });
};

describe('Database backup index', () => {
  it('should not create a backup index during initialise or collection creation when disabled', () => {
    // Arrange - Disable backup creation for this database instance
    const { database, rootFolderId } = setupDatabaseTestEnvironment({ backupOnInitialise: false });
    database.createDatabase();
    const initialFiles = listBackupIndexFiles(rootFolderId);
    const trackedFileIds = new Set(initialFiles.map((file) => file.id));

    // Act - Initialise the database then create a collection
    database.initialise();
    const afterInitialiseFiles = listBackupIndexFiles(rootFolderId);
    registerNewIndexFiles(trackedFileIds, afterInitialiseFiles);

    const collectionName = generateUniqueCollectionName('noBackup');
    const collection = database.createCollection(collectionName);
    registerDatabaseFile(collection.getDriveFileId());

    const afterCollectionFiles = listBackupIndexFiles(rootFolderId);
    registerNewIndexFiles(trackedFileIds, afterCollectionFiles);

    // Assert - No index file should be created at any point
    expect(afterInitialiseFiles).toHaveLength(initialFiles.length);
    expect(afterCollectionFiles).toHaveLength(initialFiles.length);
  });

  it('should create a backup index during initialise when enabled', () => {
    // Arrange - Enable backup creation before initialising the database
    const { database, rootFolderId } = setupDatabaseTestEnvironment({ backupOnInitialise: true });
    database.createDatabase();
    const initialFiles = listBackupIndexFiles(rootFolderId);
    const trackedFileIds = new Set(initialFiles.map((file) => file.id));

    // Act - Initialise to trigger backup creation
    database.initialise();
    const finalFiles = listBackupIndexFiles(rootFolderId);
    registerNewIndexFiles(trackedFileIds, finalFiles);

    // Assert - At least one new backup file should exist
    expect(finalFiles.length).toBeGreaterThan(initialFiles.length);
  });

  it('should not create a backup index when createCollection runs with backups disabled', () => {
    // Arrange - Start from an initialised database with backups disabled
    const { database, rootFolderId } = setupInitialisedDatabase({ backupOnInitialise: false });
    const initialFiles = listBackupIndexFiles(rootFolderId);
    const trackedFileIds = new Set(initialFiles.map((file) => file.id));
    const collectionName = generateUniqueCollectionName('collectionOnly');

    // Act - Create a collection and record Drive artefacts
    const collection = database.createCollection(collectionName);
    registerDatabaseFile(collection.getDriveFileId());
    const finalFiles = listBackupIndexFiles(rootFolderId);
    registerNewIndexFiles(trackedFileIds, finalFiles);

    // Assert - No additional backup files should appear
    expect(finalFiles).toHaveLength(initialFiles.length);
  });
});
