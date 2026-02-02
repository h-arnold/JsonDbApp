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
  const ordersData = ValidationMockData.getOrders();
  
  const rootFolder = DriveApp.getFolderById(folderId);
  
  // Create and populate persons collection
  const personsDocumentsObj = {};
  personsData.forEach(doc => {
    personsDocumentsObj[doc._id] = doc;
  });
  
  const personsCollectionData = {
    collection: 'persons',
    metadata: {
      version: 1,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      documentCount: personsData.length,
      modificationToken: `init-token-${generateTimestamp()}`
    },
    documents: personsDocumentsObj
  };

  const personsFile = rootFolder.createFile('persons.json', JSON.stringify(personsCollectionData, null, 2));
  const personsFileId = personsFile.getId();
  fileIds.push(personsFileId);
  
  // Register persons collection in master index
  const personsMetadata = {
    name: 'persons',
    fileId: personsFileId,
    created: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    documentCount: personsData.length,
    modificationToken: `token-${generateTimestamp()}`,
    lockStatus: null
  };
  
  const personsCollectionMetadata = ObjectUtils.deserialise(ObjectUtils.serialise(personsMetadata));
  masterIndex.addCollection('persons', personsCollectionMetadata);
  
  // Create persons Collection instance
  const personsCollection = new Collection(
    'persons',
    personsFileId,
    database,
    fileService
  );
  
  // Create and populate orders collection
  const ordersDocumentsObj = {};
  ordersData.forEach(doc => {
    ordersDocumentsObj[doc._id] = doc;
  });
  
  const ordersCollectionData = {
    collection: 'orders',
    metadata: {
      version: 1,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      documentCount: ordersData.length,
      modificationToken: `init-token-${generateTimestamp()}`
    },
    documents: ordersDocumentsObj
  };

  const ordersFile = rootFolder.createFile('orders.json', JSON.stringify(ordersCollectionData, null, 2));
  const ordersFileId = ordersFile.getId();
  fileIds.push(ordersFileId);
  
  // Register orders collection in master index
  const ordersMetadata = {
    name: 'orders',
    fileId: ordersFileId,
    created: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    documentCount: ordersData.length,
    modificationToken: `token-${generateTimestamp()}`,
    lockStatus: null
  };
  
  const ordersCollectionMetadata = ObjectUtils.deserialise(ObjectUtils.serialise(ordersMetadata));
  masterIndex.addCollection('orders', ordersCollectionMetadata);
  
  // Create orders Collection instance
  const ordersCollection = new Collection(
    'orders',
    ordersFileId,
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
      persons: personsCollection,
      orders: ordersCollection
    },
    mockData: {
      persons: personsData,
      orders: ordersData
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
