/**
 * Validation Test Helpers for Vitest
 * 
 * Provides utilities for setting up validation tests with pre-populated mock data.
 * These tests validate MongoDB-compatible operators against realistic datasets.
 */

import { afterEach } from 'vitest';
import { ValidationMockData } from '../data/ValidationMockData.js';

/**
 * Tracks created Drive resources for cleanup
 */
const validationTestResources = {
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
 * Creates a unique master index key for validation testing
 * @returns {string} Master index key
 */
export const createValidationMasterIndexKey = () => {
  const key = `VIITEST_VALIDATION_${generateTimestamp()}`;
  validationTestResources.masterIndexKeys.add(key);
  return key;
};

/**
 * Creates a test folder in the mock Drive for validation tests
 * @returns {string} Folder ID
 */
export const createValidationTestFolder = () => {
  const folderName = `GASDB_Validation_Test_${generateTimestamp()}`;
  const folder = DriveApp.createFolder(folderName);
  const folderId = folder.getId();
  validationTestResources.folderIds.add(folderId);
  return folderId;
};

/**
 * Creates a collection file pre-populated with validation mock data
 * @param {string} folderId - Parent folder ID
 * @param {string} collectionName - Name of the collection
 * @param {Array<Object>} documents - Array of documents to populate
 * @returns {string} File ID
 */
export const createValidationCollectionFile = (folderId, collectionName, documents) => {
  const folder = DriveApp.getFolderById(folderId);
  const fileName = `${collectionName}.json`;
  
  // Build documents object from array
  const documentsObj = {};
  documents.forEach(doc => {
    documentsObj[doc._id] = doc;
  });
  
  const collectionData = {
    collection: collectionName,
    metadata: {
      version: 1,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      documentCount: documents.length,
      modificationToken: `init-token-${generateTimestamp()}`
    },
    documents: documentsObj
  };

  const file = folder.createFile(fileName, JSON.stringify(collectionData, null, 2));
  const fileId = file.getId();
  validationTestResources.fileIds.add(fileId);
  
  return fileId;
};

/**
 * Sets up a complete validation test environment with pre-populated collections
 * @returns {object} Test environment with database, collections, and mock data
 */
export const setupValidationTestEnvironment = () => {
  const masterIndexKey = createValidationMasterIndexKey();
  const folderId = createValidationTestFolder();
  
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
  const personsFileId = createValidationCollectionFile(folderId, 'persons', personsData);
  
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
    }
  };
};

/**
 * Cleanup function for validation tests
 */
export const cleanupValidationTests = () => {
  const scriptProperties = PropertiesService.getScriptProperties();
  
  // Clean up master index keys
  for (const key of validationTestResources.masterIndexKeys) {
    scriptProperties.deleteProperty(key);
  }
  
  // Clean up files
  for (const fileId of validationTestResources.fileIds) {
    try {
      const file = DriveApp.getFileById(fileId);
      file.setTrashed(true);
    } catch {
      // File may already be deleted, ignore
    }
  }
  
  // Clean up folders
  for (const folderId of validationTestResources.folderIds) {
    try {
      const folder = DriveApp.getFolderById(folderId);
      folder.setTrashed(true);
    } catch {
      // Folder may already be deleted, ignore
    }
  }
  
  // Clear tracking sets
  validationTestResources.masterIndexKeys.clear();
  validationTestResources.fileIds.clear();
  validationTestResources.folderIds.clear();
};

/**
 * Auto-register cleanup for afterEach
 */
afterEach(() => {
  cleanupValidationTests();
});
