/**
 * Database Collection Management Tests
 *
 * Ports legacy collection creation, access, listing, deletion, and name validation scenarios.
 */

import { describe, it, expect } from 'vitest';
import {
  registerDatabaseFile,
  setupInitialisedDatabase
} from '../../helpers/database-test-helpers.js';

/**
 * Generates a unique suffix for collection names to avoid collisions.
 * @returns {string} Random suffix containing timestamp and base36 fragment.
 */
const uniqueSuffix = () => `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

/**
 * Builds a unique, descriptive collection name for the current test case.
 * @param {string} prefix - Human-friendly descriptor for the collection.
 * @returns {string} Unique collection name.
 */
const generateUniqueCollectionName = (prefix) => `${prefix}_${uniqueSuffix()}`;

/**
 * Reproduces the Database sanitisation routine for disallowed characters.
 * @param {string} name - Name to sanitise for expectation checks.
 * @returns {string} Sanitised collection name.
 */
const sanitiseCollectionName = (name) => name.replace(/[\/\\:*?"<>|]/g, '');

describe('Database collection management', () => {
  it('should create a new collection and persist metadata to the MasterIndex', () => {
    // Arrange - Initialise an isolated database instance
    const { database, masterIndexKey } = setupInitialisedDatabase();
    const collectionName = generateUniqueCollectionName('createdCollection');

    // Act - Create the collection
    const collection = database.createCollection(collectionName);
    registerDatabaseFile(collection.driveFileId);

    // Assert - Collection metadata should be persisted and listable
    expect(collection.name).toBe(collectionName);
    const masterIndex = new MasterIndex({ masterIndexKey });
    const collections = masterIndex.getCollections();
    expect(Object.keys(collections)).toContain(collectionName);
    expect(collections[collectionName].fileId).toBe(collection.driveFileId);
    expect(database.listCollections()).toContain(collectionName);
  });

  it('should access existing collections from the MasterIndex when not cached in memory', () => {
    // Arrange - Create and then clear the in-memory cache for the collection
    const { database, masterIndexKey } = setupInitialisedDatabase();
    const collectionName = generateUniqueCollectionName('cachedCollection');
    const createdCollection = database.createCollection(collectionName);
    registerDatabaseFile(createdCollection.driveFileId);
    database.collections.delete(collectionName);

    // Act - Reload the collection via Database.collection()
    const reloadedCollection = database.collection(collectionName);

    // Assert - Reloaded collection should match persisted metadata
    expect(reloadedCollection.name).toBe(collectionName);
    expect(reloadedCollection.driveFileId).toBe(createdCollection.driveFileId);
    const masterIndex = new MasterIndex({ masterIndexKey });
    expect(masterIndex.getCollections()[collectionName].fileId).toBe(createdCollection.driveFileId);
  });

  it('should auto-create collections when autoCreateCollections is enabled', () => {
    // Arrange - Prepare database with default auto-create behaviour
    const { database, masterIndexKey } = setupInitialisedDatabase();
    const targetName = generateUniqueCollectionName('autoCreated');

    // Act - Access a non-existent collection, triggering auto creation
    const autoCreated = database.collection(targetName);
    registerDatabaseFile(autoCreated.driveFileId);

    // Assert - Collection should exist in memory and MasterIndex
    expect(autoCreated.name).toBe(targetName);
    const masterIndex = new MasterIndex({ masterIndexKey });
    expect(Object.keys(masterIndex.getCollections())).toContain(targetName);
  });

  it('should throw when accessing a missing collection with auto-create disabled', () => {
    // Arrange - Disable auto-create in the configuration
    const { database } = setupInitialisedDatabase({ autoCreateCollections: false });
    const missingName = generateUniqueCollectionName('missingCollection');

    // Act & Assert - Accessing should fail with an informative message
    expect(() => database.collection(missingName)).toThrowError(/auto-create is disabled/);
  });

  it('should list all collections that have been created', () => {
    // Arrange - Create two distinct collections
    const { database } = setupInitialisedDatabase();
    const primaryName = generateUniqueCollectionName('primaryList');
    const secondaryName = generateUniqueCollectionName('secondaryList');
    const first = database.createCollection(primaryName);
    const second = database.createCollection(secondaryName);
    registerDatabaseFile(first.driveFileId);
    registerDatabaseFile(second.driveFileId);

    // Act - Retrieve the collection list
    const collections = database.listCollections();

    // Assert - Both collections should appear once
    expect(collections).toContain(primaryName);
    expect(collections).toContain(secondaryName);
  });

  it('should drop an existing collection and remove its metadata', () => {
    // Arrange - Create a collection to be dropped later
    const { database, masterIndexKey } = setupInitialisedDatabase();
    const droppableName = generateUniqueCollectionName('droppable');
    const collection = database.createCollection(droppableName);
    registerDatabaseFile(collection.driveFileId);

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
      expect(() => database.createCollection(invalidName)).toThrowError(/must be a non-empty string|Collection name/);
    }
  });

  it('should reject names containing invalid characters when sanitisation is disabled', () => {
    // Arrange - Default configuration forbids invalid characters
    const { database } = setupInitialisedDatabase();

    // Act & Assert - Invalid characters should raise an error
    expect(() => database.createCollection('invalid/name')).toThrowError(/invalid characters/);
  });

  it('should sanitise invalid characters when sanitisation is enabled', () => {
    // Arrange - Enable sanitisation to allow automatic character stripping
    const { database, masterIndexKey } = setupInitialisedDatabase({
      stripDisallowedCollectionNameCharacters: true
    });
    const originalName = `permissive/Collection_${uniqueSuffix()}`;
    const expectedName = sanitiseCollectionName(originalName);

    // Act - Create the collection with an invalid character
    const sanitisedCollection = database.createCollection(originalName);
    registerDatabaseFile(sanitisedCollection.driveFileId);
    const reaccessedCollection = database.collection(originalName);

    // Assert - Returned and persisted names should be sanitised
    expect(sanitisedCollection.name).toBe(expectedName);
    expect(reaccessedCollection.name).toBe(expectedName);
    const masterIndex = new MasterIndex({ masterIndexKey });
    const collections = masterIndex.getCollections();
    expect(Object.keys(collections)).toContain(expectedName);
    expect(collections[expectedName].fileId).toBe(sanitisedCollection.driveFileId);
  });

  it('should refuse reserved names even after sanitisation', () => {
    // Arrange - Enable sanitisation to ensure reserved name checks happen post-sanitise
    const { database } = setupInitialisedDatabase({
      stripDisallowedCollectionNameCharacters: true,
      autoCreateCollections: false
    });

    // Act & Assert - Reserved names must still be rejected
    expect(() => database.createCollection('index/')).toThrowError(/reserved/);
  });

  it('should prevent duplicates when sanitised names collide', () => {
    // Arrange - Allow sanitisation so different inputs collapse to the same name
    const { database } = setupInitialisedDatabase({
      stripDisallowedCollectionNameCharacters: true
    });
    const suffix = uniqueSuffix();
    const firstInput = `dup/name_${suffix}`;
    const secondInput = `dup:name_${suffix}`;

    // Act - Create the first collection and attempt a colliding second creation
    const firstCollection = database.createCollection(firstInput);
    registerDatabaseFile(firstCollection.driveFileId);

    // Assert - Second creation should fail due to sanitised name collision
    expect(() => database.createCollection(secondInput)).toThrowError(/already exists/);
    const existingCollection = database.collection(secondInput);
    expect(existingCollection.name).toBe(firstCollection.name);
    expect(existingCollection.driveFileId).toBe(firstCollection.driveFileId);
  });
});
