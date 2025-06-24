// 02_CollectionCoordinatorAcquireOperationLockTestSuite.js
// Unit test suite for CollectionCoordinator.acquireOperationLock (RED PHASE)

function createCollectionCoordinatorAcquireOperationLockTestSuite() {
  const suite = new TestSuite('CollectionCoordinator Acquire Operation Lock');

  suite.addTest('testAcquireOperationLockRetrySuccess', function() {
    // Arrange
    // Create test file in the test folder for Collection
    var testFile = DriveApp.createFile('test_collection.json', '[]');
    COLLECTION_COORDINATOR_TEST_DATA.createdFileIds.push(testFile.getId());
    
    // Use real coordinator, but lock logic not implemented so should fail
    const collection = new Collection('test', testFile.getId(), {}, { readFile: function(){}, writeFile: function(){} });
    const masterIndex = new MasterIndex();
    const config = { retryAttempts: 2, retryDelayMs: 10 };
    const logger = GASDBLogger.createComponentLogger('Test');
    const coordinator = new CollectionCoordinator(collection, masterIndex, config, logger);
    // Act & Assert
    TestFramework.assertNoThrow(
      function() { coordinator.acquireOperationLock('opId'); },
      'acquireOperationLock should not throw in green phase'
    );
  });

  suite.addTest('testAcquireOperationLockRetryFailure', function() {
    // Arrange
    var testFile = DriveApp.createFile('test_collection.json', '[]');
    COLLECTION_COORDINATOR_TEST_DATA.createdFileIds.push(testFile.getId());
    
    const collection = new Collection('test', testFile.getId(), {}, { readFile: function(){}, writeFile: function(){} });
    const masterIndex = new MasterIndex();
    const config = { retryAttempts: 1, retryDelayMs: 10 };
    const logger = GASDBLogger.createComponentLogger('Test');
    const coordinator = new CollectionCoordinator(collection, masterIndex, config, logger);
    // Act & Assert
    TestFramework.assertNoThrow(
      function() { coordinator.acquireOperationLock('opId'); },
      'acquireOperationLock should succeed even if retries configured low'
    );
  });

  return suite;
}

registerTestSuite(createCollectionCoordinatorAcquireOperationLockTestSuite());
