import { describe, it, expect, beforeEach } from 'vitest';
import '../../setup/gas-mocks.setup.js';

// Note: MasterIndex and CollectionMetadata are loaded globally via gas-mocks.setup.js
// using vm.runInThisContext(). Do not import them as ES6 modules as it creates duplicate
// class definitions causing instanceof checks to fail.

describe('MasterIndex Functionality', () => {
  let masterIndex;

  beforeEach(() => {
    masterIndex = new MasterIndex();
  });

  it('should initialise master index with default configuration', () => {
    expect(masterIndex.isInitialised()).toBeTruthy();
  });

  it('should persist master index to ScriptProperties', () => {
    const testCollection = {
      name: 'testCollection',
      fileId: 'test-file-id',
      documentCount: 5,
      lastModified: new Date().toISOString(),
      modificationToken: 'test-token-123'
    };
    
    masterIndex.addCollection('testCollection', testCollection);
    masterIndex.save();
    
    const newMasterIndex = new MasterIndex();
    const collections = newMasterIndex.getCollections();
    
    expect(collections).toHaveProperty('testCollection');
    expect(collections.testCollection.documentCount).toBe(5);
  });

  it('should load existing master index from ScriptProperties', () => {
    const existingData = {
      collections: {
        'existingCollection': {
          name: 'existingCollection',
          fileId: 'existing-file-id',
          documentCount: 3
        }
      },
      locks: {},
      version: '1.0.0'
    };
    
    PropertiesService.getScriptProperties().setProperty('GASDB_MASTER_INDEX', JSON.stringify(existingData));
    
    const newIndex = new MasterIndex();
    const collections = newIndex.getCollections();
    
    expect(collections).toHaveProperty('existingCollection');
    expect(collections.existingCollection.documentCount).toBe(3);
  });

  it('should update collection metadata correctly', () => {
    masterIndex.addCollection('updateTest', {
      name: 'updateTest',
      fileId: 'update-file-id',
      documentCount: 0
    });
    
    masterIndex.updateCollectionMetadata('updateTest', {
      documentCount: 10,
      lastUpdated: '2025-06-02T10:00:00Z'
    });
    
    const collection = masterIndex.getCollection('updateTest');
    
    expect(collection.documentCount).toBe(10);
    expect(collection.lastUpdated.toISOString()).toBe('2025-06-02T10:00:00.000Z');
  });

  it('should remove a collection and persist the removal', () => {
    const testKey = 'GASDB_MI_S2_Functionality_TestKey';
    PropertiesService.getScriptProperties().deleteProperty(testKey);
    const mi = new MasterIndex({ masterIndexKey: testKey });
    
    const collectionName = 'collectionToRemove';
    const collectionData = {
      name: collectionName,
      fileId: 'file-id-to-remove',
      documentCount: 3
    };
    mi.addCollection(collectionName, collectionData);
    mi.save();

    const result = mi.removeCollection(collectionName);
    mi.save();

    expect(result).toBe(true);
    expect(mi.getCollection(collectionName)).toBeNull();

    const newMasterIndex = new MasterIndex({ masterIndexKey: testKey });
    const collectionsAfterRemoval = newMasterIndex.getCollections();
    expect(collectionsAfterRemoval).not.toHaveProperty(collectionName);

    PropertiesService.getScriptProperties().deleteProperty(testKey);
  });

  it('should return CollectionMetadata instance from getCollection', () => {
    const collectionName = 'metadataInstanceTest';
    const collectionData = {
      name: collectionName,
      fileId: 'test-file-id',
      documentCount: 5,
      lastModified: new Date().toISOString(),
      modificationToken: 'test-token-123'
    };
    
    masterIndex.addCollection(collectionName, collectionData);
    const retrievedCollection = masterIndex.getCollection(collectionName);

    expect(retrievedCollection).toBeInstanceOf(CollectionMetadata);
    expect(retrievedCollection.name).toBe(collectionName);
    expect(retrievedCollection.fileId).toBe('test-file-id');
    expect(retrievedCollection.documentCount).toBe(5);
    expect(retrievedCollection.modificationToken).toBe('test-token-123');
  });

  it('should accept CollectionMetadata instance in addCollection', () => {
    const collectionName = 'metadataInputTest';
    const metadata = new CollectionMetadata(collectionName, 'test-file-id-2', {
      documentCount: 3,
      modificationToken: 'test-token-456'
    });
    
    masterIndex.addCollection(collectionName, metadata);
    const retrievedCollection = masterIndex.getCollection(collectionName);
    
    expect(retrievedCollection).toBeInstanceOf(CollectionMetadata);
    expect(retrievedCollection.name).toBe(collectionName);
    expect(retrievedCollection.fileId).toBe('test-file-id-2');
    expect(retrievedCollection.documentCount).toBe(3);
    expect(retrievedCollection.modificationToken).toBe('test-token-456');
  });

  it('should return CollectionMetadata instances from getCollections', () => {
    const collection1Data = {
      name: 'collection1',
      fileId: 'file-id-1',
      documentCount: 2
    };
    const collection2Data = {
      name: 'collection2',
      fileId: 'file-id-2',
      documentCount: 4
    };
    
    masterIndex.addCollection('collection1', collection1Data);
    masterIndex.addCollection('collection2', collection2Data);
    const allCollections = masterIndex.getCollections();
    
    expect(allCollections.collection1).toBeInstanceOf(CollectionMetadata);
    expect(allCollections.collection2).toBeInstanceOf(CollectionMetadata);
    expect(allCollections.collection1.name).toBe('collection1');
    expect(allCollections.collection2.name).toBe('collection2');
  });

  it('should preserve CollectionMetadata properties through persistence', () => {
    const collectionName = 'persistenceTest';
    const metadata = new CollectionMetadata(collectionName, 'persist-file-id', {
      documentCount: 7,
      modificationToken: 'persist-token-789',
      lockStatus: {
        isLocked: false,
        lockedBy: null,
        lockedAt: null,
        lockTimeout: null
      }
    });
    
    masterIndex.addCollection(collectionName, metadata);
    masterIndex.save();
    
    const newMasterIndex = new MasterIndex();
    const retrievedCollection = newMasterIndex.getCollection(collectionName);
    
    expect(retrievedCollection).toBeInstanceOf(CollectionMetadata);
    expect(retrievedCollection.name).toBe(collectionName);
    expect(retrievedCollection.fileId).toBe('persist-file-id');
    expect(retrievedCollection.documentCount).toBe(7);
    expect(retrievedCollection.modificationToken).toBe('persist-token-789');
    expect(retrievedCollection.lockStatus).not.toBeNull();
  });

  it('should update CollectionMetadata instance properties correctly', () => {
    const collectionName = 'updateMetadataTest';
    const initialMetadata = new CollectionMetadata(collectionName, 'update-file-id', {
      documentCount: 0,
      modificationToken: 'initial-token'
    });
    
    masterIndex.addCollection(collectionName, initialMetadata);
    masterIndex.updateCollectionMetadata(collectionName, {
      documentCount: 15,
      modificationToken: 'updated-token'
    });
    
    const updatedCollection = masterIndex.getCollection(collectionName);
    
    expect(updatedCollection).toBeInstanceOf(CollectionMetadata);
    expect(updatedCollection.documentCount).toBe(15);
    expect(updatedCollection.modificationToken).toBe('updated-token');
    expect(updatedCollection.name).toBe(collectionName);
    expect(updatedCollection.fileId).toBe('update-file-id');
  });

  it('should throw error if MasterIndex is corrupted', () => {
    const testKey = 'GASDB_MI_CORRUPT_' + new Date().getTime();
    PropertiesService.getScriptProperties().setProperty(testKey, '{corruptJson');
    
    expect(() => {
      const mi = new MasterIndex({ masterIndexKey: testKey });
      mi.getCollections();
    }).toThrow();
    
    PropertiesService.getScriptProperties().deleteProperty(testKey);
  });
});

