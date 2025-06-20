/**
 * Collection Lock Integration Tests
 * Red Phase tests for Section 8: Cross-Instance Coordination
 */
function createCollectionLockIntegrationTestSuite() {
  const TEST_LOCK_KEY = 'TEST_COLLECTION_LOCK_KEY';
  const suite = new TestSuite('Collection Lock Integration');
  // Clear test lock data before and after all tests
  suite.setBeforeAll(() => {
    PropertiesService.getScriptProperties().deleteProperty(TEST_LOCK_KEY);
  });
  suite.setAfterAll(() => {
    PropertiesService.getScriptProperties().deleteProperty(TEST_LOCK_KEY);
  });

  // Production MasterIndex will use real DbLockService

  // 1.1 Lock Acquisition Tests
  suite.addTest('testCollectionAcquiresLockBeforeModification', function() {
    const mi = new MasterIndex({ masterIndexKey: TEST_LOCK_KEY, lockTimeout: 1000 });
    const opId = 'op1';
    const result = mi.acquireLock('myCollection', opId);
    TestFramework.assertTrue(result, 'Lock should be acquired');
  });

  suite.addTest('testCollectionHandlesLockAcquisitionFailure', function() {
    const mi = new MasterIndex({ masterIndexKey: TEST_LOCK_KEY, lockTimeout: 1000 });
    const opA = 'first'; mi.acquireLock('colFail', opA);
    const result = mi.acquireLock('colFail', 'second');
    TestFramework.assertFalse(result, 'Second acquire should fail due to existing lock');
  });

  suite.addTest('testCollectionReleasesLockAfterOperation', function() {
    const mi = new MasterIndex({ masterIndexKey: TEST_LOCK_KEY, lockTimeout: 1000 });
    const op = 'op3'; mi.acquireLock('colA', op);
    const released = mi.releaseLock('colA', op);
    TestFramework.assertTrue(released, 'Release should return true');
  });

  suite.addTest('testCollectionReleasesLockOnError', function() {
    const mi = new MasterIndex({ masterIndexKey: TEST_LOCK_KEY, lockTimeout: 1000 });
    // Ensure script-level lock release does not block subsequent operations
    try { mi._withScriptLock(() => { throw new Error('fail'); }); } catch (e) {}
    // We can now acquire script lock again without deadlock
    mi.acquireLock('any', 't1');
    TestFramework.assertTrue(mi.releaseLock('any', 't1'), 'Should be able to release after error');
  });

  suite.addTest('testCollectionHandlesLockTimeout', function() {
    const mi = new MasterIndex({ masterIndexKey: TEST_LOCK_KEY, lockTimeout: 1 });
    mi.acquireLock('tcol', 'tid');
    try {
      mi.acquireLock('tcol', 'tid2');
      TestFramework.fail('Expected LockTimeoutError');
    } catch (e) {
      TestFramework.assertTrue(e instanceof LockTimeoutError, 'Should throw LockTimeoutError on timeout');
    }
  });

  // 1.2 Lock Coordination Tests
  suite.addTest('testMultipleCollectionInstancesLockCoordination', function() {
    const cfg = { masterIndexKey: TEST_LOCK_KEY, lockTimeout: 1000 };
    const mi1 = new MasterIndex(cfg);
    const mi2 = new MasterIndex(cfg);
    const gotA = mi1.acquireLock('sharedCol', 'idA');
    const gotB = mi2.acquireLock('sharedCol', 'idB');
    TestFramework.assertTrue(gotA, 'First instance should acquire lock');
    TestFramework.assertFalse(gotB, 'Second instance should not acquire lock while held');
  });

  suite.addTest('testLockExpirationAndCleanup', function() {
    const mi = new MasterIndex({ masterIndexKey: TEST_LOCK_KEY, lockTimeout: 1000 });
    const cleaned = mi.cleanupExpiredLocks();
    TestFramework.assertTrue(cleaned, 'cleanupExpiredLocks should return true');
  });

  suite.addTest('testLockOperationIdValidation', function() {
    const mi = new MasterIndex({ masterIndexKey: TEST_LOCK_KEY, lockTimeout: 1000 });
    TestFramework.assertThrows(() => mi.acquireLock('', ''), InvalidArgumentError, 'Should throw for empty collection name and operationId');
  });

  suite.addTest('testLockStatusReflectedInMetadata', function() {
    const mi = new MasterIndex({ masterIndexKey: TEST_LOCK_KEY, lockTimeout: 1000 });
    mi.addCollection('metaCol', { fileId: 'fid' });
    mi.acquireLock('metaCol', 'mid');
    TestFramework.assertTrue(mi.isLocked('metaCol'), 'Metadata should reflect lock status');
  });

  suite.addTest('testLockPersistenceAcrossInstances', function() {
    const cfg = { masterIndexKey: TEST_LOCK_KEY, lockTimeout: 1000 };
    const mi1 = new MasterIndex(cfg);
    const mi2 = new MasterIndex(cfg);
    mi1.acquireLock('persistCol', 'pid');
    TestFramework.assertTrue(mi2.isLocked('persistCol'), 'Lock should persist across instances');
  });

  // 1.3 Lock Recovery Tests
  suite.addTest('testExpiredLockAutomaticCleanup', function() {
    const mi = new MasterIndex({ masterIndexKey: TEST_LOCK_KEY, lockTimeout: 1000 });
    TestFramework.assertTrue(mi.cleanupExpiredLocks(), 'Expired locks should be cleaned up automatically');
  });

  suite.addTest('testLockRecoveryAfterScriptFailure', function() {
    const mi = new MasterIndex({ masterIndexKey: TEST_LOCK_KEY, lockTimeout: 1000 });
    try { mi._withScriptLock(() => { throw new Error('oops'); }); } catch (e) {}
    // After script failure, collection-level lock acquisition still works
    const acquired = mi.acquireLock('recovCol', 'rid');
    TestFramework.assertTrue(acquired, 'Script lock should be released after failure');
  });

  suite.addTest('testConcurrentLockCleanupOperations', function() {
    const mi = new MasterIndex({ masterIndexKey: TEST_LOCK_KEY, lockTimeout: 1000 });
    TestFramework.assertTrue(mi.cleanupExpiredLocks() && mi.cleanupExpiredLocks(), 'Concurrent cleanup should be safe');
  });

  suite.addTest('testLockValidationDuringOperations', function() {
    const mi = new MasterIndex({ masterIndexKey: TEST_LOCK_KEY, lockTimeout: 1000 });
    const valid = mi.validateModificationToken('123456-abc');
    TestFramework.assertTrue(valid, 'Valid token format should pass');
    const invalid = mi.validateModificationToken('invalid_token');
    TestFramework.assertFalse(invalid, 'Invalid token format should fail');
  });

  suite.addTest('testLockConsistencyAfterErrors', function() {
    const mi = new MasterIndex({ masterIndexKey: TEST_LOCK_KEY, lockTimeout: 1000 });
    try { mi.acquireLock('errCol', 'e1'); mi._withScriptLock(() => { throw new Error('err'); }); } catch (e) {}
    // Consistency: call cleanup should still work
    TestFramework.assertTrue(mi.cleanupExpiredLocks(), 'Should remain consistent after errors');
  });

  return suite;
}

registerTestSuite(createCollectionLockIntegrationTestSuite());
