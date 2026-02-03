/* global MasterIndex, CollectionMetadata, ErrorHandler, PropertiesService, DEFAULT_MODIFICATION_HISTORY_LIMIT */

import { afterEach, describe, expect, it } from 'vitest';
import {
  cleanupMasterIndexTests,
  createMasterIndexKey,
  createTestMasterIndex,
  seedMasterIndex
} from '../../helpers/master-index-test-helpers.js';

const scriptProperties = PropertiesService.getScriptProperties();

/**
 * Add a collection using consistent defaults for repeated scenarios.
 * @param {MasterIndex} masterIndex - MasterIndex under test.
 * @param {string} name - Collection identifier.
 * @param {Object} [overrides] - Optional metadata overrides.
 * @returns {CollectionMetadata} Persisted collection metadata.
 */
const addTestCollection = (masterIndex, name, overrides = {}) => {
  const baseMetadata = {
    fileId: `${name}-file`,
    documentCount: 0,
    modificationToken: masterIndex.generateModificationToken(),
    lastModified: new Date('2024-01-01T00:00:00Z'),
    lockStatus: null
  };

  const metadata = {
    ...baseMetadata,
    ...overrides,
    name
  };

  masterIndex.addCollection(name, metadata);
  return masterIndex.getCollection(name);
};

afterEach(() => {
  cleanupMasterIndexTests();
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
    const key = createMasterIndexKey();
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

  it('should normalise CollectionMetadata instances when provided name differs', () => {
    const { masterIndex } = createTestMasterIndex();
    const metadata = new CollectionMetadata('mismatchedName', 'normalise-file-id', {
      documentCount: 4,
      modificationToken: 'normalise-token'
    });

    masterIndex.addCollection('expectedName', metadata);
    const stored = masterIndex.getCollection('expectedName');

    expect(stored).toBeInstanceOf(CollectionMetadata);
    expect(stored.name).toBe('expectedName');
    expect(stored.fileId).toBe('normalise-file-id');
    expect(stored.documentCount).toBe(4);
    expect(stored.modificationToken).toBe('normalise-token');
  });

  it('should normalise raw metadata payloads including timestamps and lock status', () => {
    const { masterIndex } = createTestMasterIndex();
    const createdInput = '2024-05-05T08:30:00Z';
    const lastUpdatedInput = Date.parse('2024-05-06T09:15:00Z');
    const lockStatus = {
      isLocked: true,
      lockedBy: 'raw-owner',
      lockedAt: 1714986900000,
      lockTimeout: 12345
    };
    const metadata = {
      fileId: 'raw-metadata-file',
      created: createdInput,
      lastUpdated: lastUpdatedInput,
      documentCount: 9,
      modificationToken: 'raw-token-1',
      lockStatus: { ...lockStatus }
    };

    const stored = masterIndex.addCollection('rawNormalisation', metadata);

    expect(stored).toBeInstanceOf(CollectionMetadata);
    expect(stored.created.toISOString()).toBe(new Date(createdInput).toISOString());
    expect(stored.lastUpdated.toISOString()).toBe(new Date(lastUpdatedInput).toISOString());
    expect(stored.documentCount).toBe(9);
    expect(stored.getModificationToken()).toBe('raw-token-1');
    expect(stored.getLockStatus()).toEqual(lockStatus);

    metadata.lockStatus.lockedBy = 'mutated-owner';
    expect(stored.getLockStatus().lockedBy).toBe('raw-owner');
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
    const key = createMasterIndexKey();
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

  it('should respect configurable modification history limits', () => {
    const { masterIndex } = createTestMasterIndex({ modificationHistoryLimit: 2 });
    addTestCollection(masterIndex, 'historyLimit');
    masterIndex.updateCollectionMetadata('historyLimit', { documentCount: 1 });
    masterIndex.updateCollectionMetadata('historyLimit', { documentCount: 2 });
    masterIndex.updateCollectionMetadata('historyLimit', { documentCount: 3 });

    const history = masterIndex.getModificationHistory('historyLimit');

    expect(history).toHaveLength(2);
    expect(history[0].operation).toBe('UPDATE_METADATA');
    expect(history[1].data.documentCount).toBe(3);
  });

  it('should validate modification token format', () => {
    const { masterIndex } = createTestMasterIndex();

    const validToken = masterIndex.generateModificationToken();

    expect(masterIndex.validateModificationToken(validToken)).toBe(true);
    expect(masterIndex.validateModificationToken('invalid token')).toBe(false);
    expect(masterIndex.validateModificationToken(null)).toBe(false);
  });
});

describe('MasterIndex Helper Behaviour', () => {
  it('should normalise history entries and enforce default capping', () => {
    // Arrange - create collection and configure default history fallback
    const { masterIndex } = createTestMasterIndex({ modificationHistoryLimit: 0 });
    addTestCollection(masterIndex, 'helperHistory');
    const isoPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
    const updatesToApply = DEFAULT_MODIFICATION_HISTORY_LIMIT + 5;

    // Act - issue enough updates to trigger history capping via public APIs
    for (let i = 0; i < updatesToApply; i += 1) {
      masterIndex.updateCollectionMetadata('helperHistory', { documentCount: i });
    }
    const history = masterIndex.getModificationHistory('helperHistory');

    // Assert - verify capped length, timestamp normalisation, and retained payload data
    expect(history).toHaveLength(DEFAULT_MODIFICATION_HISTORY_LIMIT);
    const firstEntry = history[0];
    const lastEntry = history.at(-1);
    expect(firstEntry.operation).toBe('UPDATE_METADATA');
    expect(lastEntry.operation).toBe('UPDATE_METADATA');
    expect(isoPattern.test(firstEntry.timestamp)).toBe(true);
    expect(isoPattern.test(lastEntry.timestamp)).toBe(true);
    expect(firstEntry.data.documentCount).toBe(updatesToApply - DEFAULT_MODIFICATION_HISTORY_LIMIT);
    expect(lastEntry.data.documentCount).toBe(updatesToApply - 1);
  });

  it('should preserve addCollection history snapshots after metadata mutations', () => {
    // Arrange - capture initial addCollection history entry
    const { masterIndex } = createTestMasterIndex();
    const initialMetadata = new CollectionMetadata('historySnapshot', 'history-file-id', {
      documentCount: 2,
      modificationToken: 'token-history'
    });
    masterIndex.addCollection('historySnapshot', initialMetadata);
    const historyBeforeUpdate = masterIndex.getModificationHistory('historySnapshot');
    const initialEntry = historyBeforeUpdate[0];

    // Act - mutate metadata via public update API
    masterIndex.updateCollectionMetadata('historySnapshot', { documentCount: 5 });
    const updatedCollection = masterIndex.getCollection('historySnapshot');

    // Assert - ensure history snapshot remains immutable after updates
    expect(historyBeforeUpdate).toHaveLength(1);
    expect(initialEntry.data).toBeInstanceOf(CollectionMetadata);
    expect(initialEntry.data.documentCount).toBe(2);
    expect(updatedCollection.documentCount).toBe(5);
    expect(initialEntry.data.documentCount).toBe(2);
    expect(initialEntry.data).not.toBe(updatedCollection);
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
