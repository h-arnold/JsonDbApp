/**
 * MasterIndex Integration Test Suite
 * Tests for MasterIndex integration with LockService dependency injection
 */

/**
 * Creates test suite for MasterIndex integration with LockService
 * @returns {TestSuite} The integration test suite
 */
function createMasterIndexLockServiceIntegrationTestSuite() {
  const suite = new TestSuite('MasterIndex DbLockService Integration');

  suite.addTest('testMasterIndexConstructorWithDefaultLockService', function() {
    // Arrange & Act
    const masterIndex = new MasterIndex();
    // Assert default LockService is injected
    TestFramework.assertDefined(masterIndex._lockService, 'MasterIndex should have a DbLockService instance');
    TestFramework.assertTrue(masterIndex._lockService instanceof DbLockService, 'Default _lockService should be DbLockService');
  });

  suite.addTest('testMasterIndexConstructorWithInjectedLockService', function() {
    // Arrange
    const mockLockService = new DbLockService();
    // Act
    const masterIndex = new MasterIndex({}, mockLockService);
    // Assert injected LockService is used
    TestFramework.assertEquals(mockLockService, masterIndex._lockService, 'Injected LockService should be assigned');
  });

  suite.addTest('testMasterIndexUsesInjectedLockService', function() {
    // Arrange - Create MasterIndex with a real LockService
    const testLockService = getTestDbLockService();
    const masterIndex = new MasterIndex({}, testLockService);
    
    // Act: perform an operation that uses script lock
    masterIndex.addCollection('test', { fileId: 'id', documentCount: 0, modificationToken: 'tok' });
    
    // Assert: LockService was properly used
    TestFramework.assertNotNull(masterIndex._lockService, 'MasterIndex should have injected LockService property');
    TestFramework.assertEquals(testLockService, masterIndex._lockService, 'MasterIndex should use the injected LockService');
    
    // Verify the operation completed successfully
    const retrievedCollection = masterIndex.getCollection('test');
    TestFramework.assertNotNull(retrievedCollection, 'Collection should be added successfully');
  });

  suite.addTest('testMasterIndexLockServiceMethodCalls', function() {
    // Arrange - Create MasterIndex with a real LockService
    const testLockService = getTestDbLockService();
    const masterIndex = new MasterIndex({}, testLockService);
    
    // Clear any previous lock operations
    clearLockOperationHistory();
    
    // Act - Perform operation that should use locks
    const testMetadata = {
      name: 'test',
      fileId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      documentCount: 0,
      modificationToken: 'test-token'
    };
    
    // This should work without throwing if LockService integration is properly implemented
    masterIndex.addCollection('test', testMetadata);
    
    // Assert - Verify that LockService was properly injected and used
    TestFramework.assertNotNull(masterIndex._lockService, 'MasterIndex should have injected LockService property');
    TestFramework.assertEquals(testLockService, masterIndex._lockService, 'MasterIndex should use the injected LockService');
    
    // Verify the collection was added successfully (indicating locks worked)
    const retrievedCollection = masterIndex.getCollection('test');
    TestFramework.assertNotNull(retrievedCollection, 'Collection should be added successfully');
    TestFramework.assertEquals('test', retrievedCollection.name, 'Collection name should match');
  });

  suite.addTest('testMasterIndexDbLockServiceTimeout', function() {
    // Arrange - Create a LockService with very short timeout for testing
    const testLockService = new DbLockService({
      scriptLockTimeout: 1, // Very short timeout to trigger timeout condition
      collectionLockTimeout: 1
    });
    const masterIndex = new MasterIndex({}, testLockService);
    
    // Act & Assert - This should throw a timeout error now that LockService integration exists
    TestFramework.assertThrows(() => {
      const testMetadata = {
        name: 'test',
        fileId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
        documentCount: 0,
        modificationToken: 'test-token'
      };
      masterIndex.addCollection('test', testMetadata);
    }, Error, 'DbLockService integration should properly handle timeouts');
  });

  suite.addTest('testMasterIndexLockServiceRelease', function() {
    // Arrange - Create MasterIndex with a real LockService
    const testLockService = getTestDbLockService();
    const masterIndex = new MasterIndex({}, testLockService);
    
    // Act - Perform operation that should acquire and release lock
    const testMetadata = {
      name: 'test',
      fileId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
      documentCount: 0,
      modificationToken: 'test-token'
    };
    
    // This should work without throwing if LockService integration is properly implemented
    masterIndex.addCollection('test', testMetadata);
    
    // Assert - Verify LockService was properly injected and used
    TestFramework.assertNotNull(masterIndex._lockService, 'MasterIndex should have injected LockService property');
    TestFramework.assertEquals(testLockService, masterIndex._lockService, 'MasterIndex should use the injected LockService');
    
    // Verify the operation completed successfully (indicating proper lock acquire/release cycle)
    const retrievedCollection = masterIndex.getCollection('test');
    TestFramework.assertNotNull(retrievedCollection, 'Collection should be added successfully');
    TestFramework.assertEquals('test', retrievedCollection.name, 'Collection name should match');
    TestFramework.assertEquals('test-token', retrievedCollection.modificationToken, 'Modification token should match');
  });

  suite.addTest('should coordinate CollectionMetadata with locking mechanism', function() {
    // Arrange
    const masterIndex = new MasterIndex();
    const collectionName = 'metadataLockingTest';
    const operationId = 'metadata-locking-operation';
    const metadata = new CollectionMetadata(collectionName, 'locking-file-id', {
      documentCount: 3,
      modificationToken: 'locking-token-123'
    });
    
    // Act
    const lockAcquired = masterIndex.acquireLock(collectionName, operationId);
    masterIndex.addCollection(collectionName, metadata);
    const retrievedCollection = masterIndex.getCollection(collectionName);
    
    // Assert - RED PHASE: This will fail until CollectionMetadata supports lock status integration
    TestFramework.assertTrue(lockAcquired, 'Lock should be acquired');
    TestFramework.assertTrue(retrievedCollection instanceof CollectionMetadata, 'Should return CollectionMetadata instance');
    TestFramework.assertNotNull(retrievedCollection.lockStatus, 'CollectionMetadata should contain lock status');
    TestFramework.assertTrue(retrievedCollection.lockStatus.isLocked, 'CollectionMetadata should reflect locked state');
    TestFramework.assertEquals(retrievedCollection.lockStatus.lockedBy, operationId, 'CollectionMetadata should track operation ID');
  });

  return suite;
}
