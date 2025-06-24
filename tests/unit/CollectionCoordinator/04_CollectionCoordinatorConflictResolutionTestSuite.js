// 04_CollectionCoordinatorConflictResolutionTestSuite.js
// Unit test suite for CollectionCoordinator conflict resolution (RED PHASE)

function createCollectionCoordinatorConflictResolutionTestSuite() {
  const suite = new TestSuite('CollectionCoordinator Conflict Resolution');

  suite.addTest('testResolveConflictReloadAndRetry', function() {
    // Arrange - Use test environment and simulate conflict
    validateCollectionCoordinatorTestEnvironment();
    resetCollectionCoordinatorCollectionState();
    
    simulateCollectionConflict(); // Creates a token mismatch
    
    const coordinator = createTestCollectionCoordinator('default'); // Uses 'reload' strategy
    
    // Act & Assert - Should resolve conflict using reload strategy
    TestFramework.assertNoThrow(
      function() {
        coordinator.resolveConflict();
      },
      'resolveConflict should handle reload strategy'
    );
  });

  suite.addTest('testResolveConflictLastWriteWins', function() {
    // Arrange - Use test environment
    validateCollectionCoordinatorTestEnvironment();
    resetCollectionCoordinatorCollectionState();
    
    // Create coordinator with unsupported strategy to test error handling
    const invalidConfig = {
      coordinationEnabled: true,
      conflictResolutionStrategy: 'last-write-wins' // Unsupported strategy
    };
    
    const coordinator = new CollectionCoordinator(
      COLLECTION_COORDINATOR_TEST_DATA.testCollection,
      COLLECTION_COORDINATOR_TEST_DATA.testMasterIndex,
      invalidConfig
    );
    
    // Act & Assert - Should throw for unsupported strategy
    TestFramework.assertThrows(
      function() {
        coordinator.resolveConflict();
      },
      Error,
      'Should throw for unsupported conflict resolution strategy'
    );
  });

  return suite;
}
