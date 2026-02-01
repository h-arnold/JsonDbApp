/**
 * Database Test Helpers for Vitest
 *
 * Provides setup and cleanup utilities for Database-focused tests.
 */

import { afterEach } from 'vitest';
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
export const createBackupIndexFile = (rootFolderId, backupData, fileName = 'database_backup.json') => {
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

afterEach(() => {
  cleanupDatabaseTests();
});
