/* global Database, MasterIndex, CollectionMetadata, JDbLogger, FileOperations, FileService */

/**
 * Database Master Index Integration Tests
 *
 * Ports legacy Database master index integration scenarios into the Vitest suite.
 */

import { describe, it, expect } from 'vitest';
import {
  createDatabaseTestConfig,
  registerDatabaseFile,
  setupInitialisedDatabase,
  generateUniqueName
} from '../../helpers/database-test-helpers.js';

describe('Database master index integration', () => {
  it('should hydrate collections from an existing MasterIndex entry during initialise', () => {
    // Arrange - Seed the MasterIndex with a pre-existing collection entry
    const { config, masterIndexKey, rootFolderId } = createDatabaseTestConfig();
    const masterIndex = new MasterIndex({ masterIndexKey });
    const logger = JDbLogger.createComponentLogger('Database-MasterIndex-Integration-Test');
    const fileOps = new FileOperations(logger);
    const fileService = new FileService(fileOps, logger);
    const collectionName = generateUniqueName('hydratedCollection');
    const seedFileId = fileService.createFile(
      `${collectionName}.json`,
      {
        documents: {},
        metadata: {
          name: collectionName,
          created: new Date(),
          lastUpdated: new Date(),
          documentCount: 2
        }
      },
      rootFolderId
    );
    registerDatabaseFile(seedFileId);
    masterIndex.addCollection(collectionName, {
      name: collectionName,
      fileId: seedFileId,
      documentCount: 2,
      created: new Date(),
      lastUpdated: new Date()
    });

    // Act - Initialise a fresh Database instance to hydrate from the MasterIndex
    const database = new Database({ ...config });
    database.initialise();
    const collections = database.listCollections();
    const hydratedCollection = database.collections.get(collectionName);

    // Assert - The pre-existing collection should be discoverable with its Drive file ID
    expect(collections).toContain(collectionName);
    expect(hydratedCollection).toBeDefined();
    expect(hydratedCollection?.driveFileId).toBe(seedFileId);
  });

  it('should update MasterIndex metadata when creating a new collection', () => {
    // Arrange - Create an initialised database ready for collection creation
    const { database, masterIndexKey } = setupInitialisedDatabase();
    const collectionName = generateUniqueName('coordinatedCollection');

    // Act - Create the new collection through the Database API
    const createdCollection = database.createCollection(collectionName);
    registerDatabaseFile(createdCollection.driveFileId);
    const masterIndex = new MasterIndex({ masterIndexKey });
    const persistedMetadata = masterIndex.getCollection(collectionName);

    // Assert - The MasterIndex entry should be populated with the collection metadata
    expect(persistedMetadata).toBeInstanceOf(CollectionMetadata);
    expect(persistedMetadata?.name).toBe(collectionName);
    expect(persistedMetadata?.fileId).toBe(createdCollection.driveFileId);
    expect(persistedMetadata?.documentCount).toBe(0);
  });
});
