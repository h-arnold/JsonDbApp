/* global MasterIndex, OperationError, InvalidArgumentError */

/**
 * Database Collection Management Tests
 *
 * Ports legacy collection creation, access, listing, deletion, and name validation scenarios.
 */

import { describe, it, expect } from 'vitest';
import {
  expectCollectionPersisted,
  setupInitialisedDatabase,
  generateUniqueName
} from '../../helpers/database-test-helpers.js';

/**
 * Reproduces the Database sanitisation routine for disallowed characters.
 * @param {string} name - Name to sanitise for expectation checks.
 * @returns {string} Sanitised collection name.
 */
const sanitiseCollectionName = (name) => name.replace(/[\/\\:*?"<>|]/g, '');

/**
 * Generates a compact unique suffix for Drive artefact names.
 * @returns {string} Unique suffix string.
 */
const createUniqueSuffix = () => `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

describe('Database collection management', () => {
  it('should create a new collection and persist metadata to the MasterIndex', () => {
    // Arrange - Initialise an isolated database instance
    const { database, masterIndexKey } = setupInitialisedDatabase();
    const collectionName = generateUniqueName('createdCollection');

    // Act - Create the collection
    const collection = database.createCollection(collectionName);

    // Assert - Collection metadata should be persisted and listable
    expect(collection.name).toBe(collectionName);
    expectCollectionPersisted({ masterIndexKey }, collectionName, {
      fileId: collection.driveFileId,
      documentCount: 0
    });
    expect(database.listCollections()).toContain(collectionName);
  });

  it('should access existing collections from the MasterIndex when not cached in memory', () => {
    // Arrange - Create and then clear the in-memory cache for the collection
    const { database, masterIndexKey } = setupInitialisedDatabase();
    const collectionName = generateUniqueName('cachedCollection');
    const createdCollection = database.createCollection(collectionName);
    expectCollectionPersisted({ masterIndexKey }, collectionName, {
      fileId: createdCollection.driveFileId,
      documentCount: 0
    });
    database.collections.delete(collectionName);

    // Act - Reload the collection via Database.collection()
    const reloadedCollection = database.collection(collectionName);

    // Assert - Reloaded collection should match persisted metadata
    expect(reloadedCollection.name).toBe(collectionName);
    expect(reloadedCollection.driveFileId).toBe(createdCollection.driveFileId);
  });

  it('should access existing collections via getCollection when not cached in memory', () => {
    // Arrange - Create and evict the in-memory cache entry
    const { database, masterIndexKey } = setupInitialisedDatabase();
    const collectionName = generateUniqueName('getCollectionReload');
    const createdCollection = database.createCollection(collectionName);
    expectCollectionPersisted({ masterIndexKey }, collectionName, {
      fileId: createdCollection.driveFileId,
      documentCount: 0
    });
    database.collections.delete(collectionName);

    // Act - Reload the collection through Database.getCollection()
    const reloadedCollection = database.getCollection(collectionName);

    // Assert - Reloaded collection should match persisted metadata
    expect(reloadedCollection.name).toBe(collectionName);
    expect(reloadedCollection.driveFileId).toBe(createdCollection.driveFileId);
  });

  it('should auto-create collections when autoCreateCollections is enabled', () => {
    // Arrange - Prepare database with default auto-create behaviour
    const { database, masterIndexKey } = setupInitialisedDatabase();
    const targetName = generateUniqueName('autoCreated');

    // Act - Access a non-existent collection, triggering auto creation
    const autoCreated = database.collection(targetName);

    // Assert - Collection should exist in memory and MasterIndex
    expect(autoCreated.name).toBe(targetName);
    expectCollectionPersisted({ masterIndexKey }, targetName, {
      fileId: autoCreated.driveFileId,
      documentCount: 0
    });
  });

  it('should auto-create collections via getCollection when autoCreateCollections is enabled', () => {
    // Arrange - Use default configuration that permits auto creation
    const { database, masterIndexKey } = setupInitialisedDatabase();
    const targetName = generateUniqueName('getCollectionAutoCreated');

    // Act - Access a missing collection through getCollection()
    const autoCreated = database.getCollection(targetName);

    // Assert - Collection should be created and registered in the MasterIndex
    expect(autoCreated.name).toBe(targetName);
    expectCollectionPersisted({ masterIndexKey }, targetName, {
      fileId: autoCreated.driveFileId,
      documentCount: 0
    });
  });

  it('should throw when accessing a missing collection with auto-create disabled', () => {
    // Arrange - Disable auto-create in the configuration
    const { database } = setupInitialisedDatabase({ autoCreateCollections: false });
    const missingName = generateUniqueName('missingCollection');

    // Act & Assert - Accessing should fail with an informative message
    try {
      database.collection(missingName);
      throw new Error('Expected OperationError to be thrown for missing collection');
    } catch (error) {
      expect(error).toBeInstanceOf(OperationError);
      expect(error.message).toMatch(/auto-create is disabled/);
    }
  });

  it('should report original name when sanitised lookup fails and auto-create is disabled', () => {
    // Arrange - Disable auto-create while allowing sanitisation adjustments
    const { database } = setupInitialisedDatabase({
      autoCreateCollections: false,
      stripDisallowedCollectionNameCharacters: true
    });
    const unsanitisedName = 'invalid/name';

    // Act & Assert - Resolution failure should surface the original unsanitised name
    try {
      database.collection(unsanitisedName);
      throw new Error(
        'Expected OperationError when sanitised lookup fails with auto-create disabled'
      );
    } catch (error) {
      expect(error).toBeInstanceOf(OperationError);
      expect(error.message).toBe(
        "Collection 'invalid/name' does not exist and auto-create is disabled"
      );
    }
  });

  it('should report original name via getCollection when sanitised lookup fails and auto-create is disabled', () => {
    // Arrange - Disable auto-create while allowing sanitisation adjustments
    const { database } = setupInitialisedDatabase({
      autoCreateCollections: false,
      stripDisallowedCollectionNameCharacters: true
    });
    const unsanitisedName = 'invalid/name';

    // Act & Assert - Resolution failure should surface the original unsanitised name
    try {
      database.getCollection(unsanitisedName);
      throw new Error(
        'Expected OperationError when sanitised getCollection fails with auto-create disabled'
      );
    } catch (error) {
      expect(error).toBeInstanceOf(OperationError);
      expect(error.message).toBe(
        "Collection 'invalid/name' does not exist and auto-create is disabled"
      );
    }
  });

  it('should list all collections that have been created', () => {
    // Arrange - Create two distinct collections
    const { database, masterIndexKey } = setupInitialisedDatabase();
    const primaryName = generateUniqueName('primaryList');
    const secondaryName = generateUniqueName('secondaryList');
    const first = database.createCollection(primaryName);
    const second = database.createCollection(secondaryName);
    expectCollectionPersisted({ masterIndexKey }, primaryName, {
      fileId: first.driveFileId,
      documentCount: 0
    });
    expectCollectionPersisted({ masterIndexKey }, secondaryName, {
      fileId: second.driveFileId,
      documentCount: 0
    });

    // Act - Retrieve the collection list
    const collections = database.listCollections();

    // Assert - Both collections should appear once
    expect(collections).toContain(primaryName);
    expect(collections).toContain(secondaryName);
  });

  it('should drop an existing collection and remove its metadata', () => {
    // Arrange - Create a collection to be dropped later
    const { database, masterIndexKey } = setupInitialisedDatabase();
    const droppableName = generateUniqueName('droppable');
    const collection = database.createCollection(droppableName);
    expectCollectionPersisted({ masterIndexKey }, droppableName, {
      fileId: collection.driveFileId,
      documentCount: 0
    });

    // Act - Drop the collection
    const dropResult = database.dropCollection(droppableName);

    // Assert - Drop should succeed and metadata should be removed
    expect(dropResult).toBe(true);
    expect(database.listCollections()).not.toContain(droppableName);
    const masterIndex = new MasterIndex({ masterIndexKey });
    expect(Object.keys(masterIndex.getCollections())).not.toContain(droppableName);
  });

  it('should reject empty or non-string collection names', () => {
    // Arrange - Use a single database instance for validation checks
    const { database } = setupInitialisedDatabase();
    const invalidNames = ['', '   ', null, undefined];

    // Act & Assert - Each invalid value should trigger validation errors
    for (const invalidName of invalidNames) {
      try {
        database.createCollection(invalidName);
        throw new Error('Expected InvalidArgumentError for invalid collection name');
      } catch (error) {
        expect(error).toBeInstanceOf(InvalidArgumentError);
        expect(error.message).toMatch(/must be a non-empty string|Collection name/);
      }
    }
  });

  it('should reject names containing invalid characters when sanitisation is disabled', () => {
    // Arrange - Default configuration forbids invalid characters
    const { database } = setupInitialisedDatabase();

    // Act & Assert - Invalid characters should raise an error
    expect(() => database.createCollection('invalid/name')).toThrow(InvalidArgumentError);
  });

  it('should sanitise invalid characters when sanitisation is enabled', () => {
    // Arrange - Enable sanitisation to allow automatic character stripping
    const { database, masterIndexKey } = setupInitialisedDatabase({
      stripDisallowedCollectionNameCharacters: true
    });
    const originalName = `permissive/Collection_${createUniqueSuffix()}`;
    const expectedName = sanitiseCollectionName(originalName);

    // Act - Create the collection with an invalid character
    const sanitisedCollection = database.createCollection(originalName);
    const reaccessedCollection = database.collection(originalName);

    // Assert - Returned and persisted names should be sanitised
    expect(sanitisedCollection.name).toBe(expectedName);
    expect(reaccessedCollection.name).toBe(expectedName);
    expectCollectionPersisted({ masterIndexKey }, expectedName, {
      fileId: sanitisedCollection.driveFileId,
      documentCount: 0
    });
  });

  it('should refuse reserved names even after sanitisation', () => {
    // Arrange - Enable sanitisation to ensure reserved name checks happen post-sanitise
    const { database } = setupInitialisedDatabase({
      stripDisallowedCollectionNameCharacters: true,
      autoCreateCollections: false
    });

    // Act & Assert - Reserved names must still be rejected
    expect(() => database.createCollection('index/')).toThrow(InvalidArgumentError);
  });

  it('should prevent duplicates when sanitised names collide', () => {
    // Arrange - Allow sanitisation so different inputs collapse to the same name
    const { database, masterIndexKey } = setupInitialisedDatabase({
      stripDisallowedCollectionNameCharacters: true
    });
    const suffix = createUniqueSuffix();
    const firstInput = `dup/name_${suffix}`;
    const secondInput = `dup:name_${suffix}`;

    // Act - Create the first collection and attempt a colliding second creation
    const firstCollection = database.createCollection(firstInput);
    expectCollectionPersisted({ masterIndexKey }, firstCollection.name, {
      fileId: firstCollection.driveFileId,
      documentCount: 0
    });

    // Assert - Second creation should fail due to sanitised name collision
    expect(() => database.createCollection(secondInput)).toThrow(OperationError);
    const existingCollection = database.collection(secondInput);
    expect(existingCollection.name).toBe(firstCollection.name);
    expect(existingCollection.driveFileId).toBe(firstCollection.driveFileId);
  });
});
