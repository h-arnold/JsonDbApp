/* global Database, DatabaseConfig, MasterIndex, PropertiesService, MasterIndexError */

/**
 * Database Initialisation Tests
 *
 * Ports legacy Database initialisation scenarios into the Vitest suite.
 */

import { describe, it, expect } from 'vitest';
import {
  createDatabaseTestConfig,
  setupDatabaseTestEnvironment,
  registerDatabaseFile,
  registerMasterIndexKey,
  generateUniqueName
} from '../../helpers/database-test-helpers.js';

const MIN_INDEX_ID_LENGTH = 10;

describe('Database Initialisation', () => {
  describe('constructor', () => {
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
  });

  describe('initialise()', () => {
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

    it('should retain collectionLockLeaseMs when initialising the MasterIndex facade', () => {
      const { database } = setupDatabaseTestEnvironment({
        collectionLockLeaseMs: 4321,
        coordinationTimeoutMs: 4000
      });

      database.createDatabase();
      database.initialise();

      expect(database._masterIndex._config.lockTimeout).toBe(4321);
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

    it('should throw when the MasterIndex property is missing', () => {
      // Arrange - Ensure the ScriptProperties key is absent before initialisation
      const { config, masterIndexKey } = createDatabaseTestConfig();
      registerMasterIndexKey(masterIndexKey);
      PropertiesService.getScriptProperties().deleteProperty(masterIndexKey);
      const database = new Database(config);

      // Act & Assert - Initialisation should fail with a descriptive error
      try {
        database.initialise();
        throw new Error('Expected MasterIndexError when MasterIndex property is missing');
      } catch (error) {
        expect(error).toBeInstanceOf(MasterIndexError);
        expect(error.message).toMatch(/MasterIndex not found/);
      }
    });

    it('should throw when the MasterIndex property contains invalid JSON', () => {
      // Arrange - Persist corrupted data to ScriptProperties
      const { config, masterIndexKey } = createDatabaseTestConfig();
      registerMasterIndexKey(masterIndexKey);
      PropertiesService.getScriptProperties().setProperty(masterIndexKey, '{not-json');
      const database = new Database(config);

      // Act & Assert - Initialisation should surface the JSON parsing failure
      try {
        database.initialise();
        throw new Error('Expected MasterIndexError when MasterIndex contains invalid JSON');
      } catch (error) {
        expect(error).toBeInstanceOf(MasterIndexError);
        expect(error.message).toMatch(/Master index error during load/);
      }
    });

    it('should persist sanitised collection names when sanitisation is enabled', () => {
      // Arrange - Enable sanitisation to strip illegal characters from names
      const { database, masterIndexKey } = setupDatabaseTestEnvironment({
        stripDisallowedCollectionNameCharacters: true
      });

      database.createDatabase();
      database.initialise();

      // Act - Create a collection with disallowed characters
      database.createCollection('sanitize/This');

      // Assert - MasterIndex should receive the sanitised name
      const masterIndex = new MasterIndex({ masterIndexKey });
      const collections = masterIndex.getCollections();
      expect(Object.keys(collections)).toContain('sanitizeThis');
      const sanitisedMetadata = collections.sanitizeThis;
      registerDatabaseFile(sanitisedMetadata.fileId);
      expect(sanitisedMetadata.name).toBe('sanitizeThis');

      const listedCollections = database.listCollections();
      expect(listedCollections).toContain('sanitizeThis');
    });
  });

  describe('Config propagation', () => {
    it('should propagate logLevel config to JDbLogger', () => {
      // Arrange - Save original level to restore after test
      const originalLevel = JDbLogger.getLevel();

      // Act - Create Database with explicit logLevel
      const { database } = setupDatabaseTestEnvironment({ logLevel: 'ERROR' });

      // Assert - JDbLogger.currentLevel should match configured logLevel
      expect(JDbLogger.getLevel()).toBe(JDbLogger.LOG_LEVELS.ERROR);
      expect(database.config.logLevel).toBe('ERROR');

      // Cleanup - Restore original log level
      JDbLogger.setLevel(originalLevel);
    });

    it('should propagate logLevel default of INFO to JDbLogger', () => {
      // Arrange - Save original level to restore after test
      const originalLevel = JDbLogger.getLevel();

      // Act - Create Database with default config (logLevel defaults to INFO)
      const { database } = setupDatabaseTestEnvironment();

      // Assert - JDbLogger.currentLevel should be INFO by default
      expect(JDbLogger.getLevel()).toBe(JDbLogger.LOG_LEVELS.INFO);
      expect(database.config.logLevel).toBe('INFO');

      // Cleanup - Restore original log level
      JDbLogger.setLevel(originalLevel);
    });

    it('should propagate cacheEnabled config to FileService', () => {
      // Arrange & Act - Create Database with cacheEnabled explicitly disabled
      const { database } = setupDatabaseTestEnvironment({ cacheEnabled: false });

      // Assert - FileService should reflect disabled cache
      expect(database.config.cacheEnabled).toBe(false);
      const cacheStats = database._fileService.getCacheStats();
      expect(cacheStats.enabled).toBe(false);
    });

    it('should propagate cacheEnabled default of true to FileService', () => {
      // Arrange & Act - Create Database with default config
      const { database } = setupDatabaseTestEnvironment();

      // Assert - FileService should have cache enabled by default
      expect(database.config.cacheEnabled).toBe(true);
      const cacheStats = database._fileService.getCacheStats();
      expect(cacheStats.enabled).toBe(true);
    });
  });
});
