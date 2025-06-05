/**
 * Section 2 Tests: ScriptProperties Master Index
 * 
 * This file contains all tests for Section 2 implementation:
 * - Master Index implementation
 * - Virtual locking mechanism
 * - Conflict detection and resolution
 * 
 * Following TDD: These tests are written first and should FAIL initially
 */

/**
 * Test the MasterIndex class functionality
 * Tests master index initialization and persistence
 */
function testMasterIndexFunctionality() {
  const suite = new TestSuite('MasterIndex Functionality');
  
  suite.addTest('should initialise master index with default configuration', function() {
    // Arrange
    const masterIndex = new MasterIndex();
    
    // Act
    const isInitialised = masterIndex.isInitialised();
    
    // Assert
    AssertionUtilities.assertTrue(isInitialised, 'Master index should be initialised');
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
    AssertionUtilities.assertTrue(collections.hasOwnProperty('testCollection'), 'Collection should be persisted');
    AssertionUtilities.assertEquals(collections.testCollection.documentCount, 5, 'Document count should match');
  });
  
  suite.addTest('should load existing master index from ScriptProperties', () => {
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
    AssertionUtilities.assertTrue(collections.hasOwnProperty('existingCollection'), 'Should load existing collection');
    AssertionUtilities.assertEquals(collections.existingCollection.documentCount, 3, 'Should preserve document count');
  });
  
  suite.addTest('should update collection metadata correctly', () => {
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
    AssertionUtilities.assertEquals(collection.documentCount, 10, 'Document count should be updated');
    AssertionUtilities.assertEquals(collection.lastModified, '2025-06-02T10:00:00Z', 'Last modified should be updated');
  });

  const S2_MI_FUNCTIONALITY_TEST_KEY = 'GASDB_MI_S2_Functionality_TestKey';

  suite.addTest('should remove a collection and persist the removal', function() {
    // Arrange
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
    AssertionUtilities.assertTrue(result, 'removeCollection should return true if the collection existed and was removed');
    AssertionUtilities.assertNull(masterIndex.getCollection(collectionName), 'getCollection should return null for a removed collection');

    // Verify persistence by loading a new instance
    const newMasterIndex = new MasterIndex({ masterIndexKey: S2_MI_FUNCTIONALITY_TEST_KEY });
    const collectionsAfterRemoval = newMasterIndex.getCollections();
    AssertionUtilities.assertFalse(collectionsAfterRemoval.hasOwnProperty(collectionName), 'Removed collection should not exist in a new instance after save');

    // Clean up
    PropertiesService.getScriptProperties().deleteProperty(S2_MI_FUNCTIONALITY_TEST_KEY);
  });
  
  return suite;
}

/**
 * Test the virtual locking mechanism
 * Tests lock acquisition, timeout, and expiration
 */
function testVirtualLockingMechanism() {
  const suite = new TestSuite('Virtual Locking Mechanism');
  
  suite.addTest('should acquire lock for collection successfully', () => {
    // Arrange
    const masterIndex = new MasterIndex();
    const collectionName = 'lockTestCollection';
    const operationId = 'test-operation-123';
    
    // Act
    const lockAcquired = masterIndex.acquireLock(collectionName, operationId);
    
    // Assert
    AssertionUtilities.assertTrue(lockAcquired, 'Lock should be acquired successfully');
    AssertionUtilities.assertTrue(masterIndex.isLocked(collectionName), 'Collection should be locked');
  });
  
  suite.addTest('should prevent multiple locks on same collection', () => {
    // Arrange
    const masterIndex = new MasterIndex();
    const collectionName = 'conflictTestCollection';
    
    // Act
    const firstLock = masterIndex.acquireLock(collectionName, 'operation-1');
    const secondLock = masterIndex.acquireLock(collectionName, 'operation-2');
    
    // Assert
    AssertionUtilities.assertTrue(firstLock, 'First lock should be acquired');
    AssertionUtilities.assertFalse(secondLock, 'Second lock should be rejected');
  });
  
  suite.addTest('should release lock correctly', () => {
    // Arrange
    const masterIndex = new MasterIndex();
    const collectionName = 'releaseTestCollection';
    const operationId = 'test-operation-456';
    
    // Act
    masterIndex.acquireLock(collectionName, operationId);
    const lockReleased = masterIndex.releaseLock(collectionName, operationId);
    
    // Assert
    AssertionUtilities.assertTrue(lockReleased, 'Lock should be released successfully');
    AssertionUtilities.assertFalse(masterIndex.isLocked(collectionName), 'Collection should not be locked');
  });
  
  suite.addTest('should handle lock timeout correctly', () => {
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
    AssertionUtilities.assertTrue(isExpired, 'Should detect expired locks');
    AssertionUtilities.assertFalse(masterIndex.isLocked(collectionName), 'Expired lock should be cleaned up');
  });
  
  suite.addTest('should persist locks to ScriptProperties', () => {
    // Arrange
    const masterIndex = new MasterIndex();
    const collectionName = 'persistLockTest';
    
    // Act
    masterIndex.acquireLock(collectionName, 'persist-operation');
    masterIndex.save();
    
    // Create new instance
    const newMasterIndex = new MasterIndex();
    
    // Assert
    AssertionUtilities.assertTrue(newMasterIndex.isLocked(collectionName), 'Lock should be persisted');
  });
  
  return suite;
}

