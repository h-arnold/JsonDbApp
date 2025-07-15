/**
 * MasterIndexTest.js - MasterIndex Class Tests
 * 
 * Comprehensive tests for the MasterIndex class including:
 * - Core CRUD operations
 * - Conflict detection and resolution
 * - Component integration
 * 
 */

/**
 * MasterIndex Functionality Tests
 * Tests master index initialisation and persistence
 */
function createMasterIndexFunctionalityTestSuite() {
  const suite = new TestSuite('MasterIndex Functionality');
  
  suite.addTest('should initialise master index with default configuration', function() {
    // Arrange
    const masterIndex = new MasterIndex();
    
    // Act
    const isInitialised = masterIndex.isInitialised();
    
    // Assert
    TestFramework.assertTrue(isInitialised, 'Master index should be initialised');
  });
  
  suite.addTest('should persist master index to ScriptProperties', function() {
    // Arrange
    const masterIndex = new MasterIndex();
    const testCollection = {
      name: 'testCollection',
      fileId: 'test-file-id',
      documentCount: 5,
      lastModified: new Date().toISOString(),
      modificationToken: 'test-token-123'
    };
    
    // Act
    masterIndex.addCollection('testCollection', testCollection);
    masterIndex.save();
    
    // Create new instance to test persistence
    const newMasterIndex = new MasterIndex();
    const collections = newMasterIndex.getCollections();
    
    // Assert
    TestFramework.assertTrue(collections.hasOwnProperty('testCollection'), 'Collection should be persisted');
    TestFramework.assertEquals(collections.testCollection.documentCount, 5, 'Document count should match');
  });
  
  suite.addTest('should load existing master index from ScriptProperties', function() {
    // Arrange
    const existingData = {
      collections: {
        'existingCollection': {
          name: 'existingCollection',
          fileId: 'existing-file-id',
          documentCount: 3
        }
      },
      locks: {},
      version: '1.0.0'
    };
    
    // Manually set ScriptProperties for test
    PropertiesService.getScriptProperties().setProperty('GASDB_MASTER_INDEX', JSON.stringify(existingData));
    
    // Act
    const masterIndex = new MasterIndex();
    const collections = masterIndex.getCollections();
    
    // Assert
    TestFramework.assertTrue(collections.hasOwnProperty('existingCollection'), 'Should load existing collection');
    TestFramework.assertEquals(collections.existingCollection.documentCount, 3, 'Should preserve document count');
  });
  
  suite.addTest('should update collection metadata correctly', function() {
    // Arrange
    const masterIndex = new MasterIndex();
    masterIndex.addCollection('updateTest', {
      name: 'updateTest',
      fileId: 'update-file-id',
      documentCount: 0
    });
    
    // Act
    masterIndex.updateCollectionMetadata('updateTest', {
      documentCount: 10,
      lastUpdated: '2025-06-02T10:00:00Z'
    });
    
    const collection = masterIndex.getCollection('updateTest');
    
    // Assert
    TestFramework.assertEquals(collection.documentCount, 10, 'Document count should be updated');
    TestFramework.assertEquals(collection.lastUpdated.toISOString(), '2025-06-02T10:00:00.000Z', 'Last updated should be updated');
  });

  suite.addTest('should remove a collection and persist the removal', function() {
    // Arrange
    const S2_MI_FUNCTIONALITY_TEST_KEY = 'GASDB_MI_S2_Functionality_TestKey';
    // Ensure a clean slate for this test key
    PropertiesService.getScriptProperties().deleteProperty(S2_MI_FUNCTIONALITY_TEST_KEY);
    const masterIndex = new MasterIndex({ masterIndexKey: S2_MI_FUNCTIONALITY_TEST_KEY });
    
    const collectionName = 'collectionToRemove';
    const collectionData = {
      name: collectionName,
      fileId: 'file-id-to-remove',
      documentCount: 3
    };
    masterIndex.addCollection(collectionName, collectionData);
    masterIndex.save(); // Save the addition

    // Act
    const result = masterIndex.removeCollection(collectionName); 
    // This should return true if the collection existed and was removed
    masterIndex.save(); // Save the removal

    // Assert
    TestFramework.assertTrue(result, 'removeCollection should return true if the collection existed and was removed');
    TestFramework.assertNull(masterIndex.getCollection(collectionName), 'getCollection should return null for a removed collection');

    // Verify persistence by loading a new instance
    const newMasterIndex = new MasterIndex({ masterIndexKey: S2_MI_FUNCTIONALITY_TEST_KEY });
    const collectionsAfterRemoval = newMasterIndex.getCollections();
    TestFramework.assertFalse(collectionsAfterRemoval.hasOwnProperty(collectionName), 'Removed collection should not exist in a new instance after save');

    // Clean up
    PropertiesService.getScriptProperties().deleteProperty(S2_MI_FUNCTIONALITY_TEST_KEY);
  });
  
  // These tests expect MasterIndex to use CollectionMetadata instances instead of plain objects

  suite.addTest('should return CollectionMetadata instance from getCollection', function() {
    // Arrange
    const masterIndex = new MasterIndex();
    const collectionName = 'metadataInstanceTest';
    const collectionData = {
      name: collectionName,
      fileId: 'test-file-id',
      documentCount: 5,
      lastModified: new Date().toISOString(),
      modificationToken: 'test-token-123'
    };
    
    // Act
    masterIndex.addCollection(collectionName, collectionData);
    const retrievedCollection = masterIndex.getCollection(collectionName);
    

    TestFramework.assertTrue(retrievedCollection instanceof CollectionMetadata, 'getCollection should return CollectionMetadata instance');
    TestFramework.assertEquals(retrievedCollection.name, collectionName, 'CollectionMetadata should preserve name');
    TestFramework.assertEquals(retrievedCollection.fileId, 'test-file-id', 'CollectionMetadata should preserve fileId');
    TestFramework.assertEquals(retrievedCollection.documentCount, 5, 'CollectionMetadata should preserve documentCount');
    TestFramework.assertEquals(retrievedCollection.modificationToken, 'test-token-123', 'CollectionMetadata should preserve modificationToken');
  });

  suite.addTest('should accept CollectionMetadata instance in addCollection', function() {
    // Arrange
    const masterIndex = new MasterIndex();
    const collectionName = 'metadataInputTest';
    const metadata = new CollectionMetadata(collectionName, 'test-file-id-2', {
      documentCount: 3,
      modificationToken: 'test-token-456'
    });
    
    // Act - RED PHASE: This will fail until MasterIndex supports CollectionMetadata input
    masterIndex.addCollection(collectionName, metadata);
    const retrievedCollection = masterIndex.getCollection(collectionName);
    
    // Assert
    TestFramework.assertTrue(retrievedCollection instanceof CollectionMetadata, 'Should store and return CollectionMetadata instance');
    TestFramework.assertEquals(retrievedCollection.name, collectionName, 'Should preserve metadata name');
    TestFramework.assertEquals(retrievedCollection.fileId, 'test-file-id-2', 'Should preserve metadata fileId');
    TestFramework.assertEquals(retrievedCollection.documentCount, 3, 'Should preserve metadata documentCount');
    TestFramework.assertEquals(retrievedCollection.modificationToken, 'test-token-456', 'Should preserve metadata modificationToken');
  });

  suite.addTest('should return CollectionMetadata instances from getCollections', function() {
    // Arrange
    const masterIndex = new MasterIndex();
    const collection1Data = {
      name: 'collection1',
      fileId: 'file-id-1',
      documentCount: 2
    };
    const collection2Data = {
      name: 'collection2', 
      fileId: 'file-id-2',
      documentCount: 4
    };
    
    // Act
    masterIndex.addCollection('collection1', collection1Data);
    masterIndex.addCollection('collection2', collection2Data);
    const allCollections = masterIndex.getCollections();
    
    // Assert - RED PHASE: This will fail until MasterIndex returns CollectionMetadata instances
    TestFramework.assertTrue(allCollections.collection1 instanceof CollectionMetadata, 'getCollections should return CollectionMetadata instances');
    TestFramework.assertTrue(allCollections.collection2 instanceof CollectionMetadata, 'getCollections should return CollectionMetadata instances');
    TestFramework.assertEquals(allCollections.collection1.name, 'collection1', 'Should preserve collection1 name');
    TestFramework.assertEquals(allCollections.collection2.name, 'collection2', 'Should preserve collection2 name');
  });

  suite.addTest('should preserve CollectionMetadata properties through persistence', function() {
    // Arrange
    const masterIndex = new MasterIndex();
    const collectionName = 'persistenceTest';
    const metadata = new CollectionMetadata(collectionName, 'persist-file-id', {
      documentCount: 7,
      modificationToken: 'persist-token-789',
      lockStatus: {
        isLocked: false,
        lockedBy: null,
        lockedAt: null,
        lockTimeout: null
      }
    });
    
    // Act
    masterIndex.addCollection(collectionName, metadata);
    masterIndex.save();
    
    // Create new instance to test persistence
    const newMasterIndex = new MasterIndex();
    const retrievedCollection = newMasterIndex.getCollection(collectionName);
    
    // Assert - RED PHASE: This will fail until persistence uses CollectionMetadata
    TestFramework.assertTrue(retrievedCollection instanceof CollectionMetadata, 'Persisted collection should be CollectionMetadata instance');
    TestFramework.assertEquals(retrievedCollection.name, collectionName, 'Should preserve name through persistence');
    TestFramework.assertEquals(retrievedCollection.fileId, 'persist-file-id', 'Should preserve fileId through persistence');
    TestFramework.assertEquals(retrievedCollection.documentCount, 7, 'Should preserve documentCount through persistence');
    TestFramework.assertEquals(retrievedCollection.modificationToken, 'persist-token-789', 'Should preserve modificationToken through persistence');
    TestFramework.assertNotNull(retrievedCollection.lockStatus, 'Should preserve lockStatus through persistence');
  });

  suite.addTest('should update CollectionMetadata instance properties correctly', function() {
    // Arrange
    const masterIndex = new MasterIndex();
    const collectionName = 'updateMetadataTest';
    const initialMetadata = new CollectionMetadata(collectionName, 'update-file-id', {
      documentCount: 0,
      modificationToken: 'initial-token'
    });
    
    // Act
    masterIndex.addCollection(collectionName, initialMetadata);
    masterIndex.updateCollectionMetadata(collectionName, {
      documentCount: 15,
      modificationToken: 'updated-token'
    });
    
    const updatedCollection = masterIndex.getCollection(collectionName);
    
    // Assert - RED PHASE: This will fail until MasterIndex properly updates CollectionMetadata instances
    TestFramework.assertTrue(updatedCollection instanceof CollectionMetadata, 'Updated collection should remain CollectionMetadata instance');
    TestFramework.assertEquals(updatedCollection.documentCount, 15, 'Should update documentCount');
    TestFramework.assertEquals(updatedCollection.modificationToken, 'updated-token', 'Should update modificationToken');
    TestFramework.assertEquals(updatedCollection.name, collectionName, 'Should preserve name during update');
    TestFramework.assertEquals(updatedCollection.fileId, 'update-file-id', 'Should preserve fileId during update');
  });

  suite.addTest('should throw error if MasterIndex is corrupted', function() {
    // Arrange
    const testKey = 'GASDB_MI_CORRUPT_' + new Date().getTime();
    PropertiesService.getScriptProperties().setProperty(testKey, '{corruptJson');
    // Act & Assert
    TestFramework.assertThrows(() => {
      const masterIndex = new MasterIndex({ masterIndexKey: testKey });
      masterIndex.getCollections();
    }, Error, 'Should throw error if MasterIndex is corrupted');
    // Cleanup
    PropertiesService.getScriptProperties().deleteProperty(testKey);
  });

  return suite;
}

