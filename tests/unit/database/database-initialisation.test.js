/**
 * Database Initialisation Tests
 *
 * Ports legacy Database initialisation scenarios into the Vitest suite.
 */

import { describe, it, expect } from 'vitest';
import {
  createDatabaseTestConfig,
  setupDatabaseTestEnvironment,
  registerDatabaseFile
} from '../../helpers/database-test-helpers.js';

const MIN_INDEX_ID_LENGTH = 10;

/**
 * Generates a unique identifier for test collections.
 * @param {string} prefix - Text prefix to make the name descriptive.
 * @returns {string} Unique collection name.
 */
const generateUniqueName = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

describe('Database Initialisation', () => {
  it('should create Database with default configuration', () => {
    // Arrange - No additional setup required for default constructor

    // Act - Instantiate Database with default configuration
    const database = new Database();

    // Assert - Defaults should be applied
    expect(database).toBeDefined();
    expect(database.config).toBeInstanceOf(DatabaseConfig);
    expect(database.collections).toBeInstanceOf(Map);
    expect(database.indexFileId).toBeNull();
  });

  it('should create Database with custom configuration', () => {
    // Arrange - Build an explicit configuration for the Database
    const { config, masterIndexKey, rootFolderId } = createDatabaseTestConfig({
      autoCreateCollections: false,
      backupOnInitialise: true,
      logLevel: 'DEBUG'
    });

    // Act - Instantiate Database using the custom configuration
    const database = new Database(config);

    // Assert - Custom configuration should be applied
    expect(database.config.masterIndexKey).toBe(masterIndexKey);
    expect(database.config.rootFolderId).toBe(rootFolderId);
    expect(database.config.autoCreateCollections).toBe(false);
    expect(database.config.backupOnInitialise).toBe(true);
    expect(database.config.logLevel).toBe('DEBUG');
  });

  it('should create an index file during initialise when backup is enabled', () => {
    // Arrange - Prepare Database configured to backup on initialise
    const { database } = setupDatabaseTestEnvironment({ backupOnInitialise: true });

    // Act - Create the database and trigger initialise()
    database.createDatabase();
    database.initialise();

    // Assert - Index file should be created and look valid
    expect(database.indexFileId).toBeDefined();
    expect(typeof database.indexFileId).toBe('string');
    expect(database.indexFileId.length).toBeGreaterThan(MIN_INDEX_ID_LENGTH);
    registerDatabaseFile(database.indexFileId);
  });

  it('should load existing collections during initialise when index exists', () => {
    // Arrange - Create and initialise the database, then add a collection
    const { database, config, masterIndexKey } = setupDatabaseTestEnvironment();
    const collectionName = generateUniqueName('existingCollection');

    database.createDatabase();
    database.initialise();
    database.createCollection(collectionName);

    const masterIndex = new MasterIndex({ masterIndexKey });
    const persistedCollections = masterIndex.getCollections();
    const createdCollection = persistedCollections[collectionName];
    expect(createdCollection).toBeDefined();
    registerDatabaseFile(createdCollection?.fileId);

    // Act - Instantiate a fresh Database instance with the same configuration
    const rehydratedDatabase = new Database(config.clone());
    rehydratedDatabase.initialise();
    const collections = rehydratedDatabase.listCollections();

    // Assert - The existing collection should be discovered
    expect(collections).toContain(collectionName);
  });
});
