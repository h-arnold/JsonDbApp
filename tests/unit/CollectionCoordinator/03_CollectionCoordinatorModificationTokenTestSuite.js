// 03_CollectionCoordinatorModificationTokenTestSuite.js
// Unit test suite for CollectionCoordinator modification token validation (RED PHASE)

function createCollectionCoordinatorModificationTokenTestSuite() {
  const suite = new TestSuite('CollectionCoordinator Modification Token');

  suite.addTest('testValidateModificationTokenNoConflict', function() {
    // Arrange - Use test environment
    validateCollectionCoordinatorTestEnvironment();
    resetCollectionCoordinatorCollectionState();
    
    const coordinator = createTestCollectionCoordinator('default');
    const collection = COLLECTION_COORDINATOR_TEST_DATA.testCollection;
    const masterIndex = COLLECTION_COORDINATOR_TEST_DATA.testMasterIndex;
    
    // Get current tokens (should match)
    const localToken = collection._metadata.getModificationToken();
    const masterMeta = masterIndex.getCollection('coordinatorTest');
    const remoteToken = masterMeta ? masterMeta.getModificationToken() : null;
    
    // Act & Assert
    TestFramework.assertNoThrow(
      function() { 
        coordinator.validateModificationToken(localToken, remoteToken); 
      },
      'validateModificationToken should not throw when tokens match'
    );
  });

  suite.addTest('testValidateModificationTokenConflict', function() {
    // Arrange - Use test environment and simulate conflict
    validateCollectionCoordinatorTestEnvironment();
    resetCollectionCoordinatorCollectionState();
    
    simulateCollectionConflict(); // This creates a token mismatch
    
    const coordinator = createTestCollectionCoordinator('default');
    const collection = COLLECTION_COORDINATOR_TEST_DATA.testCollection;
    const masterIndex = COLLECTION_COORDINATOR_TEST_DATA.testMasterIndex;
    
    const localToken = collection._metadata.getModificationToken();
    const masterMeta = masterIndex.getCollection('coordinatorTest');
    const remoteToken = masterMeta ? masterMeta.getModificationToken() : null;
    
    // Act & Assert - Should throw when tokens don't match
    TestFramework.assertThrows(
      function() { 
        coordinator.validateModificationToken(localToken, remoteToken); 
      },
      Error,
      'validateModificationToken should throw when tokens differ'
    );
  });

  return suite;
}
