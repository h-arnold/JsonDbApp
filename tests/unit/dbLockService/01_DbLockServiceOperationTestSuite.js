/**
 * LockService Operation Test Suite
 * Tests for LockService lock acquisition and release operations
 */

/**
 * Creates test suite for LockService lock operations
 * @returns {TestSuite} The lock operation test suite
 */
function createDbLockServiceOperationTestSuite() {
  const suite = new TestSuite('LockService Operation Tests');
  // Update suite name for DbLockService
  suite.name = 'DbLockService Operation Tests';

  suite.addTest('testAcquireScriptLockSuccess', function() {
    // Arrange: mock global GAS LockService
    const mockLock = { waitLock: function(timeout) {}, releaseLock: function() {} };
    globalThis.LockService = { getScriptLock: () => mockLock };
    const lockService = new DbLockService();
    // Act & Assert
    TestFramework.assertNoThrow(() => {
      lockService.acquireScriptLock(5000);
    }, 'Should acquire script lock without error');
  });

  suite.addTest('testAcquireScriptLockTimeout', function() {
    // Arrange: mock lock that throws on wait
    const mockLock = { waitLock: function(timeout) { throw new Error('timeout'); }, releaseLock: function() {} };
    globalThis.LockService = { getScriptLock: () => mockLock };
    const lockService = new DbLockService();
    // Act & Assert
    TestFramework.assertThrows(() => {
      lockService.acquireScriptLock(100);
    }, ErrorHandler.ErrorTypes.LOCK_TIMEOUT, 'Should throw LOCK_TIMEOUT on waitLock failure');
  });

  suite.addTest('testAcquireScriptLockInvalidTimeout', function() {
    // Arrange
    const lockService = new DbLockService();
    // Act & Assert: negative timeout
    TestFramework.assertThrows(() => {
      lockService.acquireScriptLock(-1);
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw INVALID_ARGUMENT for negative timeout');
  });

  suite.addTest('testReleaseScriptLockSuccess', function() {
    // Arrange
    const mockLock = { releaseLock: function() { this.released = true; }, waitLock: function() {} };
    globalThis.LockService = { getScriptLock: () => mockLock };
    const lockService = new DbLockService();
    lockService.acquireScriptLock(5000);
    // Act
    lockService.releaseScriptLock();
    // Assert
    TestFramework.assertTrue(mockLock.released === true, 'Mock lock should have been released');
  });

  suite.addTest('testReleaseScriptLockInvalidInstance', function() {
    // Arrange
    const lockService = new DbLockService();
    // Act & Assert
    TestFramework.assertThrows(() => {
      lockService.releaseScriptLock();
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Should throw INVALID_ARGUMENT if no lock is held');
  });

  return suite;
}
