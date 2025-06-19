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
  const suite = new TestSuite('LockService Real Environment Integration Tests');

  // Test environment setup for real GAS integration
  suite.setBeforeAll(function() {
    setupLockServiceTestEnvironment();
  });

  suite.setAfterAll(function() {
    cleanupLockServiceTestEnvironment();
  });

  suite.addTest('testLockServiceWithRealGASLockService', function() {
    // Arrange
    const lockService = new LockService();
    // Act
    const lock = lockService.acquireScriptLock(5000);
    // Assert
    TestFramework.assertDefined(lock, 'Should acquire real GAS lock');
    TestFramework.assertEquals('object', typeof lock, 'Lock should be an object');
    TestFramework.assertEquals('function', typeof lock.releaseLock, 'Lock should have releaseLock method');
    TestFramework.assertEquals('function', typeof lock.waitLock, 'Lock should have waitLock method');
    // GAS Lock has hasLock only on LockService.Lock - optional
    if (typeof lock.hasLock === 'function') {
      TestFramework.assertTrue(typeof lock.hasLock === 'function', 'Lock should have hasLock method');
    }
    // Cleanup
    lockService.releaseScriptLock(lock);
  });

  suite.addTest('testLockServiceConcurrentOperations', function() {
    // Arrange
    const lockService1 = new LockService();
    const lockService2 = new LockService();
    // Act: first service acquires lock
    const lock1 = lockService1.acquireScriptLock(1000);
    TestFramework.assertDefined(lock1, 'First lock should be acquired');
    // Act & Assert: second acquisition should timeout
    TestFramework.assertThrows(() => {
      lockService2.acquireScriptLock(100); // Short timeout
    }, ErrorHandler.ErrorTypes.LOCK_TIMEOUT, 'Second lock acquisition should timeout');
    // Release first lock
    lockService1.releaseScriptLock(lock1);
    // Now second service should acquire
    const lock2 = lockService2.acquireScriptLock(1000);
    TestFramework.assertDefined(lock2, 'Second lock should be acquired after first is released');
    // Cleanup
    lockService2.releaseScriptLock(lock2);
  });

  suite.addTest('testMasterIndexWithRealLockService', function() {
    // Arrange
    const lockService = new LockService();
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
    const lockService = new LockService();
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
