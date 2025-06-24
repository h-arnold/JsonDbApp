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
    TestFramework.assertEquals(2000, coordinator._config.lockTimeoutMs, 'Should have expected lock timeout');
    TestFramework.assertEquals(3, coordinator._config.retryAttempts, 'Should have expected retry attempts');
  });

  return suite;
}