describe('Conflict Detection and Resolution', () => {
  let masterIndex;

  beforeEach(() => {
    masterIndex = new MasterIndex();
  });

  it('should generate unique modification tokens', () => {
    const token1 = masterIndex.generateModificationToken();
    const token2 = masterIndex.generateModificationToken();
    
    expect(token1).not.toBe(token2);
    expect(token1.length).toBeGreaterThan(0);
    expect(token2.length).toBeGreaterThan(0);
  });

  it('should detect conflicts using modification tokens', () => {
    const collectionName = 'conflictDetectionTest';
    const originalToken = masterIndex.generateModificationToken();
    
    masterIndex.addCollection(collectionName, {
      name: collectionName,
      fileId: 'conflict-file-id',
      modificationToken: originalToken
    });
    
    const newToken = masterIndex.generateModificationToken();
    masterIndex.updateCollectionMetadata(collectionName, {
      modificationToken: newToken
    });
    
    const hasConflict = masterIndex.hasConflict(collectionName, originalToken);
    
    expect(hasConflict).toBe(true);
  });

  it('should resolve conflicts with last-write-wins strategy', () => {
    const collectionName = 'conflictResolutionTest';
    const originalToken = masterIndex.generateModificationToken();
    
    masterIndex.addCollection(collectionName, {
      name: collectionName,
      fileId: 'resolution-file-id',
      modificationToken: originalToken,
      documentCount: 5
    });
    
    const resolution = masterIndex.resolveConflict(collectionName, {
      documentCount: 8,
      lastModified: '2025-06-02T11:00:00Z'
    }, 'LAST_WRITE_WINS');
    
    expect(resolution.success).toBe(true);
    expect(resolution.data.documentCount).toBe(8);
    expect(resolution.data.modificationToken).not.toBe(originalToken);
  });

  it('should validate modification token format', () => {
    const validToken = masterIndex.generateModificationToken();
    const isValid = masterIndex.validateModificationToken(validToken);
    const isInvalidEmpty = masterIndex.validateModificationToken('');
    const isInvalidNull = masterIndex.validateModificationToken(null);
    
    expect(isValid).toBe(true);
    expect(isInvalidEmpty).toBe(false);
    expect(isInvalidNull).toBe(false);
  });
});

