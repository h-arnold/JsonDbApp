// 01_LockServiceConstructorTestSuite.js
// Tests for DbLockService constructor

/**
 * Creates a test suite for DbLockService constructor validation
 * @returns {TestSuite}
 */
function createLockServiceConstructorTestSuite() {
  const suite = new TestSuite('LockService Constructor');

  suite.addTest('testDefaultTimeout', function() {
    // Act
    const svc = new DbLockService();
    // Assert
    TestFramework.assertEquals(svc._lockTimeout, 5000, 'Default lock timeout should be 5000ms');
  });

  suite.addTest('testCustomTimeout', function() {
    // Act
    const svc = new DbLockService({ lockTimeout: 10000 });
    // Assert
    TestFramework.assertEquals(svc._lockTimeout, 10000, 'Custom lock timeout should be used');
  });

  suite.addTest('testInvalidConfigType', function() {
    // Assert
    TestFramework.assertThrows(() => {
      new DbLockService('invalid');
    }, Error, 'Should throw for non-object config');
  });

  suite.addTest('testInvalidTimeoutType', function() {
    // Assert
    TestFramework.assertThrows(() => {
      new DbLockService({ lockTimeout: 'invalid' });
    }, Error, 'Should throw for non-number lockTimeout');
  });

  return suite;
}
