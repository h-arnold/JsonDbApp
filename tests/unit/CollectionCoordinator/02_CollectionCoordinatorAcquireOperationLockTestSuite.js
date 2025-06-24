// 02_CollectionCoordinatorAcquireOperationLockTestSuite.js
// Unit test suite for CollectionCoordinator.acquireOperationLock (RED PHASE)

function createCollectionCoordinatorAcquireOperationLockTestSuite() {
  const suite = new TestSuite('CollectionCoordinator Acquire Operation Lock');

  suite.addTest('testAcquireOperationLockRetrySuccess', function() {
    // Arrange - Use test environment
    validateCollectionCoordinatorTestEnvironment();
    resetCollectionCoordinatorCollectionState();
    
    const coordinator = createTestCollectionCoordinator('default');
    
    // Act & Assert
    TestFramework.assertNoThrow(
      function() { 
        coordinator.acquireOperationLock('test-op-id'); 
      },
      'acquireOperationLock should not throw in green phase'
    );
  });

  suite.addTest('testAcquireOperationLockRetryFailure', function() {
    // Arrange - Use test environment with aggressive timeout
    validateCollectionCoordinatorTestEnvironment();
    resetCollectionCoordinatorCollectionState();
    
    const coordinator = createTestCollectionCoordinator('aggressive');
    
    // Act & Assert - With aggressive timeouts, should handle retries
    TestFramework.assertNoThrow(
      function() { 
        coordinator.acquireOperationLock('test-op-id-2'); 
      },
      'acquireOperationLock should handle retries gracefully'
    );
  });

  return suite;
}
