// 06_CollectionCoordinatorLockReleaseAndTimeoutTestSuite.js
// Unit test suite for CollectionCoordinator lock release and timeout (RED PHASE)

function createCollectionCoordinatorLockReleaseAndTimeoutTestSuite() {
  const suite = new TestSuite('CollectionCoordinator Lock Release and Timeout');

  suite.addTest('testLockReleasedOnException', function() {
    // Arrange - Use test environment
    validateCollectionCoordinatorTestEnvironment();
    resetCollectionCoordinatorCollectionState();
    
    const coordinator = createTestCollectionCoordinator('default');
    
    // Act & Assert - Should properly handle exceptions and release locks
    TestFramework.assertThrows(
      function() {
        coordinator.coordinate('testOperation', function() { 
          throw new Error('test exception'); 
        });
      },
      Error,
      'Should propagate the original exception while releasing locks'
    );
  });

  suite.addTest('testCoordinationTimeout', function() {
    // Arrange - Use test environment with aggressive timeout
    validateCollectionCoordinatorTestEnvironment();
    resetCollectionCoordinatorCollectionState();
    
    const coordinator = createTestCollectionCoordinator('aggressive'); // Has 500ms timeout
    
    // Act & Assert - Test timeout behaviour with a long-running operation
    TestFramework.assertThrows(
      function() {
        coordinator.coordinate('longOperation', function() { 
          // Simulate a long operation that exceeds timeout
          Utilities.sleep(600); // Sleep longer than timeout
          return 'should not reach here';
        });
      },
      Error,
      'Should throw timeout error for operations exceeding lockTimeout'
    );
  });

  return suite;
}
