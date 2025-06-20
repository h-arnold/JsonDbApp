// 07_LockServiceExpiredCleanupTestSuite.js
// Tests for expired lock cleanup in DbLockService

/**
 * Creates a test suite to verify expired lock cleanup and status
 * @returns {TestSuite}
 */
function createLockServiceExpiredCleanupTestSuite() {
  const suite = new TestSuite('LockService Expired Lock Cleanup');

  suite.addTest('testCleanupExpiredLocksReturnsTrue', function() {
    const svc = new DbLockService({ lockTimeout: 1 });
    const key = 'colY';
    const op = 'oY';
    svc.acquireCollectionLock(key, op);
    Utilities.sleep(10);
    // expired now
    TestFramework.assertTrue(svc.cleanupExpiredCollectionLocks(), 'cleanupExpiredCollectionLocks should return true when locks removed');
  });

  suite.addTest('testCleanupExpiredLocksReturnsFalse', function() {
    const svc = new DbLockService();
    // No locks set
    TestFramework.assertFalse(svc.cleanupExpiredCollectionLocks(), 'cleanupExpiredCollectionLocks should return false when no expired locks');
  });

  suite.addTest('testIsCollectionLockedCleansExpired', function() {
    const svc = new DbLockService({ lockTimeout: 1 });
    const key = 'colZ';
    svc.acquireCollectionLock(key, 'oZ');
    Utilities.sleep(10);
    // expired => isCollectionLocked should cleanup and return false
    TestFramework.assertFalse(svc.isCollectionLocked(key), 'isCollectionLocked should return false for expired locks');
  });

  return suite;
}
