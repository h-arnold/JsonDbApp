/**
 * DbLockService Constructor Test Suite
 * Tests for LockService constructor validation and configuration
 */

/**
 * Creates test suite for DbLockService constructor validation
 * @returns {TestSuite} The constructor test suite
 */
function createDbLockServiceConstructorTestSuite() {
  const suite = new TestSuite('LockService Constructor Tests');
  // Update suite name to reflect DbLockService
  suite.name = 'DbLockService Constructor Tests';

  suite.addTest('testDbLockServiceConstructorWithDefaultConfig', function() {
    // Arrange & Act
    const lockService = new DbLockService();
    // Assert - default timeout should be applied
    TestFramework.assertTrue(lockService instanceof DbLockService, 'Expected instance of DbLockService');
    TestFramework.assertEquals(5000, lockService._lockTimeout, 'Default lockTimeout should be 5000ms');
  });

  suite.addTest('testDbLockServiceConstructorWithInvalidConfig', function() {
    // Arrange
    const invalidConfig = null;
    // Act & Assert - should throw INVALID_ARGUMENT for null config
    TestFramework.assertThrows(() => {
      new DbLockService(invalidConfig);
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Constructor should throw INVALID_ARGUMENT for null config');
  });

  return suite;
}
