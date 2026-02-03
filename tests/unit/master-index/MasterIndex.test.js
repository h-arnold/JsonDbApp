import { afterEach, describe, expect, it } from 'vitest';

const scriptProperties = PropertiesService.getScriptProperties();
const trackedMasterIndexKeys = new Set();

/**
 * Create a unique master index key for test isolation.
 * @returns {string} Generated key
 */
const createKey = () => `VIITEST_MASTER_INDEX_${Date.now()}_${Math.random().toString(36).slice(2)}`;

/**
 * Register a key for cleanup upon test completion.
 * @param {string} key - Master index key slated for deletion
 * @returns {string} Registered key
 */
const registerKey = (key) => {
  trackedMasterIndexKeys.add(key);
  return key;
};

/**
 * Create a MasterIndex instance wired to an isolated ScriptProperties key.
 * @param {Object} [config] - Optional configuration overrides
 * @returns {{ key: string, masterIndex: MasterIndex }} Test harness artefacts
 */
const createTestMasterIndex = (config = {}) => {
  const masterIndexKey = registerKey(config.masterIndexKey ?? createKey());
  const masterIndex = new MasterIndex({ ...config, masterIndexKey });
  return { key: masterIndexKey, masterIndex };
};

/**
 * Seed ScriptProperties with predefined master index data.
 * @param {string} key - Target master index key
 * @param {Object} data - Serialised master index payload
 */
const seedMasterIndex = (key, data) => {
  registerKey(key);
  scriptProperties.setProperty(key, ObjectUtils.serialise(data));
};

/**
 * Add a collection with sensible defaults for repeated scenarios.
 * @param {MasterIndex} masterIndex - Current MasterIndex under test
 * @param {string} name - Collection identifier
 * @param {Object} [overrides] - Metadata overrides for the collection
 * @returns {CollectionMetadata} Persisted metadata instance
 */
const addTestCollection = (masterIndex, name, overrides = {}) => {
  const metadata = {
    name,
    fileId: overrides.fileId ?? `${name}-file`,
    documentCount: overrides.documentCount ?? 0,
    modificationToken: overrides.modificationToken ?? masterIndex.generateModificationToken(),
    lastModified: overrides.lastModified ?? new Date('2024-01-01T00:00:00Z'),
    lockStatus: overrides.lockStatus ?? null
  };
  masterIndex.addCollection(name, metadata);
  return masterIndex.getCollection(name);
};

afterEach(() => {
  for (const key of trackedMasterIndexKeys) {
    scriptProperties.deleteProperty(key);
  }
  trackedMasterIndexKeys.clear();
});

