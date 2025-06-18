/**
 * LockService Operation Test Suite
 * Tests for LockService lock acquisition and release operations
 */

/**
 * Creates test suite for LockService lock operations
 * @returns {TestSuite} The lock operation test suite
 */
function createLockServiceOperationTestSuite() {
  const suite = new TestSuite('LockService Operation Tests');

  suite.addTest('testAcquireScriptLockSuccess', function() {
    // Arrange: mock global GAS LockService
    const mockLock = { waitLock: function(timeout) {}, releaseLock: function() {} };
    globalThis.LockService = { getScriptLock: () => mockLock };
    const lockService = new LockService();
    // Act
    const lock = lockService.acquireScriptLock(5000);
    // Assert
    TestFramework.assertEquals(mockLock, lock, 'Should return mock GAS lock');
  });

  suite.addTest('testAcquireScriptLockTimeout', function() {
    // Arrange: mock lock that throws on wait
    const mockLock = { waitLock: function(timeout) { throw new Error('timeout'); }, releaseLock: function() {} };
    globalThis.LockService = { getScriptLock: () => mockLock };
    const lockService = new LockService();
    // Act & Assert
    TestFramework.assertThrows(() => {
      lockService.acquireScriptLock(100);
    }, ErrorHandler.ErrorTypes.LOCK_TIMEOUT, 'Should throw LOCK_TIMEOUT on waitLock failure');
  });

  suite.addTest('testAcquireScriptLockInvalidTimeout', function() {
    // Arrange
    const lockService = new LockService();
    // Act & Assert: negative timeout
    TestFramework.assertThrows(() => {
      lockService.acquireScriptLock(-1);
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw INVALID_ARGUMENT for negative timeout');
  });

  suite.addTest('testReleaseScriptLockSuccess', function() {
    // Arrange
    const mockLock = { releaseLock: function() { this.released = true; } };
    const lockService = new LockService();
    // Act
    lockService.releaseScriptLock(mockLock);
    // Assert
    TestFramework.assertTrue(mockLock.released === true, 'Mock lock should have been released');
  });

  suite.addTest('testReleaseScriptLockInvalidInstance', function() {
    // Arrange
    const lockService = new LockService();
    // Act & Assert
    TestFramework.assertThrows(() => {
      lockService.releaseScriptLock('not-a-lock');
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw INVALID_ARGUMENT for invalid lock instance');
  });

  suite.addTest('testReleaseScriptLockNullInstance', function() {
    // Arrange
    const lockService = new LockService();
    // Act & Assert
    TestFramework.assertThrows(() => {
      lockService.releaseScriptLock(null);
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw INVALID_ARGUMENT for null lock instance');
  });

  return suite;
}
