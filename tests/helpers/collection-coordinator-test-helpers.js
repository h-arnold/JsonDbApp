/**
 * CollectionCoordinator Test Helpers for Vitest
 *
 * Provides utilities for setting up and tearing down CollectionCoordinator tests.
 */

import { afterEach } from 'vitest';
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
export const createMasterIndexKey = () => makeMasterIndexKey(testResources, 'VIITEST_COORDINATOR_');

/**
 * Creates a test folder in the mock Drive
 * @returns {string} Folder ID
 */
export const createTestFolder = () => makeTestFolder(testResources, 'GASDB_Test_Coordinator_');

/**
 * Builds the standard three-document fixture used by coordinator collection files.
 * @param {string} collectionName - Name of the collection
 * @returns {object} Collection payload with metadata and three documents
 */
const buildCoordinatorTestData = (collectionName) => ({
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
});

/**
 * Creates a test collection file with initial test data
 * @param {string} folderId - Parent folder ID
 * @param {string} collectionName - Name of the collection
 * @returns {string} File ID
 */
export const createTestCollectionFile = (folderId, collectionName) =>
  createTrackedFile(
    testResources,
    folderId,
    `${collectionName}.json`,
    JSON.stringify(buildCoordinatorTestData(collectionName), null, 2)
  );

/**
 * Sets up a complete test environment for CollectionCoordinator tests
 * @returns {object} Test environment with all necessary dependencies
 */
export const setupCoordinatorTestEnvironment = () => {
  const masterIndexKey = createMasterIndexKey();
  const folderId = createTestFolder();
  const environment = createTestEnvironment('CollectionCoordinator-Test', masterIndexKey, folderId);

  return { masterIndexKey, folderId, ...environment };
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
  const collection = new Collection(collectionName, fileId, env.database, env.fileService);

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
 * Creates a factory for coordinators bound to a test fixture's collection and master index.
 * @param {object} collection - Collection instance
 * @param {object} masterIndex - MasterIndex instance
 * @returns {Function} Factory taking config overrides and returning a coordinator
 */
export const createBoundCoordinatorFactory =
  (collection, masterIndex) =>
  (config = {}) =>
    createTestCoordinator(collection, masterIndex, config);

/**
 * Cleanup function - removes all test resources
 */
export const cleanupCoordinatorTests = () => {
  cleanupTrackedResources(testResources);
};

/**
 * Resets collection state to initial test data
 * @param {object} collection - Collection instance to reset
 * @param {string} fileId - File ID of the collection
 */
export const resetCollectionState = (collection, fileId) => {
  const file = DriveApp.getFileById(fileId);
  file.setContent(JSON.stringify(buildCoordinatorTestData(collection.name), null, 2));

  collection._isDirty = true;
  collection._ensureLoaded();
};

/**
 * Simulates a collection conflict by updating the master index token
 * @param {object} masterIndex - MasterIndex instance
 * @param {string} collectionName - Name of the collection
 */
export const simulateConflict = (masterIndex, collectionName) => {
  const conflictToken = `conflict-token-${Date.now()}`;
  masterIndex.updateCollectionMetadata(collectionName, {
    modificationToken: conflictToken
  });
};

/**
 * Auto-register cleanup for afterEach
 */
afterEach(() => {
  cleanupCoordinatorTests();
});