/**
 * Conflict Detection and Resolution Tests
 * Tests modification token generation and conflict resolution
 */
function createConflictDetectionTestSuite() {
  const suite = new TestSuite('Conflict Detection and Resolution');
  
  suite.addTest('should generate unique modification tokens', function() {
    // Arrange
    const masterIndex = new MasterIndex();
    
    // Act
    const token1 = masterIndex.generateModificationToken();
    const token2 = masterIndex.generateModificationToken();
    
    // Assert
    TestFramework.assertNotEquals(token1, token2, 'Modification tokens should be unique');
    TestFramework.assertTrue(token1.length > 0, 'Token should not be empty');
    TestFramework.assertTrue(token2.length > 0, 'Token should not be empty');
  });
  
  suite.addTest('should detect conflicts using modification tokens', function() {
    // Arrange
    const masterIndex = new MasterIndex();
    const collectionName = 'conflictDetectionTest';
    const originalToken = masterIndex.generateModificationToken();
    
    masterIndex.addCollection(collectionName, {
      name: collectionName,
      fileId: 'conflict-file-id',
      modificationToken: originalToken
    });
    
    // Act - simulate concurrent modification
    const newToken = masterIndex.generateModificationToken();
    masterIndex.updateCollectionMetadata(collectionName, {
      modificationToken: newToken
    });
    
    const hasConflict = masterIndex.hasConflict(collectionName, originalToken);
    
    // Assert
    TestFramework.assertTrue(hasConflict, 'Should detect modification conflict');
  });
  
  suite.addTest('should resolve conflicts with last-write-wins strategy', function() {
    // Arrange
    const masterIndex = new MasterIndex();
    const collectionName = 'conflictResolutionTest';
    const originalToken = masterIndex.generateModificationToken();
    
    masterIndex.addCollection(collectionName, {
      name: collectionName,
      fileId: 'resolution-file-id',
      modificationToken: originalToken,
      documentCount: 5
    });
    
    // Act - simulate conflict resolution
    const resolution = masterIndex.resolveConflict(collectionName, {
      documentCount: 8,
      lastModified: '2025-06-02T11:00:00Z'
    }, 'LAST_WRITE_WINS');
    
    // Assert
    TestFramework.assertTrue(resolution.success, 'Conflict should be resolved');
    TestFramework.assertEquals(resolution.data.documentCount, 8, 'Should use new data');
    TestFramework.assertNotEquals(resolution.data.modificationToken, originalToken, 'Should generate new token');
  });
  
  suite.addTest('should track modification history for debugging', function() {
    // Arrange
    const masterIndex = new MasterIndex();
    const collectionName = 'historyTest';
    
    // Act
    masterIndex.addCollection(collectionName, { name: collectionName, fileId: 'history-file-id' });
    masterIndex.updateCollectionMetadata(collectionName, { documentCount: 1 });
    masterIndex.updateCollectionMetadata(collectionName, { documentCount: 2 });
    
    const history = masterIndex.getModificationHistory(collectionName);
    
    // Assert
    TestFramework.assertTrue(Array.isArray(history), 'History should be an array');
    TestFramework.assertTrue(history.length >= 2, 'Should track multiple modifications');
  });
  
  suite.addTest('should validate modification token format', function() {
    // Arrange
    const masterIndex = new MasterIndex();
    
    // Act
    const validToken = masterIndex.generateModificationToken();
    const isValid = masterIndex.validateModificationToken(validToken);
    const isInvalidEmpty = masterIndex.validateModificationToken('');
    const isInvalidNull = masterIndex.validateModificationToken(null);
    
    // Assert
    TestFramework.assertTrue(isValid, 'Generated token should be valid');
    TestFramework.assertFalse(isInvalidEmpty, 'Empty token should be invalid');
    TestFramework.assertFalse(isInvalidNull, 'Null token should be invalid');
  });
  
  return suite;
}

