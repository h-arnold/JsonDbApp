// 05_CollectionCoordinatorUpdateMasterIndexTestSuite.js
// Unit test suite for CollectionCoordinator.updateMasterIndexMetadata (RED PHASE)

function createCollectionCoordinatorUpdateMasterIndexTestSuite() {
  const suite = new TestSuite('CollectionCoordinator Update Master Index Metadata');

  suite.addTest('testUpdateMasterIndexMetadata', function() {
    // Arrange
    var testFile = DriveApp.createFile('test_collection.json', '[]');
    COLLECTION_COORDINATOR_TEST_DATA.createdFileIds.push(testFile.getId());
    
    const collection = new Collection('test', testFile.getId(), {}, { readFile: function(){}, writeFile: function(){} });
    const masterIndex = new MasterIndex();
    const config = {};
    const logger = GASDBLogger.createComponentLogger('Test');
    const coordinator = new CollectionCoordinator(collection, masterIndex, config, logger);
    // Act & Assert
    TestFramework.assertNoThrow(
      function() { coordinator.updateMasterIndexMetadata(); },
      'updateMasterIndexMetadata should not throw in green phase'
    );
  });

  return suite;
}

registerTestSuite(createCollectionCoordinatorUpdateMasterIndexTestSuite());
