// 00_CollectionCoordinatorConstructorValidationTestSuite.js
// Unit test suite for CollectionCoordinator constructor validation (RED PHASE)

function createCollectionCoordinatorConstructorValidationTestSuite() {
  const suite = new TestSuite('CollectionCoordinator Constructor Validation');

  suite.addTest('testCollectionCoordinatorConstructorValidation', function() {
    // Arrange & Act & Assert
    TestFramework.assertThrows(
      function() {
        new CollectionCoordinator(null, null, null, null);
      },
      Error,
      'Should throw InvalidArgumentError when dependencies are missing'
    );
  });

  suite.addTest('testCollectionCoordinatorValidConstructor', function() {
    // Arrange - Use test environment
    validateCollectionCoordinatorTestEnvironment();
    
    // Act & Assert - Should create successfully with valid dependencies
    let coordinator;
    TestFramework.assertNoThrow(
      function() {
        coordinator = createTestCollectionCoordinator('default');
      },
      'Should create CollectionCoordinator with valid dependencies'
    );
    
    TestFramework.assertDefined(coordinator, 'Coordinator should be created');
  });

  suite.addTest('testCollectionCoordinatorConfigDefaults', function() {
    // Arrange - Use test environment
    validateCollectionCoordinatorTestEnvironment();
    // Act
    const coordinator = createTestCollectionCoordinator('default');
    // Assert - Should have expected default configuration
    TestFramework.assertTrue(coordinator._config.coordinationEnabled, 'Coordination should be enabled by default');
    TestFramework.assertEquals(30000, coordinator._config.lockTimeout, 'Default lockTimeout should be 30000ms');
    TestFramework.assertEquals(3, coordinator._config.retryAttempts, 'Default retryAttempts should be 3');
    TestFramework.assertEquals(1000, coordinator._config.retryDelayMs, 'Default retryDelayMs should be 1000ms');
  });

  suite.addTest('testCollectionCoordinatorCustomConfig', function() {
    // Arrange - Use test environment
    validateCollectionCoordinatorTestEnvironment();
    const customConfig = {
      coordinationEnabled: false,
      lockTimeout: 12345,
      retryAttempts: 7,
      retryDelayMs: 2222,
      conflictResolutionStrategy: 'reload'
    };
    // Act
    const coordinator = createTestCollectionCoordinator('default', customConfig);
    // Assert
    TestFramework.assertFalse(coordinator._config.coordinationEnabled, 'Custom coordinationEnabled should be used');
    TestFramework.assertEquals(12345, coordinator._config.lockTimeout, 'Custom lockTimeout should be used');
    TestFramework.assertEquals(7, coordinator._config.retryAttempts, 'Custom retryAttempts should be used');
    TestFramework.assertEquals(2222, coordinator._config.retryDelayMs, 'Custom retryDelayMs should be used');
    TestFramework.assertEquals('reload', coordinator._config.conflictResolutionStrategy, 'Custom conflictResolutionStrategy should be used');
  });

  return suite;
}
