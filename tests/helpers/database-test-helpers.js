/**
 * Database Test Helpers for Vitest
 *
 * Provides utilities for setting up database tests and cleaning up created
 * Drive resources and ScriptProperties.
 */

import { afterEach } from 'vitest';

const scriptProperties = PropertiesService.getScriptProperties();

const trackedResources = {
  masterIndexKeys: new Set(),
  fileIds: new Set(),
  folderIds: new Set()
};

const generateId = () => `${Date.now()}_${Math.random().toString(36).slice(2)}`;

export const trackMasterIndexKey = (key) => {
  trackedResources.masterIndexKeys.add(key);
  return key;
};

export const trackFileId = (fileId) => {
  if (fileId) {
    trackedResources.fileIds.add(fileId);
  }
  return fileId;
};

export const trackFolderId = (folderId) => {
  if (folderId) {
    trackedResources.folderIds.add(folderId);
  }
  return folderId;
};

export const createTestFolder = () => {
  const folder = DriveApp.createFolder(`GASDB_DB_Test_${generateId()}`);
  return trackFolderId(folder.getId());
};

export const createDatabaseConfig = (options = {}) => {
  const masterIndexKey = trackMasterIndexKey(
    options.masterIndexKey || `VITEST_DB_MASTER_INDEX_${generateId()}`
  );
  const rootFolderId = options.rootFolderId || createTestFolder();
  return new DatabaseConfig({
    rootFolderId,
    masterIndexKey,
    ...options
  });
};

export const createInitialisedDatabase = (options = {}) => {
  const config = createDatabaseConfig(options);
  const database = new Database(config);
  database.createDatabase();
  database.initialise();
  return { database, config };
};

afterEach(() => {
  for (const key of trackedResources.masterIndexKeys) {
    try {
      scriptProperties.deleteProperty(key);
    } catch (error) {
      // ignore cleanup errors in mocks
    }
  }
  trackedResources.masterIndexKeys.clear();

  for (const fileId of trackedResources.fileIds) {
    try {
      const file = DriveApp.getFileById(fileId);
      file.setTrashed(true);
    } catch (error) {
      // ignore missing files in mocks
    }
  }
  trackedResources.fileIds.clear();

  for (const folderId of trackedResources.folderIds) {
    try {
      const folder = DriveApp.getFolderById(folderId);
      folder.setTrashed(true);
    } catch (error) {
      // ignore missing folders in mocks
    }
  }
  trackedResources.folderIds.clear();
});
