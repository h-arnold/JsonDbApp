/**
 * LockService Real Environment Integration Test Suite
 * Tests for LockService integration with actual Google Apps Script environment
 * Uses live GAS services with proper setup/teardown rather than mocks
 */

/**
 * Creates test suite for LockService real environment integration
 * @returns {TestSuite} The real environment integration test suite
 */
function createRealEnvironmentIntegrationTestSuite() {
  const suite = new TestSuite('DbLockService Real Environment Integration Tests');

  // Test environment setup for real GAS integration
  suite.setBeforeAll(function() {
    setupLockServiceTestEnvironment();
  });

  suite.setAfterAll(function() {
    cleanupLockServiceTestEnvironment();
  });

  suite.addTest('testLockServiceWithRealGASLockService', function() {
    // Arrange
    const lockService = new DbLockService();
    // Act & Assert
    TestFramework.assertNoThrow(() => {
      lockService.acquireScriptLock(5000);
    }, 'Should acquire real GAS lock without error');
    // Cleanup
    TestFramework.assertNoThrow(() => {
      lockService.releaseScriptLock();
    }, 'Should release real GAS lock without error');
  });

  suite.addTest('testLockServiceConcurrentOperations', function() {
    // Arrange
    const lockService1 = new DbLockService();
    const lockService2 = new DbLockService();
    // Act: first service acquires lock
    TestFramework.assertNoThrow(() => {
      lockService1.acquireScriptLock(1000);
    }, 'First lock should be acquired');
    // Act & Assert: second acquisition should timeout
    TestFramework.assertThrows(() => {
      lockService2.acquireScriptLock(100); // Short timeout
    }, ErrorHandler.ErrorTypes.LOCK_TIMEOUT, 'Second lock acquisition should timeout');
    // Release first lock
    TestFramework.assertNoThrow(() => {
      lockService1.releaseScriptLock();
    }, 'Should release first lock without error');
    // Now second service should acquire
    TestFramework.assertNoThrow(() => {
      lockService2.acquireScriptLock(1000);
    }, 'Second lock should be acquired after first is released');
    // Cleanup
    TestFramework.assertNoThrow(() => {
      lockService2.releaseScriptLock();
    }, 'Should release second lock without error');
  });

  suite.addTest('testMasterIndexWithRealLockService', function() {
    // Arrange
    const lockService = new DbLockService();
    const config = { masterIndexKey: LOCKSERVICE_TEST_DATA.testMasterIndexKey };
    const masterIndex = new MasterIndex(config, lockService);
    // Act: save and load data
    const testData = { collections: { test: { fileId: 'test-file-id' } } };
    masterIndex.save(testData);
    const loadedData = masterIndex.load();
    // Assert
    TestFramework.assertDefined(loadedData, 'Should load data using real LockService');
    TestFramework.assertEquals(testData.collections.test.fileId, loadedData.collections.test.fileId, 'Loaded data should match saved data');
  });

  suite.addTest('testLockServiceErrorHandlingWithRealEnvironment', function() {
    // Arrange
    const lockService = new DbLockService();
    // Acquire a lock first
    const firstLock = lockService.acquireScriptLock(5000);
    TestFramework.assertDefined(firstLock, 'First lock should be acquired');
    try {
      // Attempt to acquire second lock with short timeout
      TestFramework.assertThrows(() => {
        lockService.acquireScriptLock(50);
      }, ErrorHandler.ErrorTypes.LOCK_TIMEOUT, 'Should throw LOCK_TIMEOUT when lock cannot be acquired');
      // Test invalid timeout values
      TestFramework.assertThrows(() => {
        lockService.acquireScriptLock(-1);
      }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw INVALID_ARGUMENT for negative timeout');
      TestFramework.assertThrows(() => {
        lockService.acquireScriptLock('invalid');
      }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw INVALID_ARGUMENT for non-numeric timeout');
      // Test release with invalid lock instance
      TestFramework.assertThrows(() => {
        lockService.releaseScriptLock(null);
      }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw INVALID_ARGUMENT for null lock');
      TestFramework.assertThrows(() => {
        lockService.releaseScriptLock('not-a-lock');
      }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw INVALID_ARGUMENT for invalid lock type');
    } finally {
      lockService.releaseScriptLock(firstLock);
    }
  });

  return suite;
}
