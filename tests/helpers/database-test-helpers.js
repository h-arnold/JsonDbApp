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
  fileIds: new Set()
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
 * Creates a database configuration object with guaranteed isolation.
 * @param {Object} overrides - Optional configuration overrides.
 * @param {string} [overrides.masterIndexKey] - Custom master index key for the test.
 * @param {string} [overrides.rootFolderId] - Custom root folder identifier for Drive storage.
 * @returns {Object} Configuration data plus identifiers for the master index and folder.
 */
export const createDatabaseTestConfig = (overrides = {}) => {
  const masterIndexKey = overrides.masterIndexKey || createMasterIndexKey();
  const rootFolderId = overrides.rootFolderId || createTestFolder();

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
  for (const fileId of databaseTestResources.fileIds) {
    try {
      const file = DriveApp.getFileById(fileId);
      file.setTrashed(true);
    } catch {
      // File may already be deleted or never created; ignore errors.
    }
  }

  databaseTestResources.fileIds.clear();
};

afterEach(() => {
  cleanupDatabaseTests();
});
