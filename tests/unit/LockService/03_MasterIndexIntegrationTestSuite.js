/**
 * MasterIndex Integration Test Suite
 * Tests for MasterIndex integration with LockService dependency injection
 */

/**
 * Creates test suite for MasterIndex integration with LockService
 * @returns {TestSuite} The integration test suite
 */
function createMasterIndexLockServiceIntegrationTestSuite() {
  const suite = new TestSuite('MasterIndex LockService Integration');

  suite.addTest('testMasterIndexConstructorWithDefaultLockService', function() {
    // Arrange & Act
    const masterIndex = new MasterIndex();
    // Assert default LockService is injected
    TestFramework.assertDefined(masterIndex._lockService, 'MasterIndex should have a LockService instance');
    TestFramework.assertTrue(masterIndex._lockService instanceof LockService, 'Default _lockService should be LockService');
  });

  suite.addTest('testMasterIndexConstructorWithInjectedLockService', function() {
    // Arrange
    const mockLockService = new LockService();
    // Act
    const masterIndex = new MasterIndex({}, mockLockService);
    // Assert injected LockService is used
    TestFramework.assertEquals(mockLockService, masterIndex._lockService, 'Injected LockService should be assigned');
  });

  suite.addTest('testMasterIndexUsesInjectedLockService', function() {
    // Arrange flags for script lock calls
    let acquireCalled = false;
    let releaseCalled = false;
    const mockLock = { releaseLock: () => { releaseCalled = true; } };
    const mockLockService = {
      acquireScriptLock: function(timeout) { acquireCalled = true; return mockLock; },
      releaseScriptLock: function(lock) { releaseCalled = true; }
    };
    const masterIndex = new MasterIndex({}, mockLockService);
    // Act: perform an operation that uses script lock
    masterIndex.addCollection('test', { fileId: 'id', documentCount: 0, modificationToken: 'tok' });
    // Assert: LockService methods were called
    TestFramework.assertTrue(acquireCalled, 'acquireScriptLock should be called');
    TestFramework.assertTrue(releaseCalled, 'releaseScriptLock should be called');
  });

  suite.addTest('testMasterIndexLockServiceMethodCalls', function() {
    // Arrange
    let acquireCalled = false;
    let releaseCalled = false;
    
    // Act & Assert - This should fail initially as LockService integration doesn't exist yet
    TestFramework.assertThrows(() => {
      const mockLockService = {
        acquireScriptLock: function(timeout) { 
          acquireCalled = true; 
          return {}; 
        },
        releaseScriptLock: function(lock) { 
          releaseCalled = true; 
        }
      };
      const masterIndex = new MasterIndex({}, mockLockService);
      
      // Try to perform operation that should use locks
      const testMetadata = {
        name: 'test',
        fileId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
        documentCount: 0,
        modificationToken: 'test-token'
      };
      masterIndex.addCollection('test', testMetadata);
    }, Error, 'LockService integration should not exist yet (TDD red phase)');
  });

  suite.addTest('testMasterIndexLockServiceTimeout', function() {
    // Arrange
    // Act & Assert - This should fail initially as LockService integration doesn't exist yet
    TestFramework.assertThrows(() => {
      const mockLockService = {
        acquireScriptLock: function(timeout) { 
          throw new ErrorHandler.ErrorTypes.LOCK_TIMEOUT('Test timeout', timeout);
        },
        releaseScriptLock: function() {}
      };
      const masterIndex = new MasterIndex({}, mockLockService);
      
      // Try operation that should trigger timeout
      const testMetadata = {
        name: 'test',
        fileId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
        documentCount: 0,
        modificationToken: 'test-token'
      };
      masterIndex.addCollection('test', testMetadata);
    }, Error, 'LockService integration should not exist yet (TDD red phase)');
  });

  suite.addTest('testMasterIndexLockServiceRelease', function() {
    // Arrange & Act & Assert - This should fail initially as LockService integration doesn't exist yet
    TestFramework.assertThrows(() => {
      const mockLockService = {
        acquireScriptLock: function() { return { id: 'test-lock' }; },
        releaseScriptLock: function(lock) { 
          TestFramework.assertEquals('test-lock', lock.id, 'Correct lock should be released');
        }
      };
      const masterIndex = new MasterIndex({}, mockLockService);
      
      // Check if LockService was actually injected - this should fail
      TestFramework.assertNotNull(masterIndex._lockService, 'MasterIndex should have injected LockService property');
      
      // This code should never execute in red phase
      const testMetadata = {
        name: 'test',
        fileId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
        documentCount: 0,
        modificationToken: 'test-token'
      };
      masterIndex.addCollection('test', testMetadata);
    }, Error, 'LockService integration should not exist yet (TDD red phase)');
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
