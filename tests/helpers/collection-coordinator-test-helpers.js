/**
 * CollectionCoordinator Test Helpers for Vitest
 * 
 * Provides utilities for setting up and tearing down CollectionCoordinator tests.
 */

import { afterEach } from 'vitest';

/**
 * Tracks created test resources for cleanup
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
  const key = `VIITEST_COORDINATOR_${generateTimestamp()}`;
  testResources.masterIndexKeys.add(key);
  return key;
};

/**
 * Creates a test folder in the mock Drive
 * @returns {string} Folder ID
 */
export const createTestFolder = () => {
  const folderName = `GASDB_Test_Coordinator_${generateTimestamp()}`;
  const folder = DriveApp.createFolder(folderName);
  const folderId = folder.getId();
  testResources.folderIds.add(folderId);
  return folderId;
};

/**
 * Creates a test collection file with initial test data
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
      documentCount: 3,
      modificationToken: `initial-token-${Date.now()}`
    },
    documents: {
      'coord-test-1': {
        _id: 'coord-test-1',
        name: 'Test Document 1',
        category: 'testing',
        value: 100,
        active: true,
        created: new Date().toISOString()
      },
      'coord-test-2': {
        _id: 'coord-test-2',
        name: 'Test Document 2',
        category: 'coordination',
        value: 200,
        active: false,
        created: new Date().toISOString()
      },
      'coord-test-3': {
        _id: 'coord-test-3',
        name: 'Test Document 3',
        category: 'testing',
        value: 300,
        active: true,
        created: new Date().toISOString()
      }
    }
  };

  const file = folder.createFile(fileName, JSON.stringify(testData, null, 2));
  const fileId = file.getId();
  testResources.fileIds.add(fileId);
  
  return fileId;
};

/**
 * Sets up a complete test environment for CollectionCoordinator tests
 * @returns {object} Test environment with all necessary dependencies
 */
export const setupCoordinatorTestEnvironment = () => {
  const masterIndexKey = createMasterIndexKey();
  const folderId = createTestFolder();
  
  // Create logger
  const logger = JDbLogger.createComponentLogger("CollectionCoordinator-Test");
  
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
    /**
     * Gets the master index
     * @returns {Object} The master index
     */
    getMasterIndex: () => masterIndex
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
 * Creates a Collection instance with proper registration in master index
 * @param {object} env - Environment from setupCoordinatorTestEnvironment
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
    documentCount: 3,
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
  
  // Load the collection
  collection._ensureLoaded();
  
  return { collection, fileId };
};

/**
 * Creates a CollectionCoordinator instance with specified configuration
 * @param {object} collection - Collection instance
 * @param {object} masterIndex - MasterIndex instance
 * @param {object} config - Optional configuration overrides
 * @returns {object} CollectionCoordinator instance
 */
export const createTestCoordinator = (collection, masterIndex, config = {}) => {
  return new CollectionCoordinator(collection, masterIndex, config);
};

/**
 * Cleanup function - removes all test resources
 */
export const cleanupCoordinatorTests = () => {
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
 */
afterEach(() => {
  cleanupCoordinatorTests();
});