/**
 * Test conflict detection and resolution
 * Tests modification token generation and conflict resolution
 */
function testConflictDetectionResolution() {
  const suite = new TestSuite('Conflict Detection and Resolution');
  
  suite.addTest('should generate unique modification tokens', () => {
    // Arrange
    const masterIndex = new MasterIndex();
    
    // Act
    const token1 = masterIndex.generateModificationToken();
    const token2 = masterIndex.generateModificationToken();
    
    // Assert
    AssertionUtilities.assertNotEquals(token1, token2, 'Modification tokens should be unique');
    AssertionUtilities.assertTrue(token1.length > 0, 'Token should not be empty');
    AssertionUtilities.assertTrue(token2.length > 0, 'Token should not be empty');
  });
  
  suite.addTest('should detect conflicts using modification tokens', () => {
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
    AssertionUtilities.assertTrue(hasConflict, 'Should detect modification conflict');
  });
  
  suite.addTest('should resolve conflicts with last-write-wins strategy', () => {
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
    AssertionUtilities.assertTrue(resolution.success, 'Conflict should be resolved');
    AssertionUtilities.assertEquals(resolution.data.documentCount, 8, 'Should use new data');
    AssertionUtilities.assertNotEquals(resolution.data.modificationToken, originalToken, 'Should generate new token');
  });
  
  suite.addTest('should track modification history for debugging', () => {
    // Arrange
    const masterIndex = new MasterIndex();
    const collectionName = 'historyTest';
    
    // Act
    masterIndex.addCollection(collectionName, { name: collectionName, fileId: 'history-file-id' });
    masterIndex.updateCollectionMetadata(collectionName, { documentCount: 1 });
    masterIndex.updateCollectionMetadata(collectionName, { documentCount: 2 });
    
    const history = masterIndex.getModificationHistory(collectionName);
    
    // Assert
    AssertionUtilities.assertTrue(Array.isArray(history), 'History should be an array');
    AssertionUtilities.assertTrue(history.length >= 2, 'Should track multiple modifications');
  });
  
  suite.addTest('should validate modification token format', () => {
    // Arrange
    const masterIndex = new MasterIndex();
    
    // Act
    const validToken = masterIndex.generateModificationToken();
    const isValid = masterIndex.validateModificationToken(validToken);
    const isInvalidEmpty = masterIndex.validateModificationToken('');
    const isInvalidNull = masterIndex.validateModificationToken(null);
    
    // Assert
    AssertionUtilities.assertTrue(isValid, 'Generated token should be valid');
    AssertionUtilities.assertFalse(isInvalidEmpty, 'Empty token should be invalid');
    AssertionUtilities.assertFalse(isInvalidNull, 'Null token should be invalid');
  });
  
  return suite;
}

/**
 * Integration tests for MasterIndex components working together
 */
function testMasterIndexIntegration() {
  const suite = new TestSuite('MasterIndex Integration');
  
  suite.addTest('should coordinate locking and conflict detection', () => {
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
    AssertionUtilities.assertTrue(lockAcquired, 'Lock should be acquired');
    AssertionUtilities.assertTrue(masterIndex.isLocked(collectionName), 'Collection should be locked');
    AssertionUtilities.assertFalse(masterIndex.hasConflict(collectionName, token), 'Should not have conflict with same token');
  });
  
  suite.addTest('should handle complete operation lifecycle', () => {
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
    AssertionUtilities.assertTrue(lockAcquired, 'Lock should be acquired');
    AssertionUtilities.assertTrue(lockReleased, 'Lock should be released');
    AssertionUtilities.assertFalse(masterIndex.isLocked(collectionName), 'Collection should not be locked after release');
    
    const collection = masterIndex.getCollection(collectionName);
    AssertionUtilities.assertEquals(collection.documentCount, 10, 'Metadata should be updated');
  });
  
  return suite;
}

/**
 * Run all Section 2 tests
 * This function orchestrates all test suites for Section 2
 */
function runSection2Tests() {
  try {
    GASDBLogger.info('Starting Section 2 Test Execution - ScriptProperties Master Index');
    
    const testRunner = new TestRunner();
    
    // Add all test suites
    testRunner.addTestSuite(testMasterIndexFunctionality());
    testRunner.addTestSuite(testVirtualLockingMechanism());
    testRunner.addTestSuite(testConflictDetectionResolution());
    testRunner.addTestSuite(testMasterIndexIntegration());
    
    // Run all tests
    const results = testRunner.runAllTests();
    
    GASDBLogger.info('Section 2 Test Execution Complete');
    
    return results;
    
  } catch (error) {
    GASDBLogger.error('Failed to execute Section 2 tests', { error: error.message, stack: error.stack });
    throw error;
  }
}