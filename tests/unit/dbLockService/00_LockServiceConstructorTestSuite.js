/**
 * LockService Constructor Test Suite
 * Tests for LockService constructor validation and configuration
 */

/**
 * Creates test suite for LockService constructor validation
 * @returns {TestSuite} The constructor test suite
 */
function createLockServiceConstructorTestSuite() {
  const suite = new TestSuite('LockService Constructor Tests');

  suite.addTest('testLockServiceConstructorWithDefaultConfig', function() {
    // Arrange & Act
    const lockService = new LockService();
    // Assert - default timeout should be applied
    TestFramework.assertTrue(lockService instanceof LockService, 'Expected instance of LockService');
    TestFramework.assertEquals(5000, lockService._lockTimeout, 'Default lockTimeout should be 5000ms');
  });

  suite.addTest('testLockServiceConstructorWithInvalidConfig', function() {
    // Arrange
    const invalidConfig = null;
    // Act & Assert - should throw INVALID_ARGUMENT for null config
    TestFramework.assertThrows(() => {
      new LockService(invalidConfig);
    }, ErrorHandler.ErrorTypes.INVALID_ARGUMENT, 'Constructor should throw INVALID_ARGUMENT for null config');
  });

  return suite;
}
