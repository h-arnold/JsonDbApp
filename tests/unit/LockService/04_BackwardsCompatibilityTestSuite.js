/**
 * Backwards Compatibility Test Suite
 * Tests to ensure MasterIndex API remains unchanged after LockService extraction
 */

/**
 * Creates test suite for backwards compatibility verification
 * @returns {TestSuite} The backwards compatibility test suite
 */
function createBackwardsCompatibilityTestSuite() {
  const suite = new TestSuite('Backwards Compatibility Tests');

  suite.addTest('testMasterIndexAPIUnchanged', function() {
    // Arrange
    const masterIndex = new MasterIndex();
    
    // Act & Assert - Verify all existing public methods still exist
    TestFramework.assertTrue(typeof masterIndex.addCollection === 'function', 'addCollection method should exist');
    TestFramework.assertTrue(typeof masterIndex.removeCollection === 'function', 'removeCollection method should exist');
    TestFramework.assertTrue(typeof masterIndex.getCollection === 'function', 'getCollection method should exist');
    TestFramework.assertTrue(typeof masterIndex.getCollections === 'function', 'getCollections method should exist');
    TestFramework.assertTrue(typeof masterIndex.updateCollectionMetadata === 'function', 'updateCollectionMetadata method should exist');
    TestFramework.assertTrue(typeof masterIndex.acquireLock === 'function', 'acquireLock method should exist');
    TestFramework.assertTrue(typeof masterIndex.releaseLock === 'function', 'releaseLock method should exist');
    TestFramework.assertTrue(typeof masterIndex.isLocked === 'function', 'isLocked method should exist');
    
    // Verify constructor signature hasn't changed (should accept config only by default)
    const masterIndex2 = new MasterIndex({});
    TestFramework.assertNotNull(masterIndex2, 'MasterIndex should construct with config parameter');
  });

  suite.addTest('testMasterIndexBehaviourPreserved', function() {
    // Arrange
    setupLockServiceTestEnvironment();
    const masterIndex = new MasterIndex();
    
    try {
      // Act - Test basic collection operations work identically
      const testMetadata = {
        name: 'test-collection',
        fileId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
        documentCount: 0,
        modificationToken: 'test-token-123'
      };
      masterIndex.addCollection('test-collection', testMetadata);
      
      // Assert - Verify behaviour is preserved
      const collections = masterIndex.getCollections();
      TestFramework.assertTrue(Object.keys(collections).includes('test-collection'), 'Collection should be added successfully');
      
      const collectionData = masterIndex.getCollection('test-collection');
      TestFramework.assertEquals('1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms', collectionData.fileId, 'Collection data should be preserved');
      
      // Test removal
      masterIndex.removeCollection('test-collection');
      const collectionsAfterRemoval = masterIndex.getCollections();
      TestFramework.assertFalse(Object.keys(collectionsAfterRemoval).includes('test-collection'), 'Collection should be removed');
      
    } finally {
      cleanupLockServiceTestEnvironment();
    }
  });

  suite.addTest('testExistingMasterIndexTestsStillPass', function() {
    // This test verifies that existing MasterIndex tests continue to pass
    // We'll run a subset of critical existing tests to ensure no regression
    
    // Arrange
    setupLockServiceTestEnvironment();
    
    try {
      const masterIndex = new MasterIndex();
      
      // Act & Assert - Test core functionality that existing tests rely on
      
      // Test 1: Basic collection addition and retrieval
      const testMetadata1 = {
        name: 'existing-test-1',
        fileId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
        documentCount: 0,
        modificationToken: 'test-token-1'
      };
      masterIndex.addCollection('existing-test-1', testMetadata1);
      const collections = masterIndex.getCollections();
      TestFramework.assertTrue(Object.keys(collections).includes('existing-test-1'), 'Existing test pattern should work');
      
      // Test 2: Collection overwrite handling (current behaviour)
      const duplicateMetadata = {
        name: 'existing-test-1',
        fileId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
        documentCount: 5, // Different count to verify overwrite
        modificationToken: 'test-token-2'
      };
      masterIndex.addCollection('existing-test-1', duplicateMetadata);
      
      // Verify the collection was overwritten (current behaviour)
      const updatedCollection = masterIndex.getCollection('existing-test-1');
      TestFramework.assertEquals(5, updatedCollection.documentCount, 'Collection should be overwritten as per current behaviour');
      
      // Test 3: Collection metadata operations
      const updateData = { documentCount: 10 };
      masterIndex.updateCollectionMetadata('existing-test-1', updateData);
      const retrieved = masterIndex.getCollection('existing-test-1');
      TestFramework.assertEquals(10, retrieved.documentCount, 'Metadata updates should work as before');
      
      // Test 4: Serialisation compatibility
      const serialised = ObjectUtils.serialise(masterIndex);
      TestFramework.assertTrue(typeof serialised === 'string', 'Serialisation should return string');
      TestFramework.assertTrue(serialised.includes('existing-test-1'), 'Serialised data should contain collection');
      
    } finally {
      cleanupLockServiceTestEnvironment();
    }
  });

  suite.addTest('testMasterIndexConfigurationCompatible', function() {
    // Arrange
    const customConfig = { lockTimeout: 10000, version: 2 };
    // Act: inject a mock LockService
    const mockLockService = { acquireScriptLock: () => {}, releaseScriptLock: () => {} };
    const masterIndexWithLockService = new MasterIndex(customConfig, mockLockService);
    // Assert: LockService is injectable and assigned correctly
    TestFramework.assertEquals(mockLockService, masterIndexWithLockService._lockService, 'LockService should be injectable');
  });

  return suite;
}
