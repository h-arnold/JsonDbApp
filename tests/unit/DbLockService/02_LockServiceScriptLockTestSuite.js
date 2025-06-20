// 02_LockServiceScriptLockTestSuite.js
// Tests for script-level lock operations in DbLockService

/**
 * Creates a test suite for script lock acquire and release operations
 * @returns {TestSuite}
 */
function createLockServiceScriptLockTestSuite() {
  const suite = new TestSuite('LockService Script Lock Operations');

  suite.addTest('testAcquireAndReleaseScriptLock', function() {
    // Arrange
    const svc = new DbLockService();
    // Act & Assert - should acquire and release without error
    svc.acquireScriptLock(1000);
    TestFramework.assertDefined(svc._scriptLock, 'Script lock should be defined after acquire');
    svc.releaseScriptLock();
    TestFramework.assertNull(svc._scriptLock, 'Script lock should be null after release');
  });

  suite.addTest('testReleaseWithoutAcquireThrows', function() {
    // Arrange
    const svc = new DbLockService();
    // Act & Assert
    TestFramework.assertThrows(() => {
      svc.releaseScriptLock();
    }, Error, 'Releasing without acquire should throw');
  });

  suite.addTest('testInvalidTimeoutThrows', function() {
    const svc = new DbLockService();
    TestFramework.assertThrows(() => {
      svc.acquireScriptLock('invalid');
    }, Error, 'Non-number timeout should throw');
    TestFramework.assertThrows(() => {
      svc.acquireScriptLock(-1);
    }, Error, 'Negative timeout should throw');
  });

  return suite;
}
