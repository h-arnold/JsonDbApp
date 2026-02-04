/**
 * DocumentOperations Test Helpers for Vitest
 *
 * Provides utilities for setting up and tearing down DocumentOperations tests.
 */

import { afterEach } from 'vitest';

const testResources = {
  fileIds: new Set(),
  folderIds: new Set()
};

/**
 * Generates unique timestamp-based identifier
 * @returns {string} Unique identifier
 */
const generateTimestamp = () => `${Date.now()}_${Math.random().toString(36).slice(2)}`;

/**
 * Creates a test folder in mock Drive
 * @returns {string} Folder ID
 */
export const createTestFolder = () => {
  const folderName = `GASDB_Test_DocOps_${generateTimestamp()}`;
  const folder = DriveApp.createFolder(folderName);
  const folderId = folder.getId();
  testResources.folderIds.add(folderId);
  return folderId;
};

/**
 * Creates a test collection file in the specified folder
 * @param {string} folderId - Parent folder ID
 * @param {string} collectionName - Name of the collection
 * @returns {string} File ID
 */
export const createTestCollectionFile = (folderId, collectionName) => {
  const folder = DriveApp.getFolderById(folderId);
  const fileName = `${collectionName}.json`;

  const testData = {
    collection: collectionName,
    metadata: {
      version: 1,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      documentCount: 0
    },
    documents: {}
  };

  const file = folder.createFile(fileName, JSON.stringify(testData, null, 2), 'application/json');
  const fileId = file.getId();
  testResources.fileIds.add(fileId);
  return fileId;
};

/**
 * Sets up complete test environment for DocumentOperations tests
 * @returns {object} Test environment with collection, logger, and resource IDs
 */
export const setupTestEnvironment = () => {
  const folderId = createTestFolder();
  const collectionName = `documentOperationsTest_${generateTimestamp()}`;
  const fileId = createTestCollectionFile(folderId, collectionName);

  const logger = JDbLogger.createComponentLogger('DocumentOps-Test');
  const fileOps = new FileOperations(logger);
  const fileService = new FileService(fileOps, logger);

  const testCollection = {
    _documents: {},
    _metadata: {
      created: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      documentCount: 0
    },
    _driveFileId: fileId,
    _fileService: fileService,
    _isDirty: false,
    name: collectionName,
    /**
     * Gets Drive file ID
     * @returns {string} File ID
     */
    getDriveFileId() {
      return this._driveFileId;
    },
    /**
     * Gets metadata
     * @returns {object} Metadata
     */
    getMetadata() {
      return this._metadata;
    },
    /**
     * Marks collection as dirty
     */
    _markDirty() {
      this._isDirty = true;
    },
    /**
     * Updates metadata timestamp
     */
    _updateMetadata() {
      this._metadata.lastUpdated = new Date().toISOString();
      this._markDirty();
    },
    /**
     * Loads data from file
     */
    _loadData() {
      try {
        const data = this._fileService.readFile(this._driveFileId);
        this._documents = data.documents || {};
        this._metadata = data.metadata || this._metadata;
      } catch {
        this._documents = {};
      }
    },
    /**
     * Saves data to file
     */
    _saveData() {
      if (this._isDirty) {
        const data = {
          collection: this.name,
          metadata: this._metadata,
          documents: this._documents
        };
        this._fileService.writeFile(this._driveFileId, data);
        this._isDirty = false;
      }
    }
  };

  testCollection._loadData();

  return {
    folderId,
    fileId,
    collection: testCollection,
    logger
  };
};

/**
 * Cleanup function - automatically registered with afterEach
 */
export const cleanupTestResources = () => {
  testResources.fileIds.forEach((fileId) => {
    try {
      DriveApp.getFileById(fileId).setTrashed(true);
    } catch {
      // Ignore cleanup errors
    }
  });

  testResources.folderIds.forEach((folderId) => {
    try {
      DriveApp.getFolderById(folderId).setTrashed(true);
    } catch {
      // Ignore cleanup errors
    }
  });

  testResources.fileIds.clear();
  testResources.folderIds.clear();
};

/**
 * Resets a collection to initial empty state
 * @param {object} collection - Collection to reset
 */
export const resetCollection = (collection) => {
  collection._documents = {};
  collection._metadata = {
    created: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    documentCount: 0
  };
  collection._isDirty = true;
  collection._saveData();
};

/**
 * Auto-register cleanup for afterEach
 */
afterEach(() => {
  cleanupTestResources();
});