/**
 * MasterIndex Integration Tests
 * Integration tests for MasterIndex components working together
 */
function createMasterIndexIntegrationTestSuite() {
  const suite = new TestSuite('MasterIndex Integration');
  
  suite.addTest('should coordinate locking and conflict detection', function() {
    // Arrange
    const masterIndex = new MasterIndex();
    const collectionName = 'integrationTest';
    const operationId = 'integration-operation';
    masterIndex.addCollection(collectionName, {
      name: collectionName,
      fileId: 'integration-file-id',
      modificationToken: masterIndex.generateModificationToken()
    });
    
    // Act
    const lockAcquired = masterIndex.acquireCollectionLock(collectionName, operationId);
    const token = masterIndex.generateModificationToken();
    masterIndex.updateCollectionMetadata(collectionName, { modificationToken: token });
    
    // Assert
    TestFramework.assertTrue(lockAcquired, 'Lock should be acquired');
    TestFramework.assertTrue(masterIndex.isCollectionLocked(collectionName), 'Collection should be locked');
    TestFramework.assertFalse(masterIndex.hasConflict(collectionName, token), 'Should not have conflict with same token');
  });
  
  suite.addTest('should handle complete operation lifecycle', function() {
    // Arrange
    const masterIndex = new MasterIndex();
    const collectionName = 'lifecycleTest';
    const operationId = 'lifecycle-operation';
    
    // Act - Complete operation lifecycle
    masterIndex.addCollection(collectionName, {
      name: collectionName,
      fileId: 'lifecycle-file-id',
      modificationToken: masterIndex.generateModificationToken()
    });
    const lockAcquired = masterIndex.acquireCollectionLock(collectionName, operationId);
    
    masterIndex.updateCollectionMetadata(collectionName, {
      documentCount: 10,
      lastModified: new Date().toISOString()
    });
    
    const lockReleased = masterIndex.releaseCollectionLock(collectionName, operationId);
    masterIndex.save();
    
    // Assert
    TestFramework.assertTrue(lockAcquired, 'Lock should be acquired');
    TestFramework.assertTrue(lockReleased, 'Lock should be released');
    TestFramework.assertFalse(masterIndex.isCollectionLocked(collectionName), 'Collection should not be locked after release');
    
    const collection = masterIndex.getCollection(collectionName);
    TestFramework.assertEquals(collection.documentCount, 10, 'Metadata should be updated');
  });

  // RED PHASE TESTS: Phase 3 - CollectionMetadata Integration with Locking and Conflict Detection

  suite.addTest('should maintain CollectionMetadata integrity during conflict resolution', function() {
    // Arrange
    const masterIndex = new MasterIndex();
    const collectionName = 'metadataConflictTest';
    const originalMetadata = new CollectionMetadata(collectionName, 'conflict-file-id', {
      documentCount: 5,
      modificationToken: 'original-token'
    });
    
    // Act
    masterIndex.addCollection(collectionName, originalMetadata);
    
    // Simulate conflict resolution
    const resolution = masterIndex.resolveConflict(collectionName, {
      documentCount: 8,
      lastModified: '2025-06-02T11:00:00Z'
    }, 'LAST_WRITE_WINS');
    
    const resolvedCollection = masterIndex.getCollection(collectionName);
    
    // Assert
    TestFramework.assertTrue(resolution.success, 'Conflict should be resolved');
    TestFramework.assertTrue(resolvedCollection instanceof CollectionMetadata, 'Resolved collection should remain CollectionMetadata instance');
    TestFramework.assertEquals(resolvedCollection.documentCount, 8, 'Should apply conflict resolution updates');
    TestFramework.assertNotEquals(resolvedCollection.modificationToken, 'original-token', 'Should generate new token during resolution');
    TestFramework.assertEquals(resolvedCollection.name, collectionName, 'Should preserve name during conflict resolution');
    TestFramework.assertEquals(resolvedCollection.fileId, 'conflict-file-id', 'Should preserve fileId during conflict resolution');
  });

  suite.addTest('should handle CollectionMetadata in complete operation lifecycle with persistence', function() {
    // Arrange
    const masterIndex = new MasterIndex();
    const collectionName = 'metadataLifecycleTest';
    const operationId = 'metadata-lifecycle-operation';
    const metadata = new CollectionMetadata(collectionName, 'lifecycle-file-id', {
      documentCount: 2,
      modificationToken: 'lifecycle-token'
    });
    
    // Act - Complete operation lifecycle with CollectionMetadata
    masterIndex.addCollection(collectionName, metadata);
    const lockAcquired = masterIndex.acquireCollectionLock(collectionName, operationId);
    
    masterIndex.updateCollectionMetadata(collectionName, {
      documentCount: 12
    });
    
    const lockReleased = masterIndex.releaseCollectionLock(collectionName, operationId);
    masterIndex.save();
    
    // Create new instance to test persistence
    const newMasterIndex = new MasterIndex();
    const persistedCollection = newMasterIndex.getCollection(collectionName);
    
    // Assert
    TestFramework.assertTrue(lockAcquired, 'Lock should be acquired');
    TestFramework.assertTrue(lockReleased, 'Lock should be released');
    TestFramework.assertTrue(persistedCollection instanceof CollectionMetadata, 'Persisted collection should be CollectionMetadata instance');
    TestFramework.assertEquals(persistedCollection.documentCount, 12, 'Should persist updated metadata');
    TestFramework.assertEquals(persistedCollection.name, collectionName, 'Should persist collection name');
    TestFramework.assertEquals(persistedCollection.fileId, 'lifecycle-file-id', 'Should persist fileId');
    TestFramework.assertFalse(persistedCollection.getLockStatus().isLocked, 'Lock should be released in persisted metadata');
  });

  return suite;
}

