// 01_CollectionCoordinatorCoordinateTestSuite.js
// Unit test suite for CollectionCoordinator.coordinate (RED PHASE)

function createCollectionCoordinatorCoordinateTestSuite() {
  const suite = new TestSuite('CollectionCoordinator Coordinate');

  suite.addTest('testCoordinateHappyPath', function() {
    // Arrange
    // Create test file in the test folder for Collection
    var testFile = DriveApp.createFile('test_collection.json', '[]');
    COLLECTION_COORDINATOR_TEST_DATA.createdFileIds.push(testFile.getId());
    
    // Use real Collection, MasterIndex, config, logger
    const collection = new Collection('test', testFile.getId(), {}, { readFile: function(){}, writeFile: function(){} });
    const masterIndex = new MasterIndex();
    // Ensure the collection is registered in masterIndex for coordination
    masterIndex.addCollection('test', collection._metadata);
    const config = {};
    const logger = GASDBLogger.createComponentLogger('Test');
    const coordinator = new CollectionCoordinator(collection, masterIndex, config, logger);
    // Act
    let result;
    TestFramework.assertNoThrow(
      function() { result = coordinator.coordinate('insertOne', function() { return 'result'; }); },
      'coordinate should not throw in happy path'
    );
    // Assert return value
    AssertionUtilities.assertEquals('result', result, 'coordinate should return the callback result');
  });

  return suite;
}

registerTestSuite(createCollectionCoordinatorCoordinateTestSuite());