describe('MasterIndex Functionality', () => {
  it('should initialise master index with default configuration', () => {
    const { masterIndex } = createTestMasterIndex();

    expect(masterIndex.isInitialised()).toBeTruthy();
    expect(Object.keys(masterIndex.getCollections())).toHaveLength(0);
  });

  it('should persist master index to ScriptProperties', () => {
    const { key, masterIndex } = createTestMasterIndex();
    addTestCollection(masterIndex, 'persisted', { documentCount: 2 });

    const stored = scriptProperties.getProperty(key);
    expect(typeof stored).toBe('string');
    expect(stored.includes('persisted')).toBe(true);
  });

  it('should load existing master index from ScriptProperties', () => {
    const key = registerKey(createKey());
    const seededMetadata = new CollectionMetadata('existing', 'existing-file-id', { documentCount: 3 });
    const seededData = {
      version: 1,
      lastUpdated: new Date(),
      collections: { existing: seededMetadata },
      modificationHistory: {}
    };
    seedMasterIndex(key, seededData);

    const masterIndex = new MasterIndex({ masterIndexKey: key });
    const loaded = masterIndex.getCollection('existing');

    expect(loaded).toBeInstanceOf(CollectionMetadata);
    expect(loaded.documentCount).toBe(3);
    expect(loaded.fileId).toBe('existing-file-id');
  });

  it('should update collection metadata correctly', () => {
    const { masterIndex } = createTestMasterIndex();
    addTestCollection(masterIndex, 'updateTest');

    const targetDate = new Date('2025-06-02T10:00:00Z');
    const updated = masterIndex.updateCollectionMetadata('updateTest', {
      documentCount: 10,
      lastUpdated: targetDate
    });

    expect(updated.documentCount).toBe(10);
    expect(updated.lastUpdated.toISOString()).toBe(targetDate.toISOString());
  });

  it('should remove a collection and persist the removal', () => {
    const { key, masterIndex } = createTestMasterIndex();
    addTestCollection(masterIndex, 'removalTarget');

    expect(masterIndex.removeCollection('removalTarget')).toBe(true);
    expect(masterIndex.getCollection('removalTarget')).toBeNull();

    const reloaded = new MasterIndex({ masterIndexKey: key });
    expect(reloaded.getCollection('removalTarget')).toBeNull();
  });

  it('should return CollectionMetadata instance from getCollection', () => {
    const { masterIndex } = createTestMasterIndex();
    const collection = addTestCollection(masterIndex, 'metadataInstance');

    expect(collection).toBeInstanceOf(CollectionMetadata);
    expect(collection.name).toBe('metadataInstance');
  });

  it('should accept CollectionMetadata instance in addCollection', () => {
    const { masterIndex } = createTestMasterIndex();
    const metadata = new CollectionMetadata('metadataInput', 'input-file-id', {
      documentCount: 3,
      modificationToken: 'token-456'
    });

    masterIndex.addCollection('metadataInput', metadata);
    const retrieved = masterIndex.getCollection('metadataInput');

    expect(retrieved).toBeInstanceOf(CollectionMetadata);
    expect(retrieved.fileId).toBe('input-file-id');
    expect(retrieved.documentCount).toBe(3);
    expect(retrieved.modificationToken).toBe('token-456');
  });

  it('should return CollectionMetadata instances from getCollections', () => {
    const { masterIndex } = createTestMasterIndex();
    addTestCollection(masterIndex, 'collectionOne');
    addTestCollection(masterIndex, 'collectionTwo');

    const collections = masterIndex.getCollections();

    expect(collections.collectionOne).toBeInstanceOf(CollectionMetadata);
    expect(collections.collectionTwo).toBeInstanceOf(CollectionMetadata);
  });

  it('should preserve CollectionMetadata properties through persistence', () => {
    const { key, masterIndex } = createTestMasterIndex();
    const metadata = new CollectionMetadata('persistenceTest', 'persist-file-id', {
      documentCount: 7,
      modificationToken: 'persist-token-789',
      lockStatus: {
        isLocked: false,
        lockedBy: null,
        lockedAt: null,
        lockTimeout: null
      }
    });

    masterIndex.addCollection('persistenceTest', metadata);
    const reloaded = new MasterIndex({ masterIndexKey: key }).getCollection('persistenceTest');

    expect(reloaded).toBeInstanceOf(CollectionMetadata);
    expect(reloaded.name).toBe('persistenceTest');
    expect(reloaded.fileId).toBe('persist-file-id');
    expect(reloaded.documentCount).toBe(7);
    expect(reloaded.modificationToken).toBe('persist-token-789');
    expect(reloaded.getLockStatus()).toEqual({
      isLocked: false,
      lockedBy: null,
      lockedAt: null,
      lockTimeout: null
    });
  });

  it('should update CollectionMetadata instance properties correctly', () => {
    const { masterIndex } = createTestMasterIndex();
    const metadata = new CollectionMetadata('updateMetadata', 'update-file-id', {
      documentCount: 0,
      modificationToken: 'initial-token'
    });

    masterIndex.addCollection('updateMetadata', metadata);
    const updated = masterIndex.updateCollectionMetadata('updateMetadata', {
      documentCount: 15,
      modificationToken: 'updated-token'
    });

    expect(updated).toBeInstanceOf(CollectionMetadata);
    expect(updated.documentCount).toBe(15);
    expect(updated.modificationToken).toBe('updated-token');
    expect(updated.fileId).toBe('update-file-id');
  });

  it('should throw error if MasterIndex is corrupted', () => {
    const key = registerKey(createKey());
    scriptProperties.setProperty(key, '{corruptJson');

    expect(() => new MasterIndex({ masterIndexKey: key })).toThrow(ErrorHandler.ErrorTypes.MASTER_INDEX_ERROR);
  });
});

describe('Conflict Detection and Resolution', () => {
  it('should generate unique modification tokens', () => {
    const { masterIndex } = createTestMasterIndex();

    const tokenOne = masterIndex.generateModificationToken();
    const tokenTwo = masterIndex.generateModificationToken();

    expect(tokenOne).not.toBe(tokenTwo);
    expect(masterIndex.validateModificationToken(tokenOne)).toBe(true);
    expect(masterIndex.validateModificationToken(tokenTwo)).toBe(true);
  });

  it('should detect conflicts using modification tokens', () => {
    const { masterIndex } = createTestMasterIndex();
    addTestCollection(masterIndex, 'conflictDetection');

    const currentToken = masterIndex.getCollection('conflictDetection').getModificationToken();
    const newToken = masterIndex.generateModificationToken();
    masterIndex.updateCollectionMetadata('conflictDetection', { modificationToken: newToken });

    expect(masterIndex.hasConflict('conflictDetection', currentToken)).toBe(true);
    expect(masterIndex.hasConflict('conflictDetection', newToken)).toBe(false);
  });

  it('should resolve conflicts with last-write-wins strategy', () => {
    const { masterIndex } = createTestMasterIndex();
    const original = addTestCollection(masterIndex, 'conflictResolution', { documentCount: 5 });
    const originalToken = original.getModificationToken();

    const resolution = masterIndex.resolveConflict('conflictResolution', {
      documentCount: 8
    }, 'LAST_WRITE_WINS');

    expect(resolution.success).toBe(true);
    expect(resolution.data).toBeInstanceOf(CollectionMetadata);
    expect(resolution.data.documentCount).toBe(8);
    expect(resolution.data.getModificationToken()).not.toBe(originalToken);
  });

  it('should track modification history for debugging', () => {
    const { masterIndex } = createTestMasterIndex();
    addTestCollection(masterIndex, 'historyTest');
    masterIndex.updateCollectionMetadata('historyTest', { documentCount: 1 });
    masterIndex.updateCollectionMetadata('historyTest', { documentCount: 2 });

    const history = masterIndex.getModificationHistory('historyTest');

    expect(Array.isArray(history)).toBe(true);
    expect(history.length).toBeGreaterThanOrEqual(3);
    expect(history.at(-1).operation).toBe('UPDATE_METADATA');
  });

  it('should validate modification token format', () => {
    const { masterIndex } = createTestMasterIndex();

    const validToken = masterIndex.generateModificationToken();

    expect(masterIndex.validateModificationToken(validToken)).toBe(true);
    expect(masterIndex.validateModificationToken('invalid token')).toBe(false);
    expect(masterIndex.validateModificationToken(null)).toBe(false);
  });
});

