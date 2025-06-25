// 06_LockServiceScriptLockTimeoutTestSuite.js
// Tests for script-level lock timeout path in DbLockService

/**
 * Creates a test suite to verify script lock timeout error is thrown
 * @returns {TestSuite}
 */
function createLockServiceScriptLockTimeoutTestSuite() {
  const suite = new TestSuite('LockService Script Lock Timeout');

  suite.addTest('testScriptLockTimeoutThrows', function() {
    // Arrange: create instance and stub internal lock to throw
    const svc = new DbLockService();
    svc._acquireScriptLockInstance = function() {
      this._scriptLock = {
        waitLock: function(ms) { throw new Error('simulated timeout'); },
        releaseLock: function() {}
      };
    };

    // Act & Assert: should rethrow as LOCK_TIMEOUT
    TestFramework.assertThrows(
      () => svc.acquireScriptLock(10),
      ErrorHandler.ErrorTypes.LOCK_TIMEOUT,
      'Should throw LOCK_TIMEOUT when waitLock fails'
    );
  });

  return suite;
}
