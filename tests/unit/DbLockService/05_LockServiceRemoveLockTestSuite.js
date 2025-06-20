// 05_LockServiceRemoveLockTestSuite.js
// Tests for removeCollectionLock in DbLockService

/**
 * Creates a test suite for removeCollectionLock functionality
 * @returns {TestSuite}
 */
function createLockServiceRemoveLockTestSuite() {
  const suite = new TestSuite('LockService Remove Collection Lock');

  suite.addTest('testRemoveCollectionLock', function() {
    const svc = new DbLockService();
    const key = 'colX';
    const opId = 'opX';
    // Acquire a lock
    TestFramework.assertTrue(svc.acquireCollectionLock(key, opId), 'Should acquire initial lock');

    // Remove it unconditionally
    svc.removeCollectionLock(key);

    // Now should not be locked
    TestFramework.assertFalse(svc.isCollectionLocked(key), 'Lock should be removed by removeCollectionLock');
  });

  return suite;
}
