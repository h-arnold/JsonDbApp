/**
 * Validation Test Helpers for Vitest
 * 
 * Provides utilities for setting up validation tests with pre-populated mock data.
 * These tests validate MongoDB-compatible operators against realistic datasets.
 */

import { ValidationMockData } from '../data/ValidationMockData.js';

/**
 * Generates a unique timestamp-based identifier
 * @returns {string} Timestamp identifier
 */
const generateTimestamp = () => `${Date.now()}_${Math.random().toString(36).slice(2)}`;

/**
 * Sets up a complete validation test environment with pre-populated collections
 * @returns {object} Test environment with database, collections, mock data, and cleanup metadata
 */
export const setupValidationTestEnvironment = () => {
  const masterIndexKey = `VIITEST_VALIDATION_${generateTimestamp()}`;
  const folderName = `GASDB_Validation_Test_${generateTimestamp()}`;
  const folder = DriveApp.createFolder(folderName);
  const folderId = folder.getId();
  
  // Track resources for cleanup
  const fileIds = [];
  const folderIds = [folderId];
  
  // Create logger
  const logger = JDbLogger.createComponentLogger("Validation-Test");
  
  // Create FileService dependencies
  const fileOps = new FileOperations(logger);
  const fileService = new FileService(fileOps, logger);
  
  // Create MasterIndex
  const masterIndex = new MasterIndex({ masterIndexKey, version: 1 });
  
  // Create DatabaseConfig
  const dbConfig = new DatabaseConfig({
    name: 'validationTestDB',
    rootFolderId: folderId
  });
  
  // Create mock database object
  const database = {
    name: 'validationTestDB',
    config: dbConfig,
    _masterIndex: masterIndex,
    _fileOps: fileOps,
    _fileService: fileService,
    getMasterIndex: () => masterIndex,
    _markDirty: () => { /* mock implementation */ }
  };
  
  // Prepare mock data
  const personsData = ValidationMockData.getPersons();
  
  // Create and populate persons collection
  const personsFolder = DriveApp.getFolderById(folderId);
  const fileName = 'persons.json';
  
  const documentsObj = {};
  personsData.forEach(doc => {
    documentsObj[doc._id] = doc;
  });
  
  const collectionData = {
    collection: 'persons',
    metadata: {
      version: 1,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      documentCount: personsData.length,
      modificationToken: `init-token-${generateTimestamp()}`
    },
    documents: documentsObj
  };

  const file = personsFolder.createFile(fileName, JSON.stringify(collectionData, null, 2));
  const personsFileId = file.getId();
  fileIds.push(personsFileId);
  
  // Register collection in master index
  const personsMetadata = {
    name: 'persons',
    fileId: personsFileId,
    created: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    documentCount: personsData.length,
    modificationToken: `token-${generateTimestamp()}`,
    lockStatus: null
  };
  
  const collectionMetadata = ObjectUtils.deserialise(ObjectUtils.serialise(personsMetadata));
  masterIndex.addCollection('persons', collectionMetadata);
  
  // Create Collection instance
  const personsCollection = new Collection(
    'persons',
    personsFileId,
    database,
    fileService
  );
  
  return {
    masterIndexKey,
    folderId,
    logger,
    fileService,
    masterIndex,
    dbConfig,
    database,
    collections: {
      persons: personsCollection
    },
    mockData: {
      persons: personsData
    },
    _cleanup: {
      masterIndexKey,
      fileIds,
      folderIds
    }
  };
};

/**
 * Cleanup function for validation tests
 * @param {object} env - Test environment object with _cleanup metadata
 */
export const cleanupValidationTests = (env) => {
  if (!env || !env._cleanup) {
    return;
  }
  
  const scriptProperties = PropertiesService.getScriptProperties();
  const { masterIndexKey, fileIds, folderIds } = env._cleanup;
  
  // Clean up master index key
  scriptProperties.deleteProperty(masterIndexKey);
  
  // Clean up files
  for (const fileId of fileIds) {
    try {
      const file = DriveApp.getFileById(fileId);
      file.setTrashed(true);
    } catch {
      // File may already be deleted, ignore
    }
  }
  
  // Clean up folders
  for (const folderId of folderIds) {
    try {
      const folder = DriveApp.getFolderById(folderId);
      folder.setTrashed(true);
    } catch {
      // Folder may already be deleted, ignore
    }
  }
};
