/* global Utilities */

import { afterEach, describe, expect, it } from 'vitest';
import {
  cleanupMasterIndexTests,
  createTestMasterIndex
} from '../../helpers/master-index-test-helpers.js';

/**
 * Add a simple collection entry for lock lifecycle tests.
 * @param {MasterIndex} masterIndex - MasterIndex under test.
 * @param {string} name - Collection name.
 * @returns {void}
 */
const addLockTestCollection = (masterIndex, name) => {
  masterIndex.addCollection(name, {
    name,
    fileId: `${name}-file`,
    documentCount: 0,
    modificationToken: masterIndex.generateModificationToken(),
    lockStatus: null
  });
};

afterEach(() => {
  cleanupMasterIndexTests();
});

describe('MasterIndex lock lease renewal', () => {
  it('should keep a longer custom lease active beyond the old single timeout window', () => {
    const { masterIndex } = createTestMasterIndex({ lockTimeout: 1200 });
    addLockTestCollection(masterIndex, 'extendedLeaseTest');

    const operationId = 'extended-lease-operation';
    expect(masterIndex.acquireCollectionLock('extendedLeaseTest', operationId)).toBe(true);

    Utilities.sleep(700);

    expect(masterIndex.isCollectionLocked('extendedLeaseTest')).toBe(true);
    expect(masterIndex.releaseCollectionLock('extendedLeaseTest', operationId)).toBe(true);
  });

  it('should renew an active collection lock before it expires', () => {
    const { masterIndex } = createTestMasterIndex({ lockTimeout: 700 });
    addLockTestCollection(masterIndex, 'renewedLeaseTest');

    const operationId = 'renewed-lease-operation';
    expect(masterIndex.acquireCollectionLock('renewedLeaseTest', operationId)).toBe(true);

    Utilities.sleep(550);

    expect(masterIndex.renewCollectionLock('renewedLeaseTest', operationId, 700)).toBe(true);

    Utilities.sleep(550);

    expect(masterIndex.isCollectionLocked('renewedLeaseTest')).toBe(true);
    expect(masterIndex.releaseCollectionLock('renewedLeaseTest', operationId)).toBe(true);
  });

  it('should refuse to renew a lock owned by another operation', () => {
    const { masterIndex } = createTestMasterIndex({ lockTimeout: 700 });
    addLockTestCollection(masterIndex, 'renewedLeaseTest');

    expect(masterIndex.acquireCollectionLock('renewedLeaseTest', 'owner-operation')).toBe(true);

    expect(masterIndex.renewCollectionLock('renewedLeaseTest', 'different-operation', 700)).toBe(
      false
    );
  });

  it('should refuse to renew a lock after it has already expired', () => {
    const { masterIndex } = createTestMasterIndex({ lockTimeout: 700 });
    addLockTestCollection(masterIndex, 'renewedLeaseTest');

    const operationId = 'expired-renewal-operation';
    expect(masterIndex.acquireCollectionLock('renewedLeaseTest', operationId)).toBe(true);

    Utilities.sleep(750);

    expect(masterIndex.renewCollectionLock('renewedLeaseTest', operationId, 700)).toBe(false);
  });
});
