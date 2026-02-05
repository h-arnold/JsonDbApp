/**
 * Database Test Helpers for Vitest
 *
 * Provides setup and cleanup utilities for Database-focused tests.
 */

import { afterEach, expect } from 'vitest';
import { createMasterIndexKey, createTestFolder } from './collection-test-helpers.js';

/**
 * Tracks Drive files created during Database tests for cleanup.
 */
const databaseTestResources = {
  fileIds: new Set(),
  masterIndexKeys: new Set()
};

/**
 * Registers a master index key for cleanup after the test completes.
 * @param {string} masterIndexKey - Master index key to remove post-test.
 */
export const registerMasterIndexKey = (masterIndexKey) => {
  if (masterIndexKey) {
    databaseTestResources.masterIndexKeys.add(masterIndexKey);
  }
};

/**
 * Registers a Drive file for automatic cleanup after the test completes.
 * @param {string} fileId - Drive file identifier to mark for deletion.
 */
export const registerDatabaseFile = (fileId) => {
  if (fileId) {
    databaseTestResources.fileIds.add(fileId);
  }
};

/**
 * Creates a Drive-based backup index file and registers it for cleanup.
 * @param {string} rootFolderId - Folder identifier where the backup lives.
 * @param {Object} backupData - Serialised backup payload to persist.
 * @param {string} [fileName='database_backup.json'] - Optional backup filename.
 * @returns {string} Created backup file identifier.
 */
export const createBackupIndexFile = (
  rootFolderId,
  backupData,
  fileName = 'database_backup.json'
) => {
  const logger = JDbLogger.createComponentLogger('Database-Test-Helpers');
  const fileOps = new FileOperations(logger);
  const fileService = new FileService(fileOps, logger);
  const backupFileId = fileService.createFile(fileName, backupData, rootFolderId);
  registerDatabaseFile(backupFileId);
  return backupFileId;
};

/**
 * Creates a database configuration object with guaranteed isolation.
 * @param {Object} overrides - Optional configuration overrides.
 * @param {string} [overrides.masterIndexKey] - Custom master index key for the test.
 * @param {string} [overrides.rootFolderId] - Custom root folder identifier for Drive storage.
 * @returns {Object} Configuration data plus identifiers for the master index and folder.
 */
export const createDatabaseTestConfig = (overrides = {}) => {
  const masterIndexKey = overrides.masterIndexKey || createMasterIndexKey();
  const rootFolderId = overrides.rootFolderId || createTestFolder();
  registerMasterIndexKey(masterIndexKey);

  const config = {
    ...overrides,
    masterIndexKey,
    rootFolderId
  };

  return {
    config,
    masterIndexKey,
    rootFolderId
  };
};

/**
 * Sets up an isolated Database instance for testing.
 * @param {Object} overrides - Optional configuration overrides passed to the Database constructor.
 * @returns {Object} Test environment containing the Database instance and related identifiers.
 */
export const setupDatabaseTestEnvironment = (overrides = {}) => {
  const { config, masterIndexKey, rootFolderId } = createDatabaseTestConfig(overrides);
  const database = new Database(config);

  return {
    database,
    config: database.config,
    masterIndexKey,
    rootFolderId
  };
};

/**
 * Creates and initialises a Database instance with isolated storage.
 * @param {Object} overrides - Optional configuration overrides.
 * @returns {Object} Environment containing the ready Database instance and identifiers.
 */
export const setupInitialisedDatabase = (overrides = {}) => {
  const environment = setupDatabaseTestEnvironment(overrides);
  environment.database.createDatabase();
  environment.database.initialise();
  return environment;
};

/**
 * Cleans up Drive files created during Database tests.
 */
export const cleanupDatabaseTests = () => {
  const scriptProperties = PropertiesService.getScriptProperties();

  for (const masterIndexKey of databaseTestResources.masterIndexKeys) {
    try {
      scriptProperties.deleteProperty(masterIndexKey);
    } catch {
      // Property may already be cleared; ignore errors.
    }
  }

  for (const fileId of databaseTestResources.fileIds) {
    try {
      const file = DriveApp.getFileById(fileId);
      file.setTrashed(true);
    } catch {
      // File may already be deleted or never created; ignore errors.
    }
  }

  databaseTestResources.fileIds.clear();
  databaseTestResources.masterIndexKeys.clear();
};

/**
 * Generates a unique identifier for test collections or entities.
 * @param {string} prefix - Human-friendly descriptor prefix.
 * @returns {string} Unique name combining prefix, timestamp, and random suffix.
 */
export const generateUniqueName = (prefix) =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

/**
 * Verifies that a collection has been persisted to the MasterIndex with expected metadata.
 * @param {Object} databaseContext - Database context containing masterIndexKey and/or database.
 * @param {string} databaseContext.masterIndexKey - The master index key for the database.
 * @param {string} collectionName - The name of the collection to verify.
 * @param {Object} expectedMetadata - Expected metadata for the collection.
 * @param {string} expectedMetadata.fileId - Expected Drive file identifier for the collection.
 * @param {number} [expectedMetadata.documentCount] - Expected document count (optional, defaults to 0 if not specified).
 */
export const expectCollectionPersisted = (databaseContext, collectionName, expectedMetadata) => {
  const { masterIndexKey } = databaseContext;
  const { fileId, documentCount = 0 } = expectedMetadata;

  // Register the file for cleanup
  registerDatabaseFile(fileId);

  // Instantiate a new MasterIndex and read collection metadata
  const masterIndex = new MasterIndex({ masterIndexKey });
  const persistedMetadata = masterIndex.getCollection(collectionName);

  // Assert that the collection exists with expected properties
  expect(persistedMetadata).toBeInstanceOf(CollectionMetadata);
  expect(persistedMetadata?.name).toBe(collectionName);
  expect(persistedMetadata?.fileId).toBe(fileId);
  expect(persistedMetadata?.documentCount).toBe(documentCount);
};

afterEach(() => {
  cleanupDatabaseTests();
});
