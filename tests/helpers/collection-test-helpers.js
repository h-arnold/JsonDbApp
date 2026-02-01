/**
 * Collection Test Helpers for Vitest
 * 
 * Provides utilities for setting up and tearing down Collection tests in the Vitest environment.
 */

import { afterEach } from 'vitest';

/**
 * Tracks created Drive resources for cleanup
 */
const testResources = {
  fileIds: new Set(),
  folderIds: new Set(),
  masterIndexKeys: new Set()
};

/**
 * Generates a unique timestamp-based identifier
 * @returns {string} Timestamp identifier
 */
const generateTimestamp = () => `${Date.now()}_${Math.random().toString(36).slice(2)}`;

/**
 * Creates a unique master index key for testing
 * @returns {string} Master index key
 */
export const createMasterIndexKey = () => {
  const key = `VIITEST_COLLECTION_${generateTimestamp()}`;
  testResources.masterIndexKeys.add(key);
  return key;
};

/**
 * Creates a test folder in the mock Drive
 * @returns {string} Folder ID
 */
export const createTestFolder = () => {
  const folderName = `GASDB_Test_Collection_${generateTimestamp()}`;
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
    documents: {},
    metadata: {
      created: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      documentCount: 0
    }
  };

  const file = folder.createFile(fileName, JSON.stringify(testData, null, 2));
  const fileId = file.getId();
  testResources.fileIds.add(fileId);
  
  return fileId;
};

/**
 * Creates a test collection file with custom content
 * @param {string} folderId - Parent folder ID
 * @param {string} fileName - Name of the file
 * @param {string} content - File content (raw string)
 * @returns {string} File ID
 */
export const createTestFileWithContent = (folderId, fileName, content) => {
  const folder = DriveApp.getFolderById(folderId);
  const file = folder.createFile(fileName, content);
  const fileId = file.getId();
  testResources.fileIds.add(fileId);
  return fileId;
};

/**
 * Sets up a complete test environment for Collection tests
 * @returns {object} Test environment with all necessary dependencies
 */
export const setupCollectionTestEnvironment = () => {
  const masterIndexKey = createMasterIndexKey();
  const folderId = createTestFolder();
  
  // Create logger
  const logger = JDbLogger.createComponentLogger("Collection-Test");
  
  // Create FileService dependencies
  const fileOps = new FileOperations(logger);
  const fileService = new FileService(fileOps, logger);
  
  // Create MasterIndex
  const masterIndex = new MasterIndex({ masterIndexKey, version: 1 });
  
  // Create DatabaseConfig
  const dbConfig = new DatabaseConfig({
    name: 'testDB',
    rootFolderId: folderId
  });
  
  // Create mock database object
  const database = {
    name: 'testDB',
    config: dbConfig,
    _masterIndex: masterIndex,
    _fileOps: fileOps,
    _fileService: fileService,
    getMasterIndex: () => masterIndex,
    _markDirty: () => { /* mock implementation */ }
  };
  
  return {
    masterIndexKey,
    folderId,
    logger,
    fileService,
    masterIndex,
    dbConfig,
    database
  };
};

/**
 * Creates a Collection instance with proper registration
 * @param {object} env - Environment from setupCollectionTestEnvironment
 * @param {string} collectionName - Name for the collection
 * @returns {object} Object containing collection and fileId
 */
export const createTestCollection = (env, collectionName) => {
  const fileId = createTestCollectionFile(env.folderId, collectionName);
  
  // Register collection in master index
  const metadataData = {
    name: collectionName,
    fileId: fileId,
    created: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    documentCount: 0,
    modificationToken: `token-${generateTimestamp()}`,
    lockStatus: null
  };
  
  const collectionMetadata = ObjectUtils.deserialise(ObjectUtils.serialise(metadataData));
  env.masterIndex.addCollection(collectionName, collectionMetadata);
  
  // Create Collection instance
  const collection = new Collection(
    collectionName,
    fileId,
    env.database,
    env.fileService
  );
  
  return { collection, fileId };
};

/**
 * Cleanup function - automatically registered with afterEach
 */
export const cleanupCollectionTests = () => {
  const scriptProperties = PropertiesService.getScriptProperties();
  
  // Clean up master index keys
  for (const key of testResources.masterIndexKeys) {
    scriptProperties.deleteProperty(key);
  }
  
  // Clean up files
  for (const fileId of testResources.fileIds) {
    try {
      const file = DriveApp.getFileById(fileId);
      file.setTrashed(true);
    } catch {
      // File may already be deleted, ignore
    }
  }
  
  // Clean up folders
  for (const folderId of testResources.folderIds) {
    try {
      const folder = DriveApp.getFolderById(folderId);
      folder.setTrashed(true);
    } catch {
      // Folder may already be deleted, ignore
    }
  }
  
  // Clear tracking sets
  testResources.masterIndexKeys.clear();
  testResources.fileIds.clear();
  testResources.folderIds.clear();
};

/**
 * Auto-register cleanup for afterEach
 * Import this module to automatically clean up after each test
 */
afterEach(() => {
  cleanupCollectionTests();
});
