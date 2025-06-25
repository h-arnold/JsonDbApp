// 05_CollectionCoordinatorUpdateMasterIndexTestSuite.js
// Unit test suite for CollectionCoordinator.updateMasterIndexMetadata (RED PHASE)

function createCollectionCoordinatorUpdateMasterIndexTestSuite() {
  const suite = new TestSuite('CollectionCoordinator Update Master Index Metadata');

  suite.addTest('testUpdateMasterIndexMetadata', function() {
    // Arrange - Use test environment
    validateCollectionCoordinatorTestEnvironment();
    resetCollectionCoordinatorCollectionState();
    
    const coordinator = createTestCollectionCoordinator('default');
    const masterIndex = COLLECTION_COORDINATOR_TEST_DATA.testMasterIndex;
    
    // Get initial state
    const initialCollections = Object.keys(masterIndex.getCollections());
    
    // Act & Assert
    TestFramework.assertNoThrow(
      function() { 
        coordinator.updateMasterIndexMetadata(); 
      },
      'updateMasterIndexMetadata should not throw in green phase'
    );
    
    // Verify the collection is still registered
    const updatedCollections = Object.keys(masterIndex.getCollections());
    TestFramework.assertTrue(
      updatedCollections.includes('coordinatorTest'),
      'Collection should be registered in master index after update'
    );
  });

  return suite;
}