describe('MasterIndex Integration', () => {
  let masterIndex;

  beforeEach(() => {
    masterIndex = new MasterIndex();
  });

  it('should coordinate locking and conflict detection', () => {
    const collectionName = 'integrationTest';
    const operationId = 'integration-operation';
    masterIndex.addCollection(collectionName, {
      name: collectionName,
      fileId: 'integration-file-id',
      modificationToken: masterIndex.generateModificationToken()
    });
    
    const lockAcquired = masterIndex.acquireCollectionLock(collectionName, operationId);
    const token = masterIndex.generateModificationToken();
    masterIndex.updateCollectionMetadata(collectionName, { modificationToken: token });
    
    expect(lockAcquired).toBe(true);
    expect(masterIndex.isCollectionLocked(collectionName)).toBe(true);
    expect(masterIndex.hasConflict(collectionName, token)).toBe(false);
  });

  it('should handle complete operation lifecycle', () => {
    const collectionName = 'lifecycleTest';
    const operationId = 'lifecycle-operation';
    
    masterIndex.addCollection(collectionName, {
      name: collectionName,
      fileId: 'lifecycle-file-id',
      modificationToken: masterIndex.generateModificationToken()
    });
    const lockAcquired = masterIndex.acquireCollectionLock(collectionName, operationId);
    
    masterIndex.updateCollectionMetadata(collectionName, {
      documentCount: 10,
      lastModified: new Date().toISOString()
    });
    
    const lockReleased = masterIndex.releaseCollectionLock(collectionName, operationId);
    masterIndex.save();
    
    expect(lockAcquired).toBe(true);
    expect(lockReleased).toBe(true);
    expect(masterIndex.isCollectionLocked(collectionName)).toBe(false);
    
    const collection = masterIndex.getCollection(collectionName);
    expect(collection.documentCount).toBe(10);
  });

  it('should maintain CollectionMetadata integrity during conflict resolution', () => {
    const collectionName = 'metadataConflictTest';
    const originalMetadata = new CollectionMetadata(collectionName, 'conflict-file-id', {
      documentCount: 5,
      modificationToken: 'original-token'
    });
    
    masterIndex.addCollection(collectionName, originalMetadata);
    
    const resolution = masterIndex.resolveConflict(collectionName, {
      documentCount: 8,
      lastModified: '2025-06-02T11:00:00Z'
    }, 'LAST_WRITE_WINS');
    
    const resolvedCollection = masterIndex.getCollection(collectionName);
    
    expect(resolution.success).toBe(true);
    expect(resolvedCollection).toBeInstanceOf(CollectionMetadata);
    expect(resolvedCollection.documentCount).toBe(8);
    expect(resolvedCollection.modificationToken).not.toBe('original-token');
    expect(resolvedCollection.name).toBe(collectionName);
    expect(resolvedCollection.fileId).toBe('conflict-file-id');
  });

  it('should handle CollectionMetadata in complete operation lifecycle with persistence', () => {
    const collectionName = 'metadataLifecycleTest';
    const operationId = 'metadata-lifecycle-operation';
    const metadata = new CollectionMetadata(collectionName, 'lifecycle-file-id', {
      documentCount: 2,
      modificationToken: 'lifecycle-token'
    });
    
    masterIndex.addCollection(collectionName, metadata);
    const lockAcquired = masterIndex.acquireCollectionLock(collectionName, operationId);
    
    masterIndex.updateCollectionMetadata(collectionName, {
      documentCount: 12
    });
    
    const lockReleased = masterIndex.releaseCollectionLock(collectionName, operationId);
    masterIndex.save();
    
    const newMasterIndex = new MasterIndex();
    const persistedCollection = newMasterIndex.getCollection(collectionName);
    
    expect(lockAcquired).toBe(true);
    expect(lockReleased).toBe(true);
    expect(persistedCollection).toBeInstanceOf(CollectionMetadata);
    expect(persistedCollection.documentCount).toBe(12);
    expect(persistedCollection.name).toBe(collectionName);
    expect(persistedCollection.fileId).toBe('lifecycle-file-id');
    expect(persistedCollection.getLockStatus().isLocked).toBe(false);
  });
});
