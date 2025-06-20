// 06_CollectionCoordinatorLockReleaseAndTimeoutTestSuite.js
// Unit test suite for CollectionCoordinator lock release and timeout (RED PHASE)

function createCollectionCoordinatorLockReleaseAndTimeoutTestSuite() {
  const suite = new TestSuite('CollectionCoordinator Lock Release and Timeout');

  suite.addTest('testLockReleasedOnException', function() {
    // Arrange
    var testFile = DriveApp.createFile('test_collection.json', '[]');
    COLLECTION_COORDINATOR_TEST_DATA.createdFileIds.push(testFile.getId());
    
    const collection = new Collection('test', testFile.getId(), {}, { readFile: function(){}, writeFile: function(){} });
    const masterIndex = new MasterIndex();
    const config = {};
    const logger = GASDBLogger.createComponentLogger('Test');
    const coordinator = new CollectionCoordinator(collection, masterIndex, config, logger);
    // Act & Assert
    TestFramework.assertThrows(
      function() {
        coordinator.coordinate('insertOne', function() { throw new Error('fail'); });
      },
      GASDBError,
      'Should throw as lock release on exception is not implemented yet'
    );
  });

  suite.addTest('testCoordinationTimeout', function() {
    // Arrange
    var testFile = DriveApp.createFile('test_collection.json', '[]');
    COLLECTION_COORDINATOR_TEST_DATA.createdFileIds.push(testFile.getId());
    
    const collection = new Collection('test', testFile.getId(), {}, { readFile: function(){}, writeFile: function(){} });
    const masterIndex = new MasterIndex();
    const config = { lockTimeoutMs: 1 };
    const logger = GASDBLogger.createComponentLogger('Test');
    const coordinator = new CollectionCoordinator(collection, masterIndex, config, logger);
    // Act & Assert
    TestFramework.assertThrows(
      function() {
        coordinator.coordinate('insertOne', function() { /* never returns */ });
      },
      CoordinationTimeoutError,
      'Should throw CoordinationTimeoutError on timeout'
    );
  });

  return suite;
}

registerTestSuite(createCollectionCoordinatorLockReleaseAndTimeoutTestSuite());
