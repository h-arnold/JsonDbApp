/**
 * Collection Lock Integration Tests
 * Red Phase tests for Section 8: Cross-Instance Coordination
 */
function createCollectionLockIntegrationTestSuite() {
  const suite = new TestSuite('Collection Lock Integration');

  /** Helper: simple mock DbLockService for CollectionLock */
  function createMockCollectionLockService(acquireReturn, options = {}) {
    return {
      locks: {},
      acquireCollectionLock: function(name, opId) {
        this.locks[name] = this.locks[name] || [];
        this.locks[name].push(opId);
        return acquireReturn;
      },
      releaseCollectionLock: function(name, opId) {
        this.releaseCalled = { name, opId };
        return true;
      },
      isCollectionLocked: function(name) {
        return !!this.locks[name] && this.locks[name].length > 0;
      },
      cleanupExpiredCollectionLocks: function() {
        this.cleaned = true;
        return true;
      }
    };
  }

  // 1.1 Lock Acquisition Tests
  suite.addTest('testCollectionAcquiresLockBeforeModification', function() {
    const mockService = createMockCollectionLockService(true);
    const mi = new MasterIndex({}, mockService);
    const opId = 'op1';
    const result = mi.acquireLock('myCollection', opId);
    TestFramework.assertTrue(result, 'Lock should be acquired');
    TestFramework.assertEquals(mockService.locks.myCollection[0], opId, 'Operation ID should be recorded');
  });

  suite.addTest('testCollectionHandlesLockAcquisitionFailure', function() {
    const mockService = createMockCollectionLockService(false);
    const mi = new MasterIndex({}, mockService);
    const opId = 'op2';
    const result = mi.acquireLock('myCollection', opId);
    TestFramework.assertFalse(result, 'Lock acquisition should fail');
  });

  suite.addTest('testCollectionReleasesLockAfterOperation', function() {
    const mockService = createMockCollectionLockService(true);
    const mi = new MasterIndex({}, mockService);
    const opId = 'op3';
    mi.acquireLock('colA', opId);
    const released = mi.releaseLock('colA', opId);
    TestFramework.assertTrue(released, 'Release should return true');
    TestFramework.assertEquals(mockService.releaseCalled.name, 'colA');
    TestFramework.assertEquals(mockService.releaseCalled.opId, opId);
  });

  suite.addTest('testCollectionReleasesLockOnError', function() {
    const mockService = createMockCollectionLockService(true);
    const mi = new MasterIndex({}, mockService);
    const opId = 'opError';
    // Simulate operation throwing inside lock
    try {
      mi._withScriptLock(() => { throw new Error('fail'); });
    } catch (e) {
      // expected
    }
    // After error, script lock should be released
    TestFramework.assertTrue(mockService.releaseScriptLockCalled, 'Collection lock should be released on error');
  });

  suite.addTest('testCollectionHandlesLockTimeout', function() {
    const mockService = createMockCollectionLockService(false);
    const mi = new MasterIndex({}, mockService);
    const opId = 'opTimeout';
    try {
      // In real Collection this would throw LockTimeoutError; here we simulate
      if (!mi.acquireLock('colTimeout', opId)) {
        throw new ErrorHandler.LockTimeoutError('colTimeout', mi._config.lockTimeout);
      }
    } catch (e) {
      TestFramework.assertTrue(e instanceof LockTimeoutError, 'Should throw LockTimeoutError');
    }
  });

  // 1.2 Lock Coordination Tests
  suite.addTest('testMultipleCollectionInstancesLockCoordination', function() {
    const mockService = createMockCollectionLockService(true);
    const mi1 = new MasterIndex({}, mockService);
    const mi2 = new MasterIndex({}, mockService);
    const opA = 'a1';
    const opB = 'b1';
    const gotA = mi1.acquireLock('sharedCol', opA);
    const gotB = mi2.acquireLock('sharedCol', opB);
    TestFramework.assertTrue(gotA, 'First instance should acquire lock');
    TestFramework.assertFalse(gotB, 'Second instance should not acquire lock while held');
  });

  suite.addTest('testLockExpirationAndCleanup', function() {
    const mockService = createMockCollectionLockService(true);
    const mi = new MasterIndex({}, mockService);
    const cleaned = mi.cleanupExpiredLocks();
    TestFramework.assertTrue(cleaned, 'cleanupExpiredLocks should return true');
    TestFramework.assertTrue(mockService.cleaned, 'Underlying service should be called');
  });

  suite.addTest('testLockOperationIdValidation', function() {
    const mockService = createMockCollectionLockService(true);
    const mi = new MasterIndex({}, mockService);
    TestFramework.assertThrows(() => mi.acquireLock('', ''), InvalidArgumentError, 'Should throw InvalidArgumentError for empty parameters');
  });

  suite.addTest('testLockStatusReflectedInMetadata', function() {
    const mockService = createMockCollectionLockService(true);
    const mi = new MasterIndex({}, mockService);
    mi.addCollection('metaCol', { fileId: 'fid' });
    const opId = 'metaOp';
    mi.acquireLock('metaCol', opId);
    const locked = mi.isLocked('metaCol');
    TestFramework.assertTrue(locked, 'Metadata should reflect lock status');
  });

  suite.addTest('testLockPersistenceAcrossInstances', function() {
    const mockService = createMockCollectionLockService(true);
    const mi1 = new MasterIndex({}, mockService);
    const mi2 = new MasterIndex({}, mockService);
    const op = 'persistOp';
    mi1.acquireLock('persistCol', op);
    // New instance reads same service
    const stillLocked = mi2.isLocked('persistCol');
    TestFramework.assertTrue(stillLocked, 'Lock should persist across instances');
  });

  // 1.3 Lock Recovery Tests
  suite.addTest('testExpiredLockAutomaticCleanup', function() {
    const mockService = createMockCollectionLockService(true);
    mockService.cleanupExpiredCollectionLocks = () => true;
    const mi = new MasterIndex({}, mockService);
    const result = mi.cleanupExpiredLocks();
    TestFramework.assertTrue(result, 'Expired locks should be cleaned up automatically');
  });

  suite.addTest('testLockRecoveryAfterScriptFailure', function() {
    const mockService = createMockCollectionLockService(true);
    mockService.releaseScriptLock = function() { this.recovered = true; };
    const mi = new MasterIndex({}, mockService);
    try { mi._withScriptLock(() => { throw new Error('oops'); }); } catch (e) {}
    TestFramework.assertTrue(mockService.recovered, 'Script lock should be released after failure');
  });

  suite.addTest('testConcurrentLockCleanupOperations', function() {
    const mockService = createMockCollectionLockService(true);
    mockService.cleanupExpiredCollectionLocks = () => true;
    const mi = new MasterIndex({}, mockService);
    // Simulate concurrent cleanup calls
    const c1 = mi.cleanupExpiredLocks();
    const c2 = mi.cleanupExpiredLocks();
    TestFramework.assertTrue(c1 && c2, 'Concurrent cleanup should be safe');
  });

  suite.addTest('testLockValidationDuringOperations', function() {
    const mockService = createMockCollectionLockService(true);
    const mi = new MasterIndex({}, mockService);
    const valid = mi.validateModificationToken('123456-abc');
    TestFramework.assertTrue(valid, 'Valid token format should pass');
    const invalid = mi.validateModificationToken('invalid_token');
    TestFramework.assertFalse(invalid, 'Invalid token format should fail');
  });

  suite.addTest('testLockConsistencyAfterErrors', function() {
    const mockService = createMockCollectionLockService(true);
    mockService.cleanupExpiredCollectionLocks = () => true;
    const mi = new MasterIndex({}, mockService);
    // Acquire then error
    try { mi.acquireLock('errCol', 'e1'); mi._withScriptLock(() => { throw new Error('err'); }); } catch (e) {}
    // Consistency: call cleanup should still work
    TestFramework.assertTrue(mi.cleanupExpiredLocks(), 'Should remain consistent after errors');
  });

  return suite;
}

registerTestSuite(createCollectionLockIntegrationTestSuite());
