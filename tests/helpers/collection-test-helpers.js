/**
 * Collection Test Helpers for Vitest
 *
 * Provides utilities for setting up and tearing down Collection tests in the Vitest environment.
 */

import { afterEach, expect } from 'vitest';
import {
  cleanupTestResources as cleanupTrackedResources,
  createMasterIndexKey as makeMasterIndexKey,
  createTestEnvironment,
  createTestFolder as makeTestFolder,
  createTestResourceTracker,
  createTrackedFile,
  generateTimestamp
} from './shared-test-helpers.js';

const testResources = createTestResourceTracker();

/**
 * Creates a unique master index key for testing
 * @returns {string} Master index key
 */
export const createMasterIndexKey = () => makeMasterIndexKey(testResources, 'VIITEST_COLLECTION_');

/**
 * Creates a test folder in the mock Drive
 * @returns {string} Folder ID
 */
export const createTestFolder = () => makeTestFolder(testResources, 'GASDB_Test_Collection_');

/**
 * Creates a test collection file in the specified folder
 * @param {string} folderId - Parent folder ID
 * @param {string} collectionName - Name of the collection
 * @returns {string} File ID
 */
export const createTestCollectionFile = (folderId, collectionName) => {
  const testData = {
    documents: {},
    metadata: {
      created: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      documentCount: 0
    }
  };

  return createTrackedFile(
    testResources,
    folderId,
    `${collectionName}.json`,
    JSON.stringify(testData, null, 2)
  );
};

/**
 * Creates a test collection file with custom content
 * @param {string} folderId - Parent folder ID
 * @param {string} fileName - Name of the file
 * @param {string} content - File content (raw string)
 * @returns {string} File ID
 */
export const createTestFileWithContent = (folderId, fileName, content) =>
  createTrackedFile(testResources, folderId, fileName, content);

/**
 * Sets up a complete test environment for Collection tests
 * @returns {object} Test environment with all necessary dependencies
 */
export const setupCollectionTestEnvironment = () => {
  const masterIndexKey = createMasterIndexKey();
  const folderId = createTestFolder();
  const environment = createTestEnvironment('Collection-Test', masterIndexKey, folderId, {
    /**
     * Marks the database as dirty (mock implementation)
     */
    _markDirty: () => {
      /* mock implementation */
    }
  });

  return { masterIndexKey, folderId, ...environment };
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
  const collection = new Collection(collectionName, fileId, env.database, env.fileService);

  return { collection, fileId };
};

/**
 * Registers a collection file in the master index and creates a Collection instance
 * @param {object} env - Environment from setupCollectionTestEnvironment
 * @param {string} collectionName - Name for the collection
 * @param {string} fileId - File ID of the collection file
 * @param {number} documentCount - Document count for metadata (optional, defaults to 0)
 * @returns {object} Collection instance
 */
export const registerAndCreateCollection = (env, collectionName, fileId, documentCount = 0) => {
  // Register collection in master index
  const metadataData = {
    name: collectionName,
    fileId: fileId,
    created: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    documentCount: documentCount,
    modificationToken: `token-${Date.now()}`,
    lockStatus: null
  };

  const collectionMetadata = ObjectUtils.deserialise(ObjectUtils.serialise(metadataData));
  env.masterIndex.addCollection(collectionName, collectionMetadata);

  // Create Collection instance
  const collection = new Collection(collectionName, fileId, env.database, env.fileService);

  return collection;
};

/**
 * Creates an isolated collection with a fresh environment
 * @param {string} collectionName - Name for the collection
 * @returns {{env: object, collection: Collection, fileId: string}} Environment, collection instance, and file ID
 */
export const createIsolatedTestCollection = (collectionName) => {
  const env = setupCollectionTestEnvironment();
  const { collection, fileId } = createTestCollection(env, collectionName);
  return { env, collection, fileId };
};

/**
 * Seeds a collection with standard test employee data
 * @param {object} collection - Collection instance to seed
 * @returns {object} Object containing inserted document IDs { aliceId, bobId, charlieId }
 */
export const seedStandardEmployees = (collection) => {
  const aliceResult = collection.insertOne({
    name: 'Alice',
    department: 'Engineering',
    salary: 75000
  });
  const bobResult = collection.insertOne({ name: 'Bob', department: 'Marketing', salary: 65000 });
  const charlieResult = collection.insertOne({
    name: 'Charlie',
    department: 'Engineering',
    salary: 80000
  });

  return {
    aliceId: aliceResult.insertedId,
    bobId: bobResult.insertedId,
    charlieId: charlieResult.insertedId
  };
};

/**
 * Validates MongoDB-style write result objects
 * @param {object} result - Write operation result to validate
 * @param {object} [expectedCounts] - Optional object with expected count properties
 * @param {number} [expectedCounts.matchedCount] - Expected number of matched documents
 * @param {number} [expectedCounts.modifiedCount] - Expected number of modified documents
 * @param {number} [expectedCounts.deletedCount] - Expected number of deleted documents
 * @param {string} [expectedCounts.insertedId] - Expected inserted document ID
 */
export const assertAcknowledgedWrite = (result, expectedCounts = {}) => {
  // Basic assertions
  expect(result).toBeDefined();
  expect(result.acknowledged).toBe(true);

  // Optional count assertions
  if (expectedCounts.matchedCount !== undefined) {
    expect(result.matchedCount).toBe(expectedCounts.matchedCount);
  }

  if (expectedCounts.modifiedCount !== undefined) {
    expect(result.modifiedCount).toBe(expectedCounts.modifiedCount);
  }

  if (expectedCounts.deletedCount !== undefined) {
    expect(result.deletedCount).toBe(expectedCounts.deletedCount);
  }

  if (expectedCounts.insertedId !== undefined) {
    expect(result.insertedId).toBe(expectedCounts.insertedId);
  }
};

/**
 * Cleanup function - automatically registered with afterEach
 */
export const cleanupCollectionTests = () => {
  cleanupTrackedResources(testResources);
};

/**
 * Auto-register cleanup for afterEach
 * Import this module to automatically clean up after each test
 */
afterEach(() => {
  cleanupCollectionTests();
});