describe('MasterIndex Integration', () => {
  it('should coordinate locking and conflict detection', () => {
    const { masterIndex } = createTestMasterIndex({ lockTimeout: 200 });
    addTestCollection(masterIndex, 'integrationTest');

    const operationId = 'integration-operation';
    expect(masterIndex.acquireCollectionLock('integrationTest', operationId)).toBe(true);

    const nextToken = masterIndex.generateModificationToken();
    masterIndex.updateCollectionMetadata('integrationTest', { modificationToken: nextToken });

    expect(masterIndex.isCollectionLocked('integrationTest')).toBe(true);
    expect(masterIndex.hasConflict('integrationTest', nextToken)).toBe(false);
    expect(masterIndex.releaseCollectionLock('integrationTest', operationId)).toBe(true);
  });

  it('should handle complete operation lifecycle', () => {
    const { masterIndex } = createTestMasterIndex();
    addTestCollection(masterIndex, 'lifecycleTest');

    const operationId = 'lifecycle-operation';
    expect(masterIndex.acquireCollectionLock('lifecycleTest', operationId)).toBe(true);

    const updateTimestamp = new Date('2025-06-02T12:00:00Z');
    masterIndex.updateCollectionMetadata('lifecycleTest', {
      documentCount: 10,
      lastUpdated: updateTimestamp
    });

    expect(masterIndex.releaseCollectionLock('lifecycleTest', operationId)).toBe(true);
    expect(masterIndex.isCollectionLocked('lifecycleTest')).toBe(false);

    const collection = masterIndex.getCollection('lifecycleTest');
    expect(collection.documentCount).toBe(10);
    expect(collection.lastUpdated.toISOString()).toBe(updateTimestamp.toISOString());
  });

  it('should maintain CollectionMetadata integrity during conflict resolution', () => {
    const { masterIndex } = createTestMasterIndex();
    const originalMetadata = new CollectionMetadata('metadataConflict', 'conflict-file-id', {
      documentCount: 5,
      modificationToken: 'original-token'
    });

    masterIndex.addCollection('metadataConflict', originalMetadata);
    const resolution = masterIndex.resolveConflict('metadataConflict', {
      documentCount: 8,
      lastModified: new Date('2025-06-02T11:00:00Z')
    }, 'LAST_WRITE_WINS');

    const resolved = masterIndex.getCollection('metadataConflict');
    expect(resolution.success).toBe(true);
    expect(resolved).toBeInstanceOf(CollectionMetadata);
    expect(resolved.documentCount).toBe(8);
    expect(resolved.modificationToken).not.toBe('original-token');
    expect(resolved.fileId).toBe('conflict-file-id');
  });

  it('should handle CollectionMetadata in complete operation lifecycle with persistence', () => {
    const { key, masterIndex } = createTestMasterIndex();
    const metadata = new CollectionMetadata('metadataLifecycle', 'lifecycle-file-id', {
      documentCount: 2,
      modificationToken: 'lifecycle-token'
    });

    masterIndex.addCollection('metadataLifecycle', metadata);
    const operationId = 'metadata-lifecycle-operation';
    expect(masterIndex.acquireCollectionLock('metadataLifecycle', operationId)).toBe(true);

    masterIndex.updateCollectionMetadata('metadataLifecycle', { documentCount: 12 });
    expect(masterIndex.releaseCollectionLock('metadataLifecycle', operationId)).toBe(true);

    const reloaded = new MasterIndex({ masterIndexKey: key }).getCollection('metadataLifecycle');
    expect(reloaded).toBeInstanceOf(CollectionMetadata);
    expect(reloaded.documentCount).toBe(12);
    expect(reloaded.fileId).toBe('lifecycle-file-id');
    expect(reloaded.getLockStatus()).toEqual({
      isLocked: false,
      lockedBy: null,
      lockedAt: null,
      lockTimeout: null
    });
  });
});
