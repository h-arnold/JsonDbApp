// 03_LockServiceCollectionLockTestSuite.js
// Tests for collection-level lock operations in DbLockService

/**
 * Creates a test suite for collection-level lock acquire/release and status operations
 * @returns {TestSuite}
 */
function createLockServiceCollectionLockTestSuite() {
  const suite = new TestSuite('LockService Collection Lock Operations');

  suite.addTest('testAcquireNewCollectionLock', function() {
    const svc = new DbLockService();
    const key = 'colA';
    const opId = 'op1';
    // Act & Assert
    TestFramework.assertTrue(svc.acquireCollectionLock(key, opId), 'Should acquire new lock');
    TestFramework.assertTrue(svc.isCollectionLocked(key), 'Lock status should be true after acquire');
  });

  suite.addTest('testAcquireExistingLockFails', function() {
    const svc = new DbLockService();
    const key = 'colB';
    const opId1 = 'op1';
    const opId2 = 'op2';
    svc.acquireCollectionLock(key, opId1);
    TestFramework.assertFalse(svc.acquireCollectionLock(key, opId2), 'Should not acquire when already locked');
  });

  suite.addTest('testReleaseCollectionLock', function() {
    const svc = new DbLockService();
    const key = 'colC';
    const opId = 'opX';
    svc.acquireCollectionLock(key, opId);
    TestFramework.assertTrue(svc.releaseCollectionLock(key, opId), 'Should release lock owned');
    TestFramework.assertFalse(svc.isCollectionLocked(key), 'Lock status should be false after release');
  });

  suite.addTest('testReleaseWithWrongOpIdFails', function() {
    const svc = new DbLockService();
    const key = 'colD';
    const opIdA = 'opA';
    const opIdB = 'opB';
    svc.acquireCollectionLock(key, opIdA);
    TestFramework.assertFalse(svc.releaseCollectionLock(key, opIdB), 'Release should fail for wrong opId');
  });

  suite.addTest('testExpiredLockAllowsAcquire', function() {
    const svc = new DbLockService({ lockTimeout: 1 });
    const key = 'colE';
    const op1 = 'o1';
    const op2 = 'o2';
    svc.acquireCollectionLock(key, op1);
    // Sleep until expiry
    Utilities.sleep(10);
    TestFramework.assertTrue(svc.acquireCollectionLock(key, op2), 'Expired lock should allow new acquire');
  });

  return suite;
}