/**
 * Register all MasterIndex test suites with TestFramework
 * This function creates and registers all test suites for MasterIndex functionality
 */
function registerMasterIndexTests() {
  const testFramework = new TestFramework();
  testFramework.registerTestSuite(createMasterIndexFunctionalityTestSuite());
  testFramework.registerTestSuite(createConflictDetectionTestSuite());
  testFramework.registerTestSuite(createMasterIndexIntegrationTestSuite());
  return testFramework;
}

/**
 * Run all MasterIndex tests
 * Convenience function to run all MasterIndex-related test suites
 */
function runMasterIndexTests() {
  try {
    JDbLogger.info('Starting MasterIndex Test Execution');
    
    // Register all test suites
    const testFramework = registerMasterIndexTests();
    
    // Run all MasterIndex test suites
    const results = [];
    results.push(testFramework.runTestSuite('MasterIndex Functionality'));
    results.push(testFramework.runTestSuite('Conflict Detection and Resolution'));
    results.push(testFramework.runTestSuite('MasterIndex Integration'));
    
    JDbLogger.info('MasterIndex Test Execution Complete');
    
    // Log summary for each result set
    results.forEach((result, index) => {
      JDbLogger.info(`Result Set ${index + 1}: ${result.getSummary()}`);
    });
    
    return results;
    
  } catch (error) {
    JDbLogger.error('Failed to execute MasterIndex tests', { error: error.message, stack: error.stack });
    throw error;
  }
}
