/**
 * MasterIndexTest.js - MasterIndex Class Tests
 * 
 * Comprehensive tests for the MasterIndex class including:
 * - Core CRUD operations
 * - Virtual locking mechanism  
 * - Conflict detection and resolution
 * - Component integration
 * 
 * Migrated from Section2Tests.js - All functions
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
      lastModified: '2025-06-02T10:00:00Z'
    });
    
    const collection = masterIndex.getCollection('updateTest');
    
    // Assert
    TestFramework.assertEquals(collection.documentCount, 10, 'Document count should be updated');
    TestFramework.assertEquals(collection.lastModified, '2025-06-02T10:00:00Z', 'Last modified should be updated');
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
    const result = masterIndex.removeCollection(collectionName); // This method needs to be implemented in MasterIndex.js
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
  
  return suite;
}

/**
 * Virtual Locking Mechanism Tests
 * Tests lock acquisition, timeout, and expiration
 */
function createVirtualLockingTestSuite() {
  const suite = new TestSuite('Virtual Locking Mechanism');
  
  suite.addTest('should acquire lock for collection successfully', function() {
    // Arrange
    const masterIndex = new MasterIndex();
    const collectionName = 'lockTestCollection';
    const operationId = 'test-operation-123';
    
    // Act
    const lockAcquired = masterIndex.acquireLock(collectionName, operationId);
    
    // Assert
    TestFramework.assertTrue(lockAcquired, 'Lock should be acquired successfully');
    TestFramework.assertTrue(masterIndex.isLocked(collectionName), 'Collection should be locked');
  });
  
  suite.addTest('should prevent multiple locks on same collection', function() {
    // Arrange
    const masterIndex = new MasterIndex();
    const collectionName = 'conflictTestCollection';
    
    // Act
    const firstLock = masterIndex.acquireLock(collectionName, 'operation-1');
    const secondLock = masterIndex.acquireLock(collectionName, 'operation-2');
    
    // Assert
    TestFramework.assertTrue(firstLock, 'First lock should be acquired');
    TestFramework.assertFalse(secondLock, 'Second lock should be rejected');
  });
  
  suite.addTest('should release lock correctly', function() {
    // Arrange
    const masterIndex = new MasterIndex();
    const collectionName = 'releaseTestCollection';
    const operationId = 'test-operation-456';
    
    // Act
    masterIndex.acquireLock(collectionName, operationId);
    const lockReleased = masterIndex.releaseLock(collectionName, operationId);
    
    // Assert
    TestFramework.assertTrue(lockReleased, 'Lock should be released successfully');
    TestFramework.assertFalse(masterIndex.isLocked(collectionName), 'Collection should not be locked');
  });
  
  suite.addTest('should handle lock timeout correctly', function() {
    // Arrange
    const masterIndex = new MasterIndex({ lockTimeout: 100 }); // 100ms timeout for testing
    const collectionName = 'timeoutTestCollection';
    
    // Act
    masterIndex.acquireLock(collectionName, 'test-operation');
    
    // Wait for timeout (simulate with date manipulation)
    const originalDate = Date.now;
    Date.now = () => originalDate() + 150; // Simulate 150ms later
    
    const isExpired = masterIndex.cleanupExpiredLocks();
    
    // Restore Date.now
    Date.now = originalDate;
    
    // Assert
    TestFramework.assertTrue(isExpired, 'Should detect expired locks');
    TestFramework.assertFalse(masterIndex.isLocked(collectionName), 'Expired lock should be cleaned up');
  });
  
  suite.addTest('should persist locks to ScriptProperties', function() {
    // Arrange
    const masterIndex = new MasterIndex();
    const collectionName = 'persistLockTest';
    
    // Act
    masterIndex.acquireLock(collectionName, 'persist-operation');
    masterIndex.save();
    
    // Create new instance
    const newMasterIndex = new MasterIndex();
    
    // Assert
    TestFramework.assertTrue(newMasterIndex.isLocked(collectionName), 'Lock should be persisted');
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
    
    // Act
    const lockAcquired = masterIndex.acquireLock(collectionName, operationId);
    const token = masterIndex.generateModificationToken();
    masterIndex.addCollection(collectionName, {
      name: collectionName,
      fileId: 'integration-file-id',
      modificationToken: token
    });
    
    // Assert
    TestFramework.assertTrue(lockAcquired, 'Lock should be acquired');
    TestFramework.assertTrue(masterIndex.isLocked(collectionName), 'Collection should be locked');
    TestFramework.assertFalse(masterIndex.hasConflict(collectionName, token), 'Should not have conflict with same token');
  });
  
  suite.addTest('should handle complete operation lifecycle', function() {
    // Arrange
    const masterIndex = new MasterIndex();
    const collectionName = 'lifecycleTest';
    const operationId = 'lifecycle-operation';
    
    // Act - Complete operation lifecycle
    const lockAcquired = masterIndex.acquireLock(collectionName, operationId);
    const token = masterIndex.generateModificationToken();
    
    masterIndex.addCollection(collectionName, {
      name: collectionName,
      fileId: 'lifecycle-file-id',
      modificationToken: token
    });
    
    masterIndex.updateCollectionMetadata(collectionName, {
      documentCount: 10,
      lastModified: new Date().toISOString()
    });
    
    const lockReleased = masterIndex.releaseLock(collectionName, operationId);
    masterIndex.save();
    
    // Assert
    TestFramework.assertTrue(lockAcquired, 'Lock should be acquired');
    TestFramework.assertTrue(lockReleased, 'Lock should be released');
    TestFramework.assertFalse(masterIndex.isLocked(collectionName), 'Collection should not be locked after release');
    
    const collection = masterIndex.getCollection(collectionName);
    TestFramework.assertEquals(collection.documentCount, 10, 'Metadata should be updated');
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
  testFramework.registerTestSuite(createVirtualLockingTestSuite());
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
    GASDBLogger.info('Starting MasterIndex Test Execution');
    
    // Register all test suites
    const testFramework = registerMasterIndexTests();
    
    // Run all MasterIndex test suites
    const results = [];
    results.push(testFramework.runTestSuite('MasterIndex Functionality'));
    results.push(testFramework.runTestSuite('Virtual Locking Mechanism'));
    results.push(testFramework.runTestSuite('Conflict Detection and Resolution'));
    results.push(testFramework.runTestSuite('MasterIndex Integration'));
    
    GASDBLogger.info('MasterIndex Test Execution Complete');
    
    // Log summary for each result set
    results.forEach((result, index) => {
      GASDBLogger.info(`Result Set ${index + 1}: ${result.getSummary()}`);
    });
    
    return results;
    
  } catch (error) {
    GASDBLogger.error('Failed to execute MasterIndex tests', { error: error.message, stack: error.stack });
    throw error;
  }
}
