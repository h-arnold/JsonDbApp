/**
 * Database Collection Management Tests (Vitest)
 * Refactored from old_tests/unit/Database/02_CollectionManagementTestSuite.js
 */

import { describe, it, expect } from 'vitest';
import {
  createInitialisedDatabase,
  createDatabaseConfig,
  trackFileId
} from '../../helpers/database-test-helpers.js';

describe('Database Collection Management', () => {
  it('creates new collection', () => {
    const { database } = createInitialisedDatabase();
    const collectionName = 'vitestCollectionA';

    const collection = database.createCollection(collectionName);

    expect(collection).toBeDefined();
    expect(collection.name).toBe(collectionName);
    expect(collection.driveFileId).toBeTruthy();
    trackFileId(collection.driveFileId);
  });

  it('accesses existing collection', () => {
    const { database } = createInitialisedDatabase();
    const collectionName = 'vitestCollectionB';
    const created = database.createCollection(collectionName);
    trackFileId(created.driveFileId);

    const collection = database.collection(collectionName);

    expect(collection).toBeDefined();
    expect(collection.name).toBe(collectionName);
  });

  it('auto-creates collection when configured', () => {
    const { database } = createInitialisedDatabase();
    const collectionName = 'autoCreatedCollection';

    const collection = database.collection(collectionName);

    expect(collection).toBeDefined();
    expect(collection.name).toBe(collectionName);
    trackFileId(collection.driveFileId);
  });

  it('lists all collections', () => {
    const { database } = createInitialisedDatabase();
    const collectionName1 = 'listCollectionOne';
    const collectionName2 = 'listCollectionTwo';
    trackFileId(database.createCollection(collectionName1).driveFileId);
    trackFileId(database.createCollection(collectionName2).driveFileId);

    const collections = database.listCollections();

    expect(Array.isArray(collections)).toBe(true);
    expect(collections).toEqual(expect.arrayContaining([collectionName1, collectionName2]));
  });

  it('deletes collection', () => {
    const { database } = createInitialisedDatabase();
    const collectionName = 'tempCollection';
    const collection = database.createCollection(collectionName);
    trackFileId(collection.driveFileId);

    const result = database.dropCollection(collectionName);

    expect(result).toBe(true);
    const collections = database.listCollections();
    expect(collections).not.toContain(collectionName);
  });

  it('throws when collection missing and autoCreateCollections disabled', () => {
    const config = createDatabaseConfig({ autoCreateCollections: false });
    const database = new Database(config);
    database.createDatabase();
    database.initialise();

    expect(() => database.collection('nonExistentCollection')).toThrow();
  });

  it('validates collection names', () => {
    const { database } = createInitialisedDatabase();

    expect(() => database.createCollection('')).toThrow();
    expect(() => database.createCollection(null)).toThrow();
    expect(() => database.createCollection('invalid/name')).toThrow();
    expect(() => database.createCollection('index')).toThrow();
  });

  it('sanitises invalid collection names when enabled', () => {
    const config = createDatabaseConfig({ stripDisallowedCollectionNameCharacters: true });
    const database = new Database(config);
    database.createDatabase();
    database.initialise();
    const suffix = `_${Date.now()}`;
    const originalName = `permissive/Collection${suffix}`;
    const expectedName = `permissiveCollection${suffix}`;

    const collection = database.createCollection(originalName);
    trackFileId(collection.driveFileId);
    trackFileId(database.indexFileId);

    expect(collection.name).toBe(expectedName);
    expect(database.collection(originalName).name).toBe(expectedName);
    expect(database.listCollections()).toContain(expectedName);

    const masterIndex = new MasterIndex({ masterIndexKey: config.masterIndexKey });
    expect(masterIndex.getCollections()).toHaveProperty(expectedName);
  });

  it('refuses reserved names even after sanitisation', () => {
    const config = createDatabaseConfig({
      stripDisallowedCollectionNameCharacters: true,
      autoCreateCollections: false
    });
    const database = new Database(config);
    database.createDatabase();
    database.initialise();

    expect(() => database.createCollection('index/')).toThrow();
  });

  it('prevents duplicate collections that collide after sanitisation', () => {
    const suffix = `_${Date.now()}`;
    const config = createDatabaseConfig({ stripDisallowedCollectionNameCharacters: true });
    const database = new Database(config);
    database.createDatabase();
    database.initialise();

    const first = database.createCollection(`dup/name${suffix}`);
    trackFileId(first.driveFileId);

    expect(() => database.createCollection(`dup:name${suffix}`)).toThrow();
    const reaccessed = database.collection(`dup:name${suffix}`);
    expect(reaccessed.name).toBe(`dupname${suffix}`);
  });
});
