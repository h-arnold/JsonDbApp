import { afterEach, describe, expect, it } from 'vitest';

const scriptProperties = PropertiesService.getScriptProperties();
const activeMasterIndexKeys = new Set();

const createKey = () => `VIITEST_MASTER_INDEX_${Date.now()}_${Math.random().toString(36).slice(2)}`;

const trackMasterIndexKey = (key) => {
  activeMasterIndexKeys.add(key);
  return key;
};

afterEach(() => {
  for (const key of activeMasterIndexKeys) {
    scriptProperties.deleteProperty(key);
  }
  activeMasterIndexKeys.clear();
});

describe('MasterIndex (Viitest + gas mocks)', () => {
  it('initialises a fresh master index and persists it to the mock ScriptProperties', () => {
    const key = trackMasterIndexKey(createKey());
    const masterIndex = new MasterIndex({ masterIndexKey: key, version: 2 });

    expect(masterIndex.isInitialised()).toBeTruthy();
    expect(scriptProperties.getProperty(key)).not.toBeNull();
  });

  it('stores and reloads collection metadata', () => {
    const key = trackMasterIndexKey(createKey());
    const masterIndex = new MasterIndex({ masterIndexKey: key });

    masterIndex.addCollection('vitest-collection', {
      name: 'vitest-collection',
      fileId: 'drive-vitest-file',
      documentCount: 2
    });

    const persisted = new MasterIndex({ masterIndexKey: key });
    const collections = persisted.getCollections();

    expect(collections).toHaveProperty('vitest-collection');
    expect(collections['vitest-collection'].documentCount).toBe(2);
    expect(collections['vitest-collection'].fileId).toBe('drive-vitest-file');
  });

  it('detects conflicts via modification tokens', () => {
    const key = trackMasterIndexKey(createKey());
    const masterIndex = new MasterIndex({ masterIndexKey: key });
    masterIndex.addCollection('conflict-collection', {
      name: 'conflict-collection',
      fileId: 'drive-conflict-file'
    });

    const originalToken = masterIndex.getCollection('conflict-collection').getModificationToken();
    const newToken = masterIndex.generateModificationToken();
    masterIndex.updateCollectionMetadata('conflict-collection', { modificationToken: newToken });

    expect(masterIndex.hasConflict('conflict-collection', originalToken)).toBe(true);
    expect(masterIndex.hasConflict('conflict-collection', newToken)).toBe(false);
  });

  it('acquires and releases collection locks', () => {
    const key = trackMasterIndexKey(createKey());
    const masterIndex = new MasterIndex({ masterIndexKey: key, lockTimeout: 100 });
    masterIndex.addCollection('lock-collection', {
      name: 'lock-collection',
      fileId: 'drive-lock-file'
    });

    const operationId = 'operation-lock';
    expect(masterIndex.acquireCollectionLock('lock-collection', operationId)).toBe(true);
    expect(masterIndex.isCollectionLocked('lock-collection')).toBe(true);

    expect(masterIndex.releaseCollectionLock('lock-collection', operationId)).toBe(true);
    expect(masterIndex.isCollectionLocked('lock-collection')).toBe(false);
  });
});
